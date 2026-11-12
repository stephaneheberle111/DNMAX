// SPDX-License-Identifier: AGPL-3.0-or-later

/** Origine d'une sauvegarde, telle que l'enveloppe la rend. */
export type NatureSauvegarde = "quotidienne" | "avant-restauration";

/** Une sauvegarde du coffre disponible sur cet ordinateur. */
export interface Sauvegarde {
  /** Nom du fichier : seul identifiant renvoyé à l'enveloppe pour restaurer. */
  nom: string;
  nature: NatureSauvegarde;
  /** `AAAA-MM-JJ` (sauvegarde quotidienne) ou `AAAA-MM-JJTHH:MM:SSZ` (copie mise de côté). */
  horodatage: string;
  /** Taille en octets. */
  taille: number;
}

const FORME_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const FORME_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function estSauvegarde(valeur: unknown): valeur is Sauvegarde {
  if (typeof valeur !== "object" || valeur === null) {
    return false;
  }
  const { nom, nature, horodatage, taille } = valeur as Record<string, unknown>;
  if (typeof nom !== "string" || nom === "" || typeof horodatage !== "string") {
    return false;
  }
  if (typeof taille !== "number" || !Number.isSafeInteger(taille) || taille < 0) {
    return false;
  }
  return (
    (nature === "quotidienne" && FORME_JOUR.test(horodatage)) ||
    (nature === "avant-restauration" && FORME_INSTANT.test(horodatage))
  );
}

/** Vérifie la réponse de l'enveloppe : une liste dont chaque élément a la forme attendue. */
export function estListeSauvegardes(valeur: unknown): valeur is Sauvegarde[] {
  return Array.isArray(valeur) && valeur.every(estSauvegarde);
}

/**
 * Écrit la date d'une sauvegarde en clair.
 *
 * Le jour d'une sauvegarde quotidienne est écrit tel quel (pas de conversion
 * de fuseau, qui pourrait le décaler d'un jour) ; l'instant d'une copie mise
 * de côté est écrit dans `fuseau` (celui du poste quand il est absent).
 */
export function ecrireDateSauvegarde(sauvegarde: Sauvegarde, fuseau?: string): string {
  if (sauvegarde.nature === "quotidienne") {
    return new Date(`${sauvegarde.horodatage}T12:00:00Z`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return new Date(sauvegarde.horodatage).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuseau,
  });
}

/** Libellé d'une ligne de la liste. */
export function decrireSauvegarde(sauvegarde: Sauvegarde, fuseau?: string): string {
  const date = ecrireDateSauvegarde(sauvegarde, fuseau);
  return sauvegarde.nature === "quotidienne" ? `Sauvegarde du ${date}` : `État mis de côté avant la restauration du ${date}`;
}

const OCTETS_PAR_KO = 1024;
const OCTETS_PAR_MO = 1024 * 1024;

/** Taille lisible : octets, Ko arrondis à l'entier, Mo à une décimale. */
export function ecrireTaille(octets: number): string {
  if (octets < OCTETS_PAR_KO) {
    return `${String(octets)} octet${octets > 1 ? "s" : ""}`;
  }
  if (octets < OCTETS_PAR_MO) {
    return `${String(Math.round(octets / OCTETS_PAR_KO))} Ko`;
  }
  return `${(octets / OCTETS_PAR_MO).toFixed(1).replace(".", ",")} Mo`;
}
