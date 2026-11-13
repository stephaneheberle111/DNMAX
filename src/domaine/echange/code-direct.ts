// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Code de l'échange en direct : 8 chiffres, que l'expéditeur dicte à son
 * collègue (« 4821 7395 »). L'enveloppe le tire au hasard et s'en sert comme
 * mot de passe de l'échange (voir DECISIONS.md, décision 21) ; ici, on ne fait
 * que lire ce que l'enseignant saisit et l'écrire lisiblement.
 */

export const LONGUEUR_CODE_DIRECT = 8;

/** Taille des groupes de chiffres à l'affichage, pour le dicter sans se perdre. */
const TAILLE_GROUPE = 4;

/** Ignorés à la saisie : séparateurs qu'on tape ou colle naturellement. */
const SEPARATEURS = /[\s.\-–—]/gu;

export type ErreurSaisieCode =
  /** Rien n'a été saisi. */
  | "vide"
  /** Un caractère autre qu'un chiffre ou un séparateur. */
  | "caractere-interdit"
  /** Moins de 8 chiffres. */
  | "trop-court"
  /** Plus de 8 chiffres. */
  | "trop-long";

export type SaisieCode = { code: string } | { erreur: ErreurSaisieCode };

/**
 * Lit un code saisi et rend ses 8 chiffres, sans séparateur.
 * Espaces (insécables compris), points et tirets sont ignorés.
 */
export function lireSaisieCode(saisie: string): SaisieCode {
  const chiffres = saisie.replace(SEPARATEURS, "");
  if (chiffres === "") {
    return { erreur: "vide" };
  }
  if (!/^[0-9]+$/.test(chiffres)) {
    return { erreur: "caractere-interdit" };
  }
  if (chiffres.length < LONGUEUR_CODE_DIRECT) {
    return { erreur: "trop-court" };
  }
  if (chiffres.length > LONGUEUR_CODE_DIRECT) {
    return { erreur: "trop-long" };
  }
  return { code: chiffres };
}

/**
 * Met en forme les chiffres d'une saisie en cours par groupes de 4
 * (« 482173 » → « 4821 73 »). Tout ce qui n'est pas un chiffre est retiré, et
 * la saisie est coupée à 8 chiffres.
 */
export function formaterSaisieCode(saisie: string): string {
  const chiffres = saisie.replace(/[^0-9]/g, "").slice(0, LONGUEUR_CODE_DIRECT);
  const groupes: string[] = [];
  for (let debut = 0; debut < chiffres.length; debut += TAILLE_GROUPE) {
    groupes.push(chiffres.slice(debut, debut + TAILLE_GROUPE));
  }
  return groupes.join(" ");
}
