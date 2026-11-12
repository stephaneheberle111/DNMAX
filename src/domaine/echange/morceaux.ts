// SPDX-License-Identifier: AGPL-3.0-or-later
import { sommeControle } from "./code-direct";

/**
 * Découpage du texte d'un paquet d'échange en messages pour le canal de
 * l'échange en direct, et réassemblage à l'arrivée.
 *
 * Un message de canal de données doit rester petit pour passer partout
 * (16 Kio est la taille sûre entre navigateurs) : le texte part donc en
 * morceaux, précédés d'un en-tête qui annonce la taille totale et la somme de
 * contrôle, et suivis d'une fin. Le canal est ordonné et fiable ; le
 * réassembleur vérifie quand même l'ordre, la taille et la somme, car tout
 * message reçu vient de l'extérieur.
 */

/**
 * Unités UTF-16 par morceau. Écrit en JSON puis en UTF-8, un morceau pèse au
 * plus 6 octets par unité (caractère de contrôle échappé), soit 12 Kio.
 */
export const TAILLE_MORCEAU = 2000;

/** Longueur maximale d'un message reçu, en unités UTF-16, en-tête JSON compris. */
const LONGUEUR_MAXIMALE_MESSAGE = 16 * 1024;

export interface EnTete {
  t: "debut";
  /** Longueur du texte, en unités UTF-16. */
  taille: number;
  morceaux: number;
  controle: string;
}

export interface Morceau {
  t: "morceau";
  /** Rang du morceau, à partir de 0. */
  n: number;
  d: string;
}

export interface Fin {
  t: "fin";
}

export type MessageEnvoi = EnTete | Morceau | Fin;

/** Découpe sans séparer les deux moitiés d'un caractère hors du plan de base (émoji…). */
function decouper(texte: string, taille: number): string[] {
  const morceaux: string[] = [];
  let debut = 0;
  while (debut < texte.length) {
    let fin = Math.min(debut + taille, texte.length);
    const code = texte.charCodeAt(fin - 1);
    if (fin < texte.length && code >= 0xd800 && code <= 0xdbff) {
      fin -= 1;
    }
    morceaux.push(texte.slice(debut, fin));
    debut = fin;
  }
  return morceaux;
}

/** Rend, dans l'ordre d'envoi, les messages qui transportent `texte`. */
export function preparerMessages(texte: string): string[] {
  const morceaux = decouper(texte, TAILLE_MORCEAU);
  const enTete: EnTete = { t: "debut", taille: texte.length, morceaux: morceaux.length, controle: sommeControle(texte) };
  return [
    JSON.stringify(enTete),
    ...morceaux.map((donnees, rang) => JSON.stringify({ t: "morceau", n: rang, d: donnees } satisfies Morceau)),
    JSON.stringify({ t: "fin" } satisfies Fin),
  ];
}

export type ErreurReassemblage =
  /** Message qui n'a pas la forme attendue, ou arrivé hors de son tour. */
  | "message-invalide"
  /** Le texte annoncé dépasse la taille admise. */
  | "trop-volumineux"
  /** Le texte reçu ne correspond pas à ce qui avait été annoncé. */
  | "incomplet";

export type EtatReassemblage =
  | { etat: "en-cours"; recus: number; total: number }
  | { etat: "complet"; texte: string }
  | { etat: "erreur"; erreur: ErreurReassemblage };

function estEntier(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isSafeInteger(valeur) && valeur >= 0;
}

function lireMessage(brut: unknown): MessageEnvoi | null {
  if (typeof brut !== "string" || brut.length > LONGUEUR_MAXIMALE_MESSAGE) {
    return null;
  }
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut);
  } catch {
    return null;
  }
  if (typeof valeur !== "object" || valeur === null) {
    return null;
  }
  const message = valeur as Record<string, unknown>;
  if (
    message.t === "debut" &&
    estEntier(message.taille) &&
    estEntier(message.morceaux) &&
    typeof message.controle === "string"
  ) {
    return { t: "debut", taille: message.taille, morceaux: message.morceaux, controle: message.controle };
  }
  if (message.t === "morceau" && estEntier(message.n) && typeof message.d === "string" && message.d.length <= TAILLE_MORCEAU) {
    return { t: "morceau", n: message.n, d: message.d };
  }
  if (message.t === "fin") {
    return { t: "fin" };
  }
  return null;
}

/**
 * Recompose un texte à partir des messages reçus, un par un.
 * Après une erreur ou un texte complet, tout nouveau message est refusé.
 */
export class Reassembleur {
  private enTete: EnTete | null = null;
  private readonly morceaux: string[] = [];
  private longueurRecue = 0;
  private termine = false;

  /** @param tailleMaximale longueur maximale admise du texte, en unités UTF-16. */
  constructor(private readonly tailleMaximale: number) {}

  recevoir(brut: unknown): EtatReassemblage {
    const etat = this.traiter(brut);
    if (etat.etat !== "en-cours") {
      this.termine = true;
      this.morceaux.length = 0;
    }
    return etat;
  }

  private traiter(brut: unknown): EtatReassemblage {
    const message = this.termine ? null : lireMessage(brut);
    if (message === null) {
      return { etat: "erreur", erreur: "message-invalide" };
    }
    if (message.t === "debut") {
      if (this.enTete !== null) {
        return { etat: "erreur", erreur: "message-invalide" };
      }
      if (message.taille > this.tailleMaximale) {
        return { etat: "erreur", erreur: "trop-volumineux" };
      }
      // Un découpage qui recule devant un caractère double peut ajouter des morceaux, jamais en retirer.
      const minimum = Math.ceil(message.taille / TAILLE_MORCEAU);
      if (message.morceaux < minimum || message.morceaux > Math.max(message.taille, minimum)) {
        return { etat: "erreur", erreur: "message-invalide" };
      }
      this.enTete = message;
      return { etat: "en-cours", recus: 0, total: message.morceaux };
    }
    if (this.enTete === null) {
      return { etat: "erreur", erreur: "message-invalide" };
    }
    if (message.t === "morceau") {
      if (message.n !== this.morceaux.length || message.n >= this.enTete.morceaux) {
        return { etat: "erreur", erreur: "message-invalide" };
      }
      this.longueurRecue += message.d.length;
      if (this.longueurRecue > this.enTete.taille) {
        return { etat: "erreur", erreur: "incomplet" };
      }
      this.morceaux.push(message.d);
      return { etat: "en-cours", recus: this.morceaux.length, total: this.enTete.morceaux };
    }
    const texte = this.morceaux.join("");
    if (
      this.morceaux.length !== this.enTete.morceaux ||
      texte.length !== this.enTete.taille ||
      sommeControle(texte) !== this.enTete.controle
    ) {
      return { etat: "erreur", erreur: "incomplet" };
    }
    return { etat: "complet", texte };
  }
}
