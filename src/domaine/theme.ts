// SPDX-License-Identifier: AGPL-3.0-or-later

/** Apparence choisie dans « Préférences ». « systeme » suit le réglage clair ou sombre de l'ordinateur. */
export type Theme = "clair" | "sombre" | "systeme";

export const THEMES: readonly Theme[] = ["clair", "sombre", "systeme"];

/** Thème retenu tant que l'enseignant n'en a pas choisi d'autre. */
export const THEME_PAR_DEFAUT: Theme = "systeme";

/** Vrai si la valeur est l'un des thèmes connus. */
export function estTheme(valeur: unknown): valeur is Theme {
  return typeof valeur === "string" && (THEMES as readonly string[]).includes(valeur);
}

/** Relit un thème enregistré ; une valeur absente ou inconnue donne le thème par défaut. */
export function lireTheme(valeur: unknown): Theme {
  return estTheme(valeur) ? valeur : THEME_PAR_DEFAUT;
}

/**
 * Valeur de l'attribut `data-theme` de la page, lu par la feuille de styles :
 * `null` (attribut retiré) laisse la feuille suivre l'ordinateur.
 */
export function attributTheme(theme: Theme): "light" | "dark" | null {
  if (theme === "clair") {
    return "light";
  }
  return theme === "sombre" ? "dark" : null;
}
