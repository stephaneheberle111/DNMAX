// SPDX-License-Identifier: CECILL-2.1
/*
 * Fond de page choisi dans « Préférences » : une trame de papier, la force de
 * son relief, l'intensité de sa couleur et le bandeau gaufré en bas de page.
 * Calculs seuls : lecture d'un réglage enregistré et attributs à poser sur la page.
 */

export const TRAMES = ["lisse", "feutre", "toile", "verge"] as const;
export type Trame = (typeof TRAMES)[number];

/** « normale » : trame à 100 % ; « peine » (à peine) : à 50 %. */
export const FORCES = ["normale", "peine"] as const;
export type Force = (typeof FORCES)[number];

/** Intensité de la couleur du papier, du plus pâle au plus soutenu ; « normale » est la teinte de l'identité. */
export const TEINTES = ["pale", "douce", "normale", "soutenue"] as const;
export type Teinte = (typeof TEINTES)[number];

export interface Fond {
  readonly trame: Trame;
  readonly force: Force;
  readonly teinte: Teinte;
  /**
   * Bandeau gaufré affiché en bas de page. Le champ garde le nom du « X en creux »
   * qu'il remplace (série 8) : c'est le nom enregistré, et le choix déjà fait reste valable.
   */
  readonly xEnCreux: boolean;
}

export const FOND_PAR_DEFAUT: Fond = { trame: "lisse", force: "normale", teinte: "normale", xEnCreux: true };

export function estTrame(valeur: unknown): valeur is Trame {
  return typeof valeur === "string" && (TRAMES as readonly string[]).includes(valeur);
}

export function estForce(valeur: unknown): valeur is Force {
  return typeof valeur === "string" && (FORCES as readonly string[]).includes(valeur);
}

export function estTeinte(valeur: unknown): valeur is Teinte {
  return typeof valeur === "string" && (TEINTES as readonly string[]).includes(valeur);
}

/**
 * Relit un fond enregistré (texte JSON). Chaque champ absent, inconnu ou d'un
 * autre type reprend sa valeur par défaut ; un texte illisible donne le fond par défaut.
 */
export function lireFond(texte: unknown): Fond {
  if (typeof texte !== "string") {
    return FOND_PAR_DEFAUT;
  }
  let lu: unknown;
  try {
    lu = JSON.parse(texte);
  } catch {
    return FOND_PAR_DEFAUT;
  }
  if (typeof lu !== "object" || lu === null) {
    return FOND_PAR_DEFAUT;
  }
  const champs = lu as Record<string, unknown>;
  return {
    trame: estTrame(champs.trame) ? champs.trame : FOND_PAR_DEFAUT.trame,
    force: estForce(champs.force) ? champs.force : FOND_PAR_DEFAUT.force,
    teinte: estTeinte(champs.teinte) ? champs.teinte : FOND_PAR_DEFAUT.teinte,
    xEnCreux: typeof champs.xEnCreux === "boolean" ? champs.xEnCreux : FOND_PAR_DEFAUT.xEnCreux,
  };
}

/** Attributs de la page lus par la feuille de styles (`data-fond`, `data-relief`, `data-teinte`, `data-bandeau`). */
export function attributsFond(fond: Fond): Readonly<Record<"data-fond" | "data-relief" | "data-teinte" | "data-bandeau", string>> {
  return {
    "data-fond": fond.trame,
    "data-relief": fond.force,
    "data-teinte": fond.teinte,
    "data-bandeau": fond.xEnCreux ? "oui" : "non",
  };
}
