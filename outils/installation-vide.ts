// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Règle : ce qu'une installation neuve a le droit de contenir au démarrage.
 * DNMAX ne livre aucune donnée : ni référentiel, ni établissement, ni
 * enseignant, ni promotion, ni élève, ni évaluation. Seuls sont admis le
 * diplôme-cadre vide (caché à l'enseignant) et la liste des types de livrables
 * proposés par défaut, qui est du vocabulaire et non des données.
 *
 * Rend la liste des écarts constatés ; vide si l'installation est vierge.
 */
export function ecartsInstallationVide(entrees: Readonly<Record<string, string>>): string[] {
  const ecarts: string[] = [];
  const admises = new Set(["dnmade.data"]);
  for (const cle of Object.keys(entrees)) {
    if (!admises.has(cle)) {
      ecarts.push(`entrée inattendue au démarrage : ${cle}`);
    }
  }
  let donnees: Record<string, unknown> = {};
  try {
    const lues: unknown = JSON.parse(entrees["dnmade.data"] ?? "{}");
    if (typeof lues === "object" && lues !== null) {
      donnees = lues as Record<string, unknown>;
    }
  } catch {
    ecarts.push("dnmade.data illisible");
  }
  const longueur = (valeur: unknown): number => (Array.isArray(valeur) ? valeur.length : 0);
  const dico = typeof donnees.dico === "object" && donnees.dico !== null ? (donnees.dico as Record<string, unknown>) : {};
  for (const partie of ["ues", "ecs", "blocs", "competences"]) {
    if (longueur(dico[partie]) > 0) {
      ecarts.push(`référentiel livré : ${partie}`);
    }
  }
  for (const cle of ["enseignants", "promos", "fiches"]) {
    if (longueur(donnees[cle]) > 0) {
      ecarts.push(`données livrées : ${cle}`);
    }
  }
  const etab = typeof donnees.etab === "object" && donnees.etab !== null ? (donnees.etab as Record<string, unknown>) : {};
  if (Object.values(etab).some((valeur) => typeof valeur === "string" && valeur.trim() !== "")) {
    ecarts.push("établissement renseigné");
  }
  const diplomes = Array.isArray(donnees.diplomes) ? (donnees.diplomes as unknown[]) : [];
  for (const diplome of diplomes) {
    const champs = typeof diplome === "object" && diplome !== null ? (diplome as Record<string, unknown>) : {};
    const nomme = [champs.nom, champs.mention].some((valeur) => typeof valeur === "string" && valeur.trim() !== "");
    if (nomme) {
      ecarts.push(`diplôme livré : ${String(champs.nom)} ${String(champs.mention)}`.trim());
    }
  }
  const refs = typeof donnees.refs === "object" && donnees.refs !== null ? Object.values(donnees.refs as Record<string, unknown>) : [];
  for (const referentiel of refs) {
    const parties = typeof referentiel === "object" && referentiel !== null ? Object.values(referentiel as Record<string, unknown>) : [];
    if (parties.some((partie) => longueur(partie) > 0)) {
      ecarts.push("référentiel de travail livré");
    }
  }
  return ecarts;
}
