// SPDX-License-Identifier: AGPL-3.0-or-later
import { estObjet, type ObjetJson } from "./echange/modele";
import { PARTIES, lireListes } from "./echange/referentiel-echange";

/**
 * Le diplôme-cadre est le diplôme vide que l'interface crée à l'installation,
 * parce qu'elle a besoin d'un diplôme actif pour fonctionner. Il porte la
 * marque `cadre` et reste invisible tant qu'il est vierge ; le premier
 * référentiel reçu, ou le premier diplôme créé à la main, le réutilise.
 *
 * Les versions précédentes le créaient sans marque, sous le nom « Diplôme » :
 * ce nom, sans mention ni code, le désigne encore.
 */
const NOM_CADRE_HISTORIQUE = "Diplôme";

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function table(valeur: unknown): ObjetJson {
  return estObjet(valeur) ? valeur : {};
}

function estCadre(diplome: ObjetJson): boolean {
  return (
    diplome.cadre === true ||
    (texte(diplome.nom) === NOM_CADRE_HISTORIQUE && texte(diplome.mention) === "" && texte(diplome.code) === "")
  );
}

/**
 * Identifiants des diplômes auxquels une promotion est rattachée. Les
 * évaluations et la répartition de service se rattachent à un diplôme par
 * leur promotion : ce critère les couvre aussi.
 */
function diplomesDesPromotions(promotions: readonly unknown[]): Set<string> {
  const utilises = new Set<string>();
  for (const promotion of promotions) {
    if (estObjet(promotion) && typeof promotion.diplomeId === "string") {
      utilises.add(promotion.diplomeId);
    }
  }
  return utilises;
}

/** Vrai si le diplôme n'a ni référentiel, ni version, ni promotion. Un référentiel illisible n'est pas vierge. */
function estVierge(donnees: ObjetJson, diplomeId: string, utilises: ReadonlySet<string>): boolean {
  if (utilises.has(diplomeId)) {
    return false;
  }
  const brut: unknown = table(donnees.refs)[diplomeId];
  const referentiel = brut === undefined ? null : lireListes(brut);
  if (brut !== undefined && (referentiel === null || PARTIES.some((partie) => referentiel[partie].length > 0))) {
    return false;
  }
  const versions: unknown = table(donnees.versions)[diplomeId];
  if (versions !== undefined && (!Array.isArray(versions) || versions.length > 0)) {
    return false;
  }
  return texte(table(donnees.valide)[diplomeId]) === "";
}

/**
 * Vrai si ce diplôme est le cadre vierge, qu'il faut alors cacher à l'enseignant.
 *
 * @param promotions contenu de `dnmade.promos`
 */
export function estCadreVierge(donnees: unknown, diplomeId: unknown, promotions: unknown): boolean {
  if (!estObjet(donnees) || !Array.isArray(donnees.diplomes) || !Array.isArray(promotions)) {
    return false;
  }
  const diplome: unknown = donnees.diplomes.find((candidat) => estObjet(candidat) && candidat.id === diplomeId);
  return (
    estObjet(diplome) &&
    typeof diplome.id === "string" &&
    estCadre(diplome) &&
    estVierge(donnees, diplome.id, diplomesDesPromotions(promotions))
  );
}

export interface Nettoyage {
  /** Les données nettoyées, ou les données reçues telles quelles si rien n'a changé. */
  donnees: ObjetJson;
  /** Identifiants des diplômes retirés. */
  retires: string[];
  modifie: boolean;
}

/**
 * Retire les diplômes-cadres vierges dès qu'un autre diplôme existe, et marque
 * comme cadre celui qui reste seul sous l'ancien nom « Diplôme ».
 *
 * Seuls les cadres sont retirés : un diplôme créé à la main et pas encore
 * rempli est gardé, l'enseignant l'a voulu. Le diplôme actif est reporté sur
 * le premier diplôme restant s'il est retiré. Rien d'autre n'est touché, et un
 * second passage ne change plus rien.
 *
 * @param promotions contenu de `dnmade.promos`
 * @returns `null` si les données ou les promotions n'ont pas la forme attendue
 */
export function nettoyerDiplomesVierges(donnees: unknown, promotions: unknown): Nettoyage | null {
  if (!estObjet(donnees) || !Array.isArray(donnees.diplomes) || !Array.isArray(promotions)) {
    return null;
  }
  const utilises = diplomesDesPromotions(promotions);
  const diplomes: unknown[] = donnees.diplomes;
  const cadres = diplomes.filter(
    (diplome): diplome is ObjetJson & { id: string } =>
      estObjet(diplome) && typeof diplome.id === "string" && estCadre(diplome) && estVierge(donnees, diplome.id, utilises),
  );
  // Seuls des cadres vierges : le premier reste, l'interface a besoin d'un diplôme.
  const garde = cadres.length === diplomes.length ? cadres[0] : undefined;
  const retires = cadres.filter((cadre) => cadre !== garde).map((cadre) => cadre.id);
  const aMarquer = garde !== undefined && (garde.cadre !== true || texte(garde.nom) !== "");
  if (retires.length === 0 && !aMarquer) {
    return { donnees, retires, modifie: false };
  }
  const restants = diplomes
    .filter((diplome) => !(estObjet(diplome) && typeof diplome.id === "string" && retires.includes(diplome.id)))
    .map((diplome) => (diplome === garde ? { ...garde, nom: "", cadre: true } : diplome));
  const sansRetires = (valeur: unknown): ObjetJson =>
    Object.fromEntries(Object.entries(table(valeur)).filter(([id]) => !retires.includes(id)));
  const nettoyees: ObjetJson = { ...donnees, diplomes: restants };
  for (const cle of ["refs", "versions", "valide"] as const) {
    if (cle in donnees) {
      nettoyees[cle] = sansRetires(donnees[cle]);
    }
  }
  if (typeof donnees.activeDiplome === "string" && retires.includes(donnees.activeDiplome)) {
    const premier = restants.find(estObjet);
    nettoyees.activeDiplome = premier !== undefined && typeof premier.id === "string" ? premier.id : "";
  }
  return { donnees: nettoyees, retires, modifie: true };
}
