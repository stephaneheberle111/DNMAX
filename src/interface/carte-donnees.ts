// SPDX-License-Identifier: CECILL-2.1
/**
 * Données que la carte radiale et la carte heuristique (chaîne) affichent :
 * filtre courant (UE, EC, bloc ou compétence), UE et EC filtrés et rangés en
 * secteurs, compétences d'un EC, semestres d'une sélection d'EC, nom d'un EC.
 *
 * Repris du fichier historique (décision 38) à l'identique. Le dessin des
 * deux cartes reste dans ce fichier (0.9.2) et appelle ces fonctions par leur
 * ancien nom, publié sur la fenêtre.
 */
import { SEMESTRES } from "../domaine/constituer";
import { arcPath, fitN, polar, wrapN } from "../domaine/carte-geometrie";
import { ecOrd } from "./aides-communes";
import { ecCodeLbl } from "./donnees";
import { anneeScolaire } from "./promotions-calendrier";
import { ecsDeLEnseignant } from "../domaine/repartition";
import { etat, type Objet } from "./etat";

/** Filtre de la carte : une sorte (« ue », « ec », « bloc », « comp ») et une valeur, ou rien. */
export interface FiltreCarte {
  kind: string;
  value: string;
}

const SORTES_FILTRE = ["ue", "ec", "bloc", "comp"];

function donnees(): Objet {
  return etat.donnees;
}

function etatCarte(): Objet {
  return etat.ui.ref as Objet;
}

/**
 * Filtre courant de la carte. Un filtre inconnu, ou un filtre « EC » qui
 * porte encore le code d'une version antérieure au lieu d'un identifiant,
 * est remis à vide, sur place.
 */
export function refFilter(): FiltreCarte {
  const carte = etatCarte();
  const filtre = carte.filter as FiltreCarte | null | undefined;
  if (!filtre || !filtre.kind || !SORTES_FILTRE.includes(filtre.kind)) return (carte.filter = { kind: "", value: "" });
  if (filtre.kind === "ec" && !(donnees().ecs as Objet[]).some((ec) => ec.id === filtre.value)) return (carte.filter = { kind: "", value: "" });
  return filtre;
}

/**
 * EC de la répartition de service de « C'est moi » pour l'année scolaire en
 * cours, toutes promotions confondues ; ensemble vide sans « C'est moi » ou
 * sans affectation.
 */
export function ecsDeMaRepartition(): Set<string> {
  const tout = donnees();
  return ecsDeLEnseignant((tout.affectH || {}) as Objet, anneeScolaire(), tout.moi);
}

/**
 * EC auxquels la carte se limite quand « Seulement ma répartition » est
 * coché (et qu'il y a une répartition) ; `null` sinon : rien n'est retiré.
 */
export function ecsMiens(): Set<string> | null {
  if (!etatCarte().mine) return null;
  const miens = ecsDeMaRepartition();
  return miens.size ? miens : null;
}

/** État de la case « Seulement ma répartition » d'Explorer, et de quoi la basculer. */
export function repartitionCarte(redessiner: () => void): { disponible: boolean; active: boolean; ecs: ReadonlySet<string> | null; basculer(): void } {
  const disponible = ecsDeMaRepartition().size > 0;
  return {
    disponible,
    active: disponible && !!etatCarte().mine,
    ecs: ecsMiens(),
    basculer: () => {
      etatCarte().mine = !etatCarte().mine;
      redessiner();
    },
  };
}

export function filtUes(ues: Objet[]): Objet[] {
  const filtre = refFilter();
  const miens = ecsMiens();
  // Avec « Seulement ma répartition » : les UE où j'assure au moins un EC.
  const retenues = miens === null ? ues : ues.filter((ue) => (donnees().ecs as Objet[]).some((ec) => ec.ueId === ue.id && miens.has(ec.id as string)));
  if (filtre.kind === "ue") return retenues.filter((ue) => ue.nom === filtre.value);
  if (filtre.kind === "ec") {
    const ec = (donnees().ecs as Objet[]).find((candidat) => candidat.id === filtre.value) || {};
    return retenues.filter((ue) => ue.id === ec.ueId);
  }
  return retenues;
}

export function filtEcs(ecs: Objet[]): Objet[] {
  const filtre = refFilter();
  const miens = ecsMiens();
  const retenus = miens === null ? ecs : ecs.filter((ec) => miens.has(ec.id as string));
  return filtre.kind === "ec" ? retenus.filter((ec) => ec.id === filtre.value) : retenus;
}

export function filtComps(competences: Objet[]): Objet[] {
  const filtre = refFilter();
  const miens = ecsMiens();
  const retenues = miens === null ? competences : competences.filter((competence) => ((competence.ecIds || []) as string[]).some((id) => miens.has(id)));
  if (filtre.kind === "bloc") return retenues.filter((competence) => String(competence.bloc) === filtre.value);
  if (filtre.kind === "comp") return retenues.filter((competence) => competence.code === filtre.value);
  return retenues;
}

/**
 * Secteurs de la carte radiale : chaque UE retenue avec ses EC retenus,
 * rangés, sans UE vide ; puis, sauf filtre par UE, les EC rattachés à
 * aucune UE, sous « Sans UE ».
 */
export function radialGroups(): { u: Objet; ecs: Objet[] }[] {
  const tout = donnees();
  const ues = tout.ues as Objet[];
  const ecs = tout.ecs as Objet[];
  const groupes = filtUes(ues)
    .map((ue) => ({ u: ue, ecs: filtEcs(ecs.filter((ec) => ec.ueId === ue.id)).sort((premier, second) => ecOrd(premier) - ecOrd(second)) }))
    .filter((groupe) => groupe.ecs.length);
  const orphelins = filtEcs(ecs.filter((ec) => !ues.some((ue) => ue.id === ec.ueId)));
  if (orphelins.length && refFilter().kind !== "ue") groupes.push({ u: { id: "", nom: "Sans UE", couleur: "#9aa2ae" }, ecs: orphelins });
  return groupes;
}

/** Compétences rattachées à l'EC d'identifiant `id`. */
export function compsOfEc(id: unknown): Objet[] {
  return (donnees().competences as Objet[]).filter((competence) => ((competence.ecIds || []) as unknown[]).includes(id));
}

/** Semestres (S1…S6) où au moins un des EC est assuré, avec leur année et leur numéro. */
export function semItems(ecs: Objet[] | null | undefined): { id: string; sem: string; annee: number; num: string }[] {
  return SEMESTRES.filter((semestre) => (ecs || []).some((ec) => ((ec.sems || []) as string[]).includes(semestre))).map((semestre) => ({
    id: semestre,
    sem: semestre,
    annee: Math.floor(Math.max(0, (SEMESTRES as readonly string[]).indexOf(semestre)) / 2) + 1,
    num: semestre.slice(1),
  }));
}

/** Vrai si la compétence est rattachée à un EC au semestre de l'élément. */
export function semLie(competence: Objet | null | undefined, element: { sem: unknown }): boolean {
  return ((((competence || {}).ecs || []) as Objet[]) as { sems?: unknown[] }[]).some((lien) => (lien.sems || []).includes(element.sem));
}

/** Nom d'un EC, ou ses codes s'il n'en a pas ; texte vide sans EC. */
export function ecName(ec: Objet | null | undefined): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  return ec ? String(ec.nom || "").trim() || ecCodeLbl(ec) : "";
}

/** Pose ces fonctions, et les calculs de géométrie, sur `cible` (la fenêtre) sous leurs noms historiques. */
export function publierCarteDonnees(cible: Record<string, unknown>): void {
  Object.assign(cible, { arcPath, polar, wrapN, fitN, refFilter, filtUes, filtEcs, filtComps, radialGroups, compsOfEc, semItems, semLie, ecName, ecsMiens, repartitionCarte });
}
