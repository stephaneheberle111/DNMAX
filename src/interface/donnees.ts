// SPDX-License-Identifier: CECILL-2.1
/**
 * Aides du modèle de données telles que l'interface les appelle : diplômes
 * visibles, code d'une année, référentiel d'un diplôme, codes d'un EC,
 * matérialisation et absorption de la vue fusionnée, enregistrement des
 * données (`saveData`), identifiants neufs, préférences enregistrées.
 *
 * Repris du fichier historique (décision 38) ; les règles elles-mêmes sont
 * dans `domaine/`.
 */
import { estCadreVierge as estCadreViergeDans } from "../domaine/diplome-vierge";
import { libelleDiplome } from "../domaine/diplomes";
import { codesEc } from "../domaine/constituer";
import {
  absorber,
  ajouterMention,
  codeAnnee,
  construireDonnees as construireDonneesCompletes,
  donneesAEnregistrer,
  donneesDuReferentiel,
  materialiser,
  projeterReferentiel,
  referentielDe,
  type Donnees,
  type Element,
  type ReferentielSource,
} from "../domaine/modele-donnees";
import { appliquerDependances } from "../domaine/modules";
import { libelleCritere } from "../domaine/preferences";
import { SEMESTRES } from "../domaine/constituer";
import { enregistrer, peindreLignes } from "./editeur";
import { nettoyerLesRegroupements, peindreCompetencesChoisies, peindreFormulaire } from "./editeur-etape1";
import { peindreEtablissement } from "./etablissement";
import { etat, type Objet } from "./etat";
import { syncItemEcs } from "./evaluation-courante";
import { paintPrefs } from "./preferences-parametres";
import { peindreReferentiel } from "./referentiel";
import { referentielAffiche } from "./versions-referentiel";

/** Ce que le module demande à l'extérieur : stockage, horloge et hasard (ceux du navigateur en vrai). */
export interface Branchements {
  ecrireStockage(cle: string, valeur: string): void;
  maintenant(): number;
  hasard(): number;
}

let branchements: Branchements = { ecrireStockage: () => undefined, maintenant: () => 0, hasard: () => 0 };

function ecrireEntree(cle: string, valeur: unknown): void {
  try {
    branchements.ecrireStockage(cle, JSON.stringify(valeur));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
}

/** Un module qui en requiert un autre ne reste pas actif sans lui (Niveaux d'acquisition → Étudiants). */
export function modDeps(): void {
  appliquerDependances(etat.modules);
}

export function buildData(referentiel: ReferentielSource, livrables: readonly unknown[] | undefined): Donnees {
  return donneesDuReferentiel(referentiel, livrables);
}

/** Le cadre vierge d'une installation neuve reste caché ; le premier référentiel reçu, ou le premier diplôme créé, le réutilise. */
export function estCadreVierge(id: unknown): boolean {
  return estCadreViergeDans(etat.donnees, id, etat.promotions);
}

/** Diplômes montrés à l'enseignant. */
export function dipVisibles(): Objet[] {
  return (etat.donnees.diplomes as Objet[]).filter((diplome) => !estCadreVierge(diplome.id));
}

/** Identifiant d'une année : celui du diplôme suivi du numéro d'année, sauf s'il a été réécrit. */
export function anneeCode(annee: number | string, donnees?: Donnees, diplome?: Element): string {
  return codeAnnee(annee, donnees || etat.donnees, diplome || undefined);
}

export function dipLabel(diplome: unknown): string {
  return libelleDiplome(diplome);
}

export function refOf(donnees: Donnees, id: string): Objet {
  return referentielDe(donnees, id);
}

/** Code d'un EC au semestre donné (celui de l'année du semestre), ou texte vide. */
export function ecCodeAt(ec: Objet | null | undefined, semestre: string): string {
  const annee = Math.floor(Math.max(0, (SEMESTRES as readonly string[]).indexOf(semestre)) / 2) + 1;
  const codes = ((ec || {}).codes || {}) as Record<number, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  return String(codes[annee] || "");
}

export function ecCodesList(ec: Objet | null | undefined): string[] {
  return codesEc(ec || {});
}

/** Codes d'un EC séparés par « · », ou « — » s'il n'en a pas. */
export function ecCodeLbl(ec: Objet | null | undefined): string {
  const codes = ecCodesList(ec);
  return codes.length ? codes.join(" · ") : "—";
}

/** Dans une colonne étroite : « EC 2.3 · 10.3 · 18.3 ». */
export function ecCodeShort(ec: Objet | null | undefined): string {
  const codes = ecCodesList(ec);
  if (!codes.length) return "—";
  return codes.map((code, rang) => (rang ? code.replace(/^EC\s*/i, "") : code)).join(" · ");
}

export function materialize(donnees: Donnees): void {
  materialiser(donnees);
}

export function absorb(donnees: Donnees): void {
  absorber(donnees, newId);
}

export function persistData(): void {
  ecrireEntree("dnmade.data", donneesAEnregistrer(etat.donnees));
}

/** Données complètes (installation neuve, exemple) : un diplôme, le dictionnaire, son référentiel et la vue fusionnée. */
export function construireDonnees(donnees: Donnees): Donnees {
  return construireDonneesCompletes(donnees, newId);
}

export function livrNames(): string[] {
  return (etat.donnees.livrables as Objet[]).map((livrable) => livrable.nom as string).filter(Boolean);
}

/** Identifiant neuf : préfixe, heure en base 36, trois caractères tirés au hasard. */
export function newId(prefixe: string): string {
  return prefixe + branchements.maintenant().toString(36) + branchements.hasard().toString(36).slice(2, 5);
}

export function addMention(source: string, nom: string): Element {
  return ajouterMention(etat.donnees, source, nom, newId);
}

/** Référentiel actif tel que l'interface le lit. */
export function projectRef(donnees: Donnees): Objet {
  return projeterReferentiel(donnees);
}

/**
 * Enregistre les données après une modification : reporte la vue fusionnée
 * dans le dictionnaire (ou l'inverse si la modification vient du
 * dictionnaire), recalcule le référentiel affiché, retire de l'évaluation en
 * cours les compétences disparues, puis redessine sauf si `redessiner` vaut
 * `false`.
 */
export function saveData(redessiner?: boolean, depuisDictionnaire?: boolean): void {
  const donnees = etat.donnees;
  if (depuisDictionnaire) materialize(donnees);
  else {
    absorb(donnees);
    if (donnees.activeDiplome !== donnees._viewOf) materialize(donnees);
  }
  persistData();
  etat.referentiel = referentielAffiche();
  const competences = etat.referentiel.competences as Objet[];
  etat.evaluation.items = (etat.evaluation.items as Objet[]).filter((item) => competences.some((competence) => competence.code === item.code));
  nettoyerLesRegroupements();
  syncItemEcs();
  enregistrer();
  if (redessiner !== false) {
    peindreFormulaire();
    peindreCompetencesChoisies();
    peindreLignes();
    peindreReferentiel();
    if (etat.ui.tab === "org") peindreEtablissement();
    if (etat.ui.tab === "pref") paintPrefs();
  }
}

export function critLabel(): string {
  return libelleCritere(etat.preferences);
}

export function savePrefs(): void {
  ecrireEntree("dnmade.prefs", etat.preferences);
}

/** Donne au module le stockage, l'horloge et le hasard. */
export function brancherDonnees(branchementsReels: Branchements): void {
  branchements = branchementsReels;
}
