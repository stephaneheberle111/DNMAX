// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  decoderCode,
  encoderCode,
  garderServeursStun,
  type ContenuCode,
  type ErreurCode,
} from "./domaine/echange/code-direct";
import { Reassembleur, preparerMessages, type ErreurReassemblage } from "./domaine/echange/morceaux";

/**
 * Transport de l'échange en direct : une connexion WebRTC d'ordinateur à
 * ordinateur, dont l'offre et la réponse passent par des codes texte que les
 * enseignants se transmettent eux-mêmes. Aucun serveur relais : si la
 * connexion directe est impossible, l'échange échoue.
 *
 * Ce module parle à l'extérieur (réseau, horloge) ; les règles qu'il applique
 * (forme des codes, découpage) sont dans `domaine/echange/`.
 */

export interface DelaisDirect {
  rassemblement: number;
  attenteCorrespondant: number;
  connexion: number;
  inactivite: number;
}

export interface ParametresDirect {
  serveursStun: readonly string[];
  delais: DelaisDirect;
  /** Longueur maximale admise du texte reçu, en unités UTF-16. */
  tailleMaximale: number;
}

export type CodeErreurDirect =
  /** Le navigateur intégré ne connaît pas WebRTC. */
  | "indisponible"
  /** Le code collé est refusé ; le détail dit pourquoi. */
  | "code-invalide"
  /** La réponse collée ne correspond pas à cette invitation. */
  | "autre-seance"
  /** L'autre enseignant ne s'est pas manifesté à temps. */
  | "delai-depasse"
  /** Pas de chemin direct entre les deux ordinateurs (pare-feu, réseau d'entreprise…). */
  | "connexion-impossible"
  /** La connexion s'est rompue ou s'est tue pendant le transfert. */
  | "transfert-interrompu"
  /** Ce qui est arrivé n'a pas la forme attendue, ou est trop volumineux. */
  | "contenu-refuse"
  /** L'enseignant a annulé. */
  | "annule";

export class ErreurDirect extends Error {
  readonly code: CodeErreurDirect;
  readonly detail: ErreurCode | ErreurReassemblage | null;

  constructor(code: CodeErreurDirect, detail: ErreurCode | ErreurReassemblage | null = null) {
    super(`échange en direct : ${code}${detail === null ? "" : ` (${detail})`}`);
    this.code = code;
    this.detail = detail;
  }
}

/** Avancement d'un transfert, en morceaux. */
export interface Progression {
  faits: number;
  total: number;
}

/** Message d'accusé de réception envoyé par le destinataire en fin de transfert. */
const ACCUSE_RECEPTION = JSON.stringify({ t: "recu" });
const REFUS = JSON.stringify({ t: "refus" });

/** Au-delà de ce volume en attente dans le canal, l'envoi attend qu'il se vide. */
const TAMPON_MAXIMAL = 1024 * 1024;
const TAMPON_BAS = 64 * 1024;

/** Indique si le navigateur intégré permet l'échange en direct. */
export function echangeDirectDisponible(): boolean {
  return typeof globalThis.RTCPeerConnection === "function";
}

function creerConnexion(parametres: ParametresDirect): RTCPeerConnection {
  if (!echangeDirectDisponible()) {
    throw new ErreurDirect("indisponible");
  }
  return new RTCPeerConnection({
    iceServers: garderServeursStun(parametres.serveursStun).map((adresse) => ({ urls: adresse })),
    // Sans serveur relais déclaré, « all » se limite aux chemins directs (locaux ou par adresse publique).
    iceTransportPolicy: "all",
  });
}

/**
 * Attend un évènement, ou rejette à l'expiration du délai ou à l'annulation.
 * `verifier` est rappelé à chaque évènement de `cible` listé dans `evenements`
 * et rend `true` (fini), une erreur (échec) ou `false` (attendre encore).
 */
function attendre(
  cible: EventTarget,
  evenements: readonly string[],
  verifier: () => boolean | ErreurDirect,
  delai: number,
  erreurDelai: ErreurDirect,
  annulation: AbortSignal,
): Promise<void> {
  return new Promise((resoudre, rejeter) => {
    const terminer = (erreur: ErreurDirect | null): void => {
      clearTimeout(minuterie);
      for (const evenement of evenements) {
        cible.removeEventListener(evenement, surEvenement);
      }
      annulation.removeEventListener("abort", surAnnulation);
      if (erreur === null) {
        resoudre();
      } else {
        rejeter(erreur);
      }
    };
    const surEvenement = (): void => {
      const resultat = verifier();
      if (resultat instanceof ErreurDirect) {
        terminer(resultat);
      } else if (resultat) {
        terminer(null);
      }
    };
    const surAnnulation = (): void => {
      terminer(new ErreurDirect("annule"));
    };
    const minuterie = setTimeout(() => {
      terminer(erreurDelai);
    }, delai);
    for (const evenement of evenements) {
      cible.addEventListener(evenement, surEvenement);
    }
    annulation.addEventListener("abort", surAnnulation);
    if (annulation.aborted) {
      surAnnulation();
    } else {
      surEvenement();
    }
  });
}

/**
 * Pose la description locale et attend que les candidats de connexion soient
 * rassemblés, pour qu'ils partent dans le code (pas d'échange au fil de l'eau
 * sans serveur de signalisation). Au-delà du délai, le code part avec ce qui a
 * été trouvé : un serveur STUN injoignable ne bloque pas l'échange local.
 */
async function decrireAvecCandidats(
  connexion: RTCPeerConnection,
  description: RTCSessionDescriptionInit,
  delai: number,
  annulation: AbortSignal,
): Promise<string> {
  await connexion.setLocalDescription(description);
  try {
    await attendre(
      connexion,
      ["icegatheringstatechange"],
      () => connexion.iceGatheringState === "complete",
      delai,
      new ErreurDirect("delai-depasse"),
      annulation,
    );
  } catch (erreur: unknown) {
    if (!(erreur instanceof ErreurDirect) || erreur.code !== "delai-depasse") {
      throw erreur;
    }
  }
  const sdp = connexion.localDescription?.sdp ?? "";
  if (sdp === "") {
    throw new ErreurDirect("connexion-impossible");
  }
  return sdp;
}

/** Échec définitif de la connexion, à guetter une fois les deux descriptions posées. */
function connexionEchouee(connexion: RTCPeerConnection): boolean {
  return connexion.connectionState === "failed" || connexion.connectionState === "closed";
}

/** Attend que le canal soit ouvert ; `echecFatal` fait échouer dès que la connexion est perdue. */
function attendreOuverture(
  connexion: RTCPeerConnection,
  canal: RTCDataChannel,
  delai: number,
  erreurDelai: ErreurDirect,
  echecFatal: boolean,
  annulation: AbortSignal,
): Promise<void> {
  const cible = new EventTarget();
  const relayer = (): void => {
    cible.dispatchEvent(new Event("changement"));
  };
  canal.addEventListener("open", relayer);
  connexion.addEventListener("connectionstatechange", relayer);
  return attendre(
    cible,
    ["changement"],
    () => {
      if (canal.readyState === "open") {
        return true;
      }
      if (echecFatal && connexionEchouee(connexion)) {
        return new ErreurDirect("connexion-impossible");
      }
      return false;
    },
    delai,
    erreurDelai,
    annulation,
  ).finally(() => {
    canal.removeEventListener("open", relayer);
    connexion.removeEventListener("connectionstatechange", relayer);
  });
}

function lireCode(texte: string, role: ContenuCode["role"]): ContenuCode {
  const contenu = decoderCode(texte, role);
  if (typeof contenu === "string") {
    throw new ErreurDirect("code-invalide", contenu);
  }
  return contenu;
}

/** Ce que l'expéditeur prépare avant que le destinataire ne se manifeste. */
export class Expediteur {
  private readonly annulation = new AbortController();

  private constructor(
    private readonly connexion: RTCPeerConnection,
    private readonly canal: RTCDataChannel,
    private readonly seance: string,
    private readonly parametres: ParametresDirect,
    /** Code à transmettre au destinataire. */
    readonly codeInvitation: string,
  ) {}

  /** Ouvre une connexion et écrit le code d'invitation. */
  static async preparer(parametres: ParametresDirect): Promise<Expediteur> {
    const connexion = creerConnexion(parametres);
    try {
      const canal = connexion.createDataChannel("dnmax-echange", { ordered: true });
      const seance = crypto.randomUUID();
      const offre = await connexion.createOffer();
      const description = await decrireAvecCandidats(
        connexion,
        offre,
        parametres.delais.rassemblement,
        new AbortController().signal,
      );
      const code = encoderCode({ role: "invitation", seance, description });
      return new Expediteur(connexion, canal, seance, parametres, code);
    } catch (erreur: unknown) {
      connexion.close();
      throw erreur;
    }
  }

  /**
   * Lit la réponse du destinataire, établit la connexion et envoie `texte`.
   * Se termine quand le destinataire a confirmé la réception complète.
   */
  async envoyer(codeReponse: string, texte: string, suivi: (progression: Progression) => void): Promise<void> {
    const reponse = lireCode(codeReponse, "reponse");
    if (reponse.seance !== this.seance) {
      throw new ErreurDirect("autre-seance");
    }
    const signal = this.annulation.signal;
    const { delais } = this.parametres;
    try {
      await this.connexion.setRemoteDescription({ type: "answer", sdp: reponse.description });
    } catch {
      throw new ErreurDirect("code-invalide", "illisible");
    }
    await attendreOuverture(this.connexion, this.canal, delais.connexion, new ErreurDirect("connexion-impossible"), true, signal);

    let accuse: "recu" | "refus" | null = null;
    const surMessage = (evenement: MessageEvent): void => {
      if (evenement.data === ACCUSE_RECEPTION) {
        accuse = "recu";
      } else if (evenement.data === REFUS) {
        accuse = "refus";
      }
    };
    this.canal.addEventListener("message", surMessage);
    this.canal.bufferedAmountLowThreshold = TAMPON_BAS;
    const messages = preparerMessages(texte);
    // L'en-tête et la fin ne comptent pas comme des morceaux.
    const total = messages.length - 2;
    for (const [rang, message] of messages.entries()) {
      if (this.canal.bufferedAmount > TAMPON_MAXIMAL) {
        await attendre(
          this.canal,
          ["bufferedamountlow", "close"],
          () => (this.canal.readyState !== "open" ? new ErreurDirect("transfert-interrompu") : this.canal.bufferedAmount <= TAMPON_BAS),
          delais.inactivite,
          new ErreurDirect("transfert-interrompu"),
          signal,
        );
      }
      if (this.canal.readyState !== "open") {
        throw new ErreurDirect("transfert-interrompu");
      }
      this.canal.send(message);
      suivi({ faits: Math.min(Math.max(rang, 0), total), total });
    }
    await attendre(
      this.canal,
      ["message", "close"],
      () => {
        if (accuse === "recu") {
          return true;
        }
        if (accuse === "refus") {
          return new ErreurDirect("contenu-refuse");
        }
        return this.canal.readyState !== "open" ? new ErreurDirect("transfert-interrompu") : false;
      },
      delais.inactivite,
      new ErreurDirect("transfert-interrompu"),
      signal,
    ).finally(() => {
      this.canal.removeEventListener("message", surMessage);
    });
  }

  /** Ferme la connexion ; une attente en cours se termine par « annule ». */
  fermer(): void {
    this.annulation.abort();
    this.canal.close();
    this.connexion.close();
  }
}

/** Ce que le destinataire ouvre à partir du code d'invitation. */
export class Destinataire {
  private readonly annulation = new AbortController();
  private canal: RTCDataChannel | null = null;
  private readonly canalArrive = new EventTarget();

  private constructor(
    private readonly connexion: RTCPeerConnection,
    private readonly parametres: ParametresDirect,
  ) {
    connexion.addEventListener("datachannel", (evenement: RTCDataChannelEvent) => {
      // Seul le premier canal compte : un pair n'en ouvre qu'un.
      if (this.canal === null) {
        this.canal = evenement.channel;
        this.canalArrive.dispatchEvent(new Event("arrive"));
      }
    });
  }

  /** Code à renvoyer à l'expéditeur. */
  codeReponse = "";

  /** Lit le code d'invitation et écrit le code de réponse. */
  static async rejoindre(codeInvitation: string, parametres: ParametresDirect): Promise<Destinataire> {
    const invitation = lireCode(codeInvitation, "invitation");
    const connexion = creerConnexion(parametres);
    const destinataire = new Destinataire(connexion, parametres);
    try {
      try {
        await connexion.setRemoteDescription({ type: "offer", sdp: invitation.description });
      } catch {
        throw new ErreurDirect("code-invalide", "illisible");
      }
      const reponse = await connexion.createAnswer();
      const description = await decrireAvecCandidats(
        connexion,
        reponse,
        parametres.delais.rassemblement,
        destinataire.annulation.signal,
      );
      destinataire.codeReponse = encoderCode({ role: "reponse", seance: invitation.seance, description });
      return destinataire;
    } catch (erreur: unknown) {
      connexion.close();
      throw erreur;
    }
  }

  /**
   * Attend la connexion de l'expéditeur puis le texte complet, vérifié.
   * L'expéditeur reçoit un accusé de réception, ou un refus si le texte est rejeté.
   */
  async recevoir(suivi: (progression: Progression) => void): Promise<string> {
    const signal = this.annulation.signal;
    const { delais } = this.parametres;
    // L'expéditeur doit encore coller la réponse : tant qu'il ne l'a pas fait, la
    // connexion peut sembler échouer, sans que ce soit définitif.
    await attendre(
      this.canalArrive,
      ["arrive"],
      () => this.canal !== null,
      delais.attenteCorrespondant,
      new ErreurDirect("delai-depasse"),
      signal,
    );
    const canal = this.canal;
    if (canal === null) {
      throw new ErreurDirect("connexion-impossible");
    }
    await attendreOuverture(this.connexion, canal, delais.connexion, new ErreurDirect("connexion-impossible"), true, signal);

    const reassembleur = new Reassembleur(this.parametres.tailleMaximale);
    return await new Promise<string>((resoudre, rejeter) => {
      let minuterie = setTimeout(() => {
        terminer(new ErreurDirect("transfert-interrompu"));
      }, delais.inactivite);
      const terminer = (resultat: string | ErreurDirect): void => {
        clearTimeout(minuterie);
        canal.removeEventListener("message", surMessage);
        canal.removeEventListener("close", surFermeture);
        signal.removeEventListener("abort", surAnnulation);
        if (resultat instanceof ErreurDirect) {
          rejeter(resultat);
        } else {
          resoudre(resultat);
        }
      };
      const surMessage = (evenement: MessageEvent): void => {
        clearTimeout(minuterie);
        minuterie = setTimeout(() => {
          terminer(new ErreurDirect("transfert-interrompu"));
        }, delais.inactivite);
        const etat = reassembleur.recevoir(evenement.data);
        if (etat.etat === "en-cours") {
          suivi({ faits: etat.recus, total: etat.total });
        } else if (etat.etat === "complet") {
          canal.send(ACCUSE_RECEPTION);
          terminer(etat.texte);
        } else {
          canal.send(REFUS);
          terminer(new ErreurDirect("contenu-refuse", etat.erreur));
        }
      };
      const surFermeture = (): void => {
        terminer(new ErreurDirect("transfert-interrompu"));
      };
      const surAnnulation = (): void => {
        terminer(new ErreurDirect("annule"));
      };
      canal.addEventListener("message", surMessage);
      canal.addEventListener("close", surFermeture);
      signal.addEventListener("abort", surAnnulation);
    });
  }

  /**
   * Ferme la connexion ; une attente en cours se termine par « annule ».
   * Laisse d'abord partir l'accusé de réception éventuellement en attente.
   */
  fermer(): void {
    this.annulation.abort();
    const canal = this.canal;
    if (canal !== null && canal.readyState === "open" && canal.bufferedAmount > 0) {
      canal.bufferedAmountLowThreshold = 0;
      const fermerTout = (): void => {
        canal.close();
        this.connexion.close();
      };
      canal.addEventListener("bufferedamountlow", fermerTout, { once: true });
      setTimeout(fermerTout, 2000);
      return;
    }
    canal?.close();
    this.connexion.close();
  }
}
