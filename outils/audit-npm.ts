// SPDX-License-Identifier: CECILL-2.1

/**
 * Lit le rapport de `npm audit --json` et dit quelles alertes ne sont pas
 * déjà connues et acceptées. Sert à l'atelier « Surveillance ».
 */

/**
 * Alertes connues et acceptées, avec la décision qui les justifie. Toute
 * autre alerte fait échouer la surveillance.
 *
 * `xlsx` 0.18.5 : les deux failles touchent la lecture d'un classeur, que
 * l'application ne fait pas et que le linter interdit (DECISIONS.md, décision 6).
 */
export const ALERTES_ADMISES: ReadonlySet<string> = new Set(["GHSA-4r6h-8v6p-xvw6", "GHSA-5pgg-2g8v-p4x9"]);

export interface Alerte {
  paquet: string;
  identifiant: string;
  gravite: string;
  titre: string;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/**
 * Alertes du rapport, une par avis de sécurité et par paquet. Un paquet
 * signalé seulement parce qu'il dépend d'un autre ne produit rien de plus :
 * l'avis est déjà compté sur le paquet fautif.
 *
 * @throws Error si le texte n'est pas un rapport d'audit : un rapport illisible ne doit pas passer pour « aucune alerte ».
 */
export function lireAlertes(rapport: string): Alerte[] {
  const valeur: unknown = JSON.parse(rapport);
  if (!estObjet(valeur) || !estObjet(valeur.vulnerabilities)) {
    throw new Error("rapport d'audit npm illisible");
  }
  const alertes: Alerte[] = [];
  for (const [paquet, fiche] of Object.entries(valeur.vulnerabilities)) {
    const origines: unknown[] = estObjet(fiche) && Array.isArray(fiche.via) ? fiche.via : [];
    for (const origine of origines) {
      if (estObjet(origine)) {
        // L'identifiant de l'avis est la fin de son adresse (…/advisories/GHSA-xxxx-xxxx-xxxx).
        const identifiant = texte(origine.url).split("/").pop() ?? "";
        alertes.push({ paquet, identifiant, gravite: texte(origine.severity), titre: texte(origine.title) });
      }
    }
  }
  return alertes;
}

/** Les alertes qui ne figurent pas dans `admises` ; une alerte sans identifiant n'est jamais admise. */
export function alertesNonAdmises(alertes: readonly Alerte[], admises: ReadonlySet<string> = ALERTES_ADMISES): Alerte[] {
  return alertes.filter((alerte) => alerte.identifiant === "" || !admises.has(alerte.identifiant));
}
