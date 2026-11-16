// SPDX-License-Identifier: CECILL-2.1
import { LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES } from "./saisie-coffre";

/**
 * Exigences du mot de passe quand le module Étudiants est actif (décision 36) :
 * au moins 12 caractères, trois types de caractères parmi minuscules,
 * majuscules, chiffres et symboles, ni suite triviale, ni mot évident (le nom
 * de l'application, de l'enseignant ou de l'établissement), ni mot de passe
 * courant. Sans ce module, seule la longueur de 8 caractères compte.
 */

export type DefautRobustesse = "trop-court" | "types" | "suite" | "mot-evident" | "courant";

/** Explication de chaque défaut, à montrer à l'enseignant. */
export const EXPLICATIONS: Readonly<Record<DefautRobustesse, string>> = {
  "trop-court": `au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)} caractères`,
  types: "trois types de caractères parmi minuscules, majuscules, chiffres et symboles",
  suite: "pas de suite toute faite (aaaa, 1234, azerty…)",
  "mot-evident": "ni DNMAX, ni DN MADE, ni votre nom, ni celui de l'établissement",
  courant: "pas un mot de passe parmi les plus utilisés",
};

/** Mots de passe parmi les plus répandus, mis en minuscules et sans accent. */
const COURANTS = new Set([
  "motdepasse",
  "motdepasse1",
  "motdepasse123",
  "password",
  "password1",
  "password123",
  "azertyuiop",
  "azerty123456",
  "qwertyuiop",
  "qwerty123456",
  "123456789012",
  "000000000000",
  "111111111111",
  "bonjour12345",
  "soleil123456",
  "doudou123456",
  "loulou123456",
  "chouchou1234",
  "iloveyou1234",
  "jetaime12345",
  "marseille123",
  "liverpool123",
  "football1234",
  "nicolas12345",
  "julien123456",
  "princesse123",
  "administrateur",
  "admin1234567",
  "welcome12345",
  "changeme1234",
  "lycee1234567",
  "professeur12",
  "enseignant12",
]);

/** Suites qu'on tape sans réfléchir : alphabet, chiffres, rangées de claviers AZERTY et QWERTY. */
const SUITES = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "azertyuiop", "qsdfghjklm", "wxcvbn", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

const LONGUEUR_SUITE = 4;

/** Minuscules sans accent ni espace, pour comparer sans tenir compte de la façon d'écrire. */
export function simplifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s\-_.']/g, "");
}

function nombreDeTypes(motDePasse: string): number {
  return [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((type) => type.test(motDePasse)).length;
}

function contientUneSuite(simple: string): boolean {
  if (new RegExp(`(.)\\1{${String(LONGUEUR_SUITE - 1)}}`, "u").test(simple)) {
    return true;
  }
  for (let debut = 0; debut + LONGUEUR_SUITE <= simple.length; debut++) {
    const morceau = simple.slice(debut, debut + LONGUEUR_SUITE);
    const inverse = Array.from(morceau).reverse().join("");
    if (SUITES.some((suite) => suite.includes(morceau) || suite.includes(inverse))) {
      return true;
    }
  }
  return false;
}

/**
 * Défauts d'un mot de passe au regard des exigences du module Étudiants ;
 * vide s'il convient.
 *
 * @param motsInterdits prénom, nom, nom de l'établissement… : seuls les mots
 *   de trois lettres ou plus comptent, pour ne pas refuser « de » ou « la ».
 */
export function defautsRobustesse(motDePasse: string, motsInterdits: readonly string[]): DefautRobustesse[] {
  const defauts: DefautRobustesse[] = [];
  if (Array.from(motDePasse).length < LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES) {
    defauts.push("trop-court");
  }
  if (nombreDeTypes(motDePasse) < 3) {
    defauts.push("types");
  }
  const simple = simplifier(motDePasse);
  if (contientUneSuite(simple)) {
    defauts.push("suite");
  }
  const evidents = ["dnmax", "dnmade", ...motsInterdits.flatMap((mot) => mot.split(/[\s\-']+/u)).map(simplifier)].filter(
    (mot) => mot.length >= 3,
  );
  if (evidents.some((mot) => simple.includes(mot))) {
    defauts.push("mot-evident");
  }
  if (COURANTS.has(simple)) {
    defauts.push("courant");
  }
  return defauts;
}

/** Phrase qui dit ce qui manque, « Il faut : a ; b. » */
export function expliquerDefauts(defauts: readonly DefautRobustesse[]): string {
  return defauts.length === 0 ? "" : `Il faut : ${defauts.map((defaut) => EXPLICATIONS[defaut]).join(" ; ")}.`;
}

function champTexte(json: string | undefined, ...chemin: string[]): string {
  try {
    let valeur: unknown = JSON.parse(json ?? "null");
    for (const cle of chemin) {
      valeur = typeof valeur === "object" && valeur !== null ? (valeur as Record<string, unknown>)[cle] : undefined;
    }
    return typeof valeur === "string" ? valeur : "";
  } catch {
    return "";
  }
}

/** Prénom, nom et établissement de l'enseignant, lus dans ses données : les mots à ne pas mettre dans le mot de passe. */
export function motsInterditsDe(entrees: Readonly<Record<string, string>>): string[] {
  return [
    champTexte(entrees["dnmax.identite"], "prenom"),
    champTexte(entrees["dnmax.identite"], "nomFamille"),
    champTexte(entrees["dnmax.identite"], "nom"),
    champTexte(entrees["dnmade.data"], "etab", "nom"),
  ].filter((mot) => mot !== "");
}
