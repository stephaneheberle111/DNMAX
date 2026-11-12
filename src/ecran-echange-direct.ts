// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Destinataire,
  ErreurDirect,
  Expediteur,
  echangeDirectDisponible,
  type CodeErreurDirect,
  type ParametresDirect,
  type Progression,
} from "./canal-direct";
import { DELAIS_ECHANGE_DIRECT, TAILLE_MAXIMALE_ECHANGE_DIRECT } from "./configuration";
import type { ErreurCode } from "./domaine/echange/code-direct";
import { messagePourErreur } from "./ecran-coffre";
import {
  afficherMessage,
  creer,
  creerBouton,
  montrerExport,
  ouvrirBoite,
  ouvrirTexteRecu,
  type AccesDonnees,
} from "./ecran-echange";

/**
 * Écrans de l'échange en direct (bêta) : l'expéditeur montre un code
 * d'invitation, le destinataire le colle et renvoie un code de réponse, puis
 * le contenu passe d'un ordinateur à l'autre. Le contenu est le même texte
 * qu'un fichier d'échange, et la réception suit le même circuit.
 */

const PARAMETRES: ParametresDirect = {
  delais: DELAIS_ECHANGE_DIRECT,
  tailleMaximale: TAILLE_MAXIMALE_ECHANGE_DIRECT,
};

const RECOURS_FICHIER = "L'échange par fichier reste disponible : « Échanger… » → « Envoyer » ou « Recevoir ».";

const MESSAGES_CODE: Record<ErreurCode, string> = {
  vide: "Collez d'abord le code reçu.",
  "prefixe-inconnu": "Ce texte n'est pas un code d'échange en direct DNMAX.",
  "version-inconnue": "Ce code vient d'une autre version de DNMAX. Utilisez tous deux la même version, ou passez par un fichier.",
  incomplet: "Ce code est incomplet ou a été modifié en route. Recopiez-le en entier, sans rien y ajouter.",
  illisible: "Ce code ne peut pas être lu. Demandez-en un nouveau.",
  "mauvais-role": "Ce code n'est pas celui attendu à cette étape : vérifiez que vous ne collez pas votre propre code.",
};

const MESSAGES_DIRECT: Record<Exclude<CodeErreurDirect, "code-invalide">, string> = {
  indisponible: "L'échange en direct n'est pas possible sur cet ordinateur : son afficheur web ne le permet pas.",
  "autre-seance": "Ce code de réponse correspond à une autre invitation. Demandez la réponse à l'invitation affichée ici.",
  "delai-depasse": "Votre collègue ne s'est pas manifesté à temps. Recommencez l'échange quand vous êtes prêts tous les deux.",
  "connexion-impossible":
    "Vos deux ordinateurs n'ont pas réussi à se connecter. Vérifiez qu'ils sont bien sur le même réseau " +
    "(même wifi ou même réseau local) : l'échange en direct ne fonctionne pas d'un réseau à un autre. " +
    "Certains réseaux d'établissement isolent les postes les uns des autres ; l'échange en direct y est alors impossible. " +
    "Rien n'est passé par un intermédiaire.",
  "transfert-interrompu": "La connexion s'est interrompue pendant le transfert. Rien n'a été modifié chez le destinataire.",
  "contenu-refuse": "Le contenu reçu n'est pas complet ou n'a pas la forme attendue : il a été refusé, rien n'a été modifié.",
  annule: "Échange annulé.",
};

/** Message à montrer à l'enseignant pour une erreur de l'échange en direct, ou de chiffrement. */
export function messagePourErreurDirect(erreur: unknown): string {
  if (!(erreur instanceof ErreurDirect)) {
    return messagePourErreur(erreur);
  }
  if (erreur.code === "code-invalide") {
    return MESSAGES_CODE[erreur.detail !== null && erreur.detail in MESSAGES_CODE ? (erreur.detail as ErreurCode) : "illisible"];
  }
  const message = MESSAGES_DIRECT[erreur.code];
  return erreur.code === "connexion-impossible" || erreur.code === "transfert-interrompu" || erreur.code === "delai-depasse"
    ? `${message} ${RECOURS_FICHIER}`
    : message;
}

/** Une erreur sur le code collé se corrige en recollant ; les autres mettent fin à l'échange. */
function erreurRattrapable(erreur: unknown): boolean {
  return erreur instanceof ErreurDirect && (erreur.code === "code-invalide" || erreur.code === "autre-seance");
}

/** Zone de texte d'un code, en lecture seule, avec un bouton qui le copie. */
function creerCodeACopier(code: string): HTMLElement {
  const zone = creer("div", "echange-code");
  const texte = creer("textarea");
  texte.readOnly = true;
  texte.value = code;
  texte.rows = 4;
  texte.setAttribute("aria-label", "Code à transmettre");
  texte.addEventListener("focus", () => {
    texte.select();
  });
  const copier = creerBouton("Copier le code", "btn", () => {
    texte.select();
    const signaler = (): void => {
      copier.textContent = "Copié";
    };
    navigator.clipboard.writeText(code).then(signaler, () => {
      // Repli pour un afficheur web sans accès au presse-papiers : le texte est sélectionné, Ctrl+C suffit.
      copier.textContent = "Sélectionné : Ctrl+C pour copier";
    });
  });
  zone.append(texte, copier);
  return zone;
}

function creerZoneCollage(etiquette: string): HTMLTextAreaElement {
  const zone = creer("textarea", "echange-collage");
  zone.rows = 4;
  zone.placeholder = etiquette;
  zone.setAttribute("aria-label", etiquette);
  zone.spellcheck = false;
  return zone;
}

function decrireProgression(verbe: string, progression: Progression): string {
  if (progression.total === 0) {
    return `${verbe}…`;
  }
  const pourcentage = Math.floor((progression.faits * 100) / progression.total);
  return `${verbe} : ${String(pourcentage)} %`;
}

/** Marque « Bêta » accolée au nom de l'échange en direct. */
export function creerMarqueBeta(): HTMLElement {
  const marque = creer("span", "echange-beta", "Bêta");
  marque.title = "Fonction en cours d'essai";
  return marque;
}

/** Texte d'introduction commun aux deux sens. */
function presenter(boite: HTMLElement): void {
  boite.append(
    creer(
      "p",
      "",
      "En direct d'ordinateur à ordinateur, sans aucun serveur. Les deux ordinateurs doivent être sur le même réseau " +
        "(même wifi ou même réseau local). Certains réseaux d'établissement isolent les postes : la connexion échoue alors, " +
        "et l'échange par fichier reste disponible.",
    ),
  );
}

/**
 * Montre le parcours de l'expéditeur pour un texte déjà prêt (même texte qu'un
 * fichier d'échange, chiffré si `protege`).
 */
export function montrerEnvoiDirect(texte: string, protege: boolean): void {
  let expediteur: Expediteur | null = null;
  let termine = false;
  const { boite, fermer } = ouvrirBoite("Envoyer en direct (bêta)", () => {
    termine = true;
    expediteur?.fermer();
  });
  const etat = creer("p", "echange-etat", "Préparation du code d'invitation…");
  etat.setAttribute("role", "status");
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const etapes = creer("div", "echange-etapes");
  const actions = creer("div", "echange-actions");
  const boutonAnnuler = creerBouton("Annuler", "btn ghost", fermer);
  actions.append(boutonAnnuler);
  boite.append(etat, etapes, erreur, actions);

  const echouer = (raison: unknown): void => {
    if (termine) {
      return;
    }
    expediteur?.fermer();
    etat.textContent = "L'échange en direct a échoué.";
    erreur.textContent = messagePourErreurDirect(raison);
    erreur.hidden = false;
    etapes.replaceChildren();
    boutonAnnuler.textContent = "Fermer";
    actions.replaceChildren(boutonAnnuler);
  };

  Expediteur.preparer(PARAMETRES)
    .then((pret) => {
      if (termine) {
        pret.fermer();
        return;
      }
      expediteur = pret;
      // Personne n'a collé de réponse à temps : la connexion préparée est abandonnée.
      const expiration = setTimeout(() => {
        echouer(new ErreurDirect("delai-depasse"));
      }, PARAMETRES.delais.attenteCorrespondant);
      etat.textContent = "1. Transmettez ce code d'invitation à votre collègue (messagerie, copier-coller).";
      const consigne = creer(
        "p",
        "",
        "Il le colle dans « Échanger… » → « Échange en direct » → « Recevoir en direct », puis vous renvoie un code de réponse.",
      );
      const motDePasse = creer(
        "p",
        "echange-detail alerte",
        "Le contenu comprend des élèves : il part chiffré. Communiquez le mot de passe par un autre moyen que ce code.",
      );
      motDePasse.hidden = !protege;
      const reponse = creerZoneCollage("2. Collez ici le code de réponse de votre collègue");
      const boutonEnvoyer = creerBouton("Se connecter et envoyer", "btn primary", () => {
        boutonEnvoyer.disabled = true;
        reponse.readOnly = true;
        erreur.hidden = true;
        etat.textContent = "Connexion à l'ordinateur de votre collègue…";
        pret
          .envoyer(reponse.value, texte, (progression) => {
            etat.textContent = decrireProgression("Envoi", progression);
          })
          .then(() => {
            clearTimeout(expiration);
            pret.fermer();
            etapes.replaceChildren();
            etat.textContent =
              "Envoyé. Votre collègue voit maintenant ce que l'envoi changerait chez lui, et choisit ce qu'il garde.";
            boutonAnnuler.textContent = "Fermer";
            actions.replaceChildren(boutonAnnuler);
          })
          .catch((raison: unknown) => {
            if (erreurRattrapable(raison)) {
              etat.textContent = "Le code de réponse n'a pas été accepté.";
              erreur.textContent = messagePourErreurDirect(raison);
              erreur.hidden = false;
              boutonEnvoyer.disabled = false;
              reponse.readOnly = false;
              return;
            }
            clearTimeout(expiration);
            echouer(raison);
          });
      });
      etapes.append(creerCodeACopier(pret.codeInvitation), consigne, motDePasse, reponse);
      actions.append(boutonEnvoyer);
    })
    .catch(echouer);
}

/**
 * Montre le parcours du destinataire. Le texte reçu est passé à `traiterTexte`
 * (le circuit de réception des fichiers) une fois la boîte refermée.
 */
export function montrerReceptionDirecte(traiterTexte: (texte: string) => Promise<void>): void {
  let destinataire: Destinataire | null = null;
  let termine = false;
  const { boite, fermer } = ouvrirBoite("Recevoir en direct (bêta)", () => {
    termine = true;
    destinataire?.fermer();
  });
  const etat = creer("p", "echange-etat", "1. Collez le code d'invitation que votre collègue vous a transmis.");
  etat.setAttribute("role", "status");
  const invitation = creerZoneCollage("Code d'invitation");
  const etapes = creer("div", "echange-etapes");
  etapes.append(invitation);
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const actions = creer("div", "echange-actions");
  const boutonAnnuler = creerBouton("Annuler", "btn ghost", fermer);

  const echouer = (raison: unknown): void => {
    if (termine) {
      return;
    }
    destinataire?.fermer();
    etat.textContent = "L'échange en direct a échoué.";
    erreur.textContent = messagePourErreurDirect(raison);
    erreur.hidden = false;
    etapes.replaceChildren();
    actions.replaceChildren(boutonAnnuler);
    boutonAnnuler.textContent = "Fermer";
  };

  const boutonValider = creerBouton("Valider le code", "btn primary", () => {
    boutonValider.disabled = true;
    invitation.readOnly = true;
    erreur.hidden = true;
    etat.textContent = "Préparation du code de réponse…";
    Destinataire.rejoindre(invitation.value, PARAMETRES)
      .then((pret) => {
        if (termine) {
          pret.fermer();
          return;
        }
        destinataire = pret;
        boutonValider.remove();
        etat.textContent =
          "2. Renvoyez ce code de réponse à votre collègue. Gardez cette fenêtre ouverte : la réception commence dès qu'il l'a collé.";
        etapes.replaceChildren(creerCodeACopier(pret.codeReponse), creer("p", "echange-detail", "En attente de votre collègue…"));
        return pret
          .recevoir((progression) => {
            etat.textContent = decrireProgression("Réception", progression);
          })
          .then((texte) => {
            if (termine) {
              return;
            }
            fermer();
            traiterTexte(texte).catch((raison: unknown) => {
              afficherMessage("Recevoir en direct", messagePourErreur(raison));
            });
          });
      })
      .catch((raison: unknown) => {
        if (erreurRattrapable(raison) && destinataire === null) {
          etat.textContent = "1. Collez le code d'invitation que votre collègue vous a transmis.";
          erreur.textContent = messagePourErreurDirect(raison);
          erreur.hidden = false;
          boutonValider.disabled = false;
          invitation.readOnly = false;
          return;
        }
        echouer(raison);
      });
  });
  actions.append(boutonAnnuler, boutonValider);
  boite.append(etat, etapes, erreur, actions);
  invitation.focus();
}

/** Boîte d'entrée de l'échange en direct : présentation, puis envoyer ou recevoir. */
export function montrerChoixDirect(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Échange en direct");
  const titre = boite.querySelector("h2");
  titre?.append(" ", creerMarqueBeta());
  presenter(boite);
  const disponible = echangeDirectDisponible();
  if (!disponible) {
    boite.append(creer("p", "echange-erreur", `${MESSAGES_DIRECT.indisponible} ${RECOURS_FICHIER}`));
  }
  const choix = creer("div", "echange-choix");
  const envoyer = creerBouton("", "", () => {
    fermer();
    const entrees = acces.lireEntrees();
    acces
      .dresserCatalogue(entrees)
      .then((catalogue) => {
        montrerExport(acces, entrees, catalogue, "direct");
      })
      .catch((raison: unknown) => {
        afficherMessage("Envoyer en direct", messagePourErreur(raison));
      });
  });
  envoyer.append(
    creer("b", "", "Envoyer en direct"),
    creer("span", "", "Choisir ce que vous envoyez, comme pour un fichier, puis transmettre un code d'invitation."),
  );
  const recevoir = creerBouton("", "", () => {
    fermer();
    montrerReceptionDirecte((texte) => ouvrirTexteRecu(acces, texte));
  });
  recevoir.append(
    creer("b", "", "Recevoir en direct"),
    creer("span", "", "Coller le code d'invitation d'un collègue, lui renvoyer un code de réponse, puis choisir ce que vous gardez."),
  );
  envoyer.disabled = !disponible;
  recevoir.disabled = !disponible;
  choix.append(envoyer, recevoir);
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(choix, actions);
}
