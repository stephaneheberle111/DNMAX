// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Fond de page choisi dans « Préférences » : une trame de papier, la force de
 * son relief et le X en creux. Calculs seuls : lecture d'un réglage enregistré
 * et attributs à poser sur la page.
 */

export const TRAMES = ["lisse", "feutre", "toile", "verge"] as const;
export type Trame = (typeof TRAMES)[number];

/** « normale » : trame à 100 % ; « peine » (à peine) : à 50 %. */
export const FORCES = ["normale", "peine"] as const;
export type Force = (typeof FORCES)[number];

export interface Fond {
  readonly trame: Trame;
  readonly force: Force;
  readonly xEnCreux: boolean;
}

export const FOND_PAR_DEFAUT: Fond = { trame: "feutre", force: "normale", xEnCreux: true };

export function estTrame(valeur: unknown): valeur is Trame {
  return typeof valeur === "string" && (TRAMES as readonly string[]).includes(valeur);
}

export function estForce(valeur: unknown): valeur is Force {
  return typeof valeur === "string" && (FORCES as readonly string[]).includes(valeur);
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
    xEnCreux: typeof champs.xEnCreux === "boolean" ? champs.xEnCreux : FOND_PAR_DEFAUT.xEnCreux,
  };
}

/** Attributs de la page lus par la feuille de styles (`data-fond`, `data-relief`, `data-x-creux`). */
export function attributsFond(fond: Fond): Readonly<Record<"data-fond" | "data-relief" | "data-x-creux", string>> {
  return {
    "data-fond": fond.trame,
    "data-relief": fond.force,
    "data-x-creux": fond.xEnCreux ? "oui" : "non",
  };
}
