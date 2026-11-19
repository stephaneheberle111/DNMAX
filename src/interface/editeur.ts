// SPDX-License-Identifier: CECILL-2.1
/**
 * Éditeur d'évaluation, tel que l'interface le prépare : enregistrement de
 * l'évaluation en cours (brouillon ou dans « Mes évaluations »), passage
 * d'une étape à l'autre, contextes de la formulation (étape 3) et de la
 * saisie des étudiants (étape 4).
 *
 * Repris du fichier historique (décision 38). L'étape 1 et les compétences
 * (étape 2) sont préparées par `editeur-etape1`, le suivi par `evaluations`.
 */
import { etatEnregistrement as etatDEnregistrement } from "../domaine/evaluation";
import { derniereEtape, etapeAffichee } from "../domaine/etapes-editeur";
import { evaluationCommencee } from "../domaine/saisie-resultats";
import { peindreBarreEtapes, peindreEnregistrement } from "../editeur/barre-etapes";
import { lierSelection, peindreFormulation, type ContexteFormulation } from "../editeur/formulation";
import { peindreSaisieEtudiants, type ContexteSaisieEtudiants } from "../editeur/saisie-etudiants";
import { toast } from "./aides-communes";
import { critLabel } from "./donnees";
import { peindreCompetencesChoisies, peindreFormulaire } from "./editeur-etape1";
import { etat, type Objet } from "./etat";
import { compsFor, evalStats, ligKey, ligTitre, lignesOf, studentsOf, uid } from "./evaluation-courante";
import { suiviDe } from "./evaluations";
import { dateEnLettres, versionDeLEvaluationEnCours } from "./versions-referentiel";

let ecrire: (cle: string, valeur: string) => void = () => undefined;

function evaluation(): Objet {
  return etat.evaluation;
}

function ui(): Objet {
  return etat.ui;
}

function ecrireEntree(cle: string, valeur: unknown): void {
  try {
    ecrire(cle, JSON.stringify(valeur));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
}

/** Vrai si l'évaluation en cours est un brouillon : marquée comme telle, ou pas encore dans la liste. */
export function estBrouillon(): boolean {
  return !!evaluation().brouillon || !etat.evaluations.some((candidate) => candidate.id === evaluation().id);
}

/**
 * Enregistre l'évaluation en cours : dans la liste (en brouillon, sauf avec
 * `valide`, que seul « Enregistrer l'évaluation » donne) et comme brouillon
 * de l'éditeur, puis redessine la ligne d'enregistrement.
 */
export function enregistrer(valide?: unknown): void {
  enregistrerDansLaListe(valide === true);
  ecrireEntree("dnmade.draft", evaluation());
  peindreLigneEnregistrement();
}

/** "liste", "bloquee" ou "vide" ; un référentiel non validé n'empêche plus d'enregistrer (avertissement à la sélection). */
export function etatEnregistrement(): string {
  return etatDEnregistrement({
    dansLaListe: etat.evaluations.some((candidate) => candidate.id === evaluation().id),
    commencee: evaluationCommencee(evaluation()),
    referentielBloquant: false,
  });
}

/**
 * Range une copie de l'évaluation en cours dans la liste. Une évaluation qui
 * n'y est pas encore n'y entre qu'une fois commencée, pour qu'un clic sur
 * « Nouvelle évaluation » sans suite n'y laisse pas une ligne vide.
 */
export function enregistrerDansLaListe(valide: boolean): void {
  const courante = evaluation();
  const rang = etat.evaluations.findIndex((candidate) => candidate.id === courante.id);
  if (rang < 0 && !evaluationCommencee(courante)) return;
  if (valide) delete courante.brouillon;
  else if (rang < 0) courante.brouillon = true;
  suiviDe(courante);
  if (!courante.refV) {
    const version = versionDeLEvaluationEnCours();
    if (version) courante.refV = version.id;
  }
  const copie = structuredClone(courante);
  if (rang >= 0) etat.evaluations[rang] = copie;
  else etat.evaluations.unshift(copie);
  ecrireEntree("dnmade.fiches", etat.evaluations);
}

/** Ligne d'enregistrement : état, brouillon, et référentiel suivi avec la date de sa version. */
export function peindreLigneEnregistrement(): void {
  const version = versionDeLEvaluationEnCours();
  const meta = (etat.referentiel.meta ?? {}) as Objet;
  peindreEnregistrement({
    etat: etatEnregistrement() as Parameters<typeof peindreEnregistrement>[0]["etat"],
    brouillon: !!evaluation().brouillon,
    version: version ? `${(meta.diplome as string) || ""}, version du ${String(dateEnLettres(version.date))}` : "",
  });
}

function derniere(): 3 | 4 {
  return derniereEtape({ moduleEleves: !!etat.modules.eleves, brouillon: estBrouillon() });
}

/** Ouvre une étape de l'éditeur (ramenée à une étape accessible) et la dessine. */
export function allerALEtape(demandee: unknown): void {
  ui().step = etapeAffichee(Number(demandee), derniere());
  if (ui().step === 3) ui().sel = [];
  peindreEtapes();
  if (ui().step === 1) peindreFormulaire();
  if (ui().step === 2) peindreCompetencesChoisies();
  if (ui().step === 3) peindreLignes();
  if (ui().step === 4) peindreEtudiants();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Barre des étapes ; un brouillon ne s'évalue pas, l'étape 4 se referme (décision 29). */
export function peindreEtapes(): void {
  ui().step = etapeAffichee(ui().step as number, derniere());
  const bilan = evalStats(evaluation()) as { els: number; faits: number; partiels: number };
  peindreBarreEtapes({
    evaluation: evaluation(),
    etape: ui().step as number,
    moduleEleves: !!etat.modules.eleves,
    brouillon: estBrouillon(),
    semestre: evaluation().semestre as string,
    competencesDisponibles: compsFor(evaluation().semestre).length,
    bilan: { etudiants: bilan.els, faits: bilan.faits, partiels: bilan.partiels },
  });
  peindreLigneEnregistrement();
}

/** Contexte de la formulation (étape 3), qui reçoit l'évaluation en cours. */
export function contexteFormulation(): ContexteFormulation {
  return {
    evaluation: evaluation(),
    libelleCritere: critLabel(),
    libelleCompetence: (code) => {
      const competences = Array.isArray(etat.referentiel.competences) ? (etat.referentiel.competences as Objet[]) : [];
      return ((competences.find((competence) => competence.code === code) ?? {}).libelle as string) || "";
    },
    selection: () => ui().sel as string[],
    retenirSelection: (cles) => {
      ui().sel = [...cles];
    },
    nouvelIdentifiant: () => uid(),
    enregistrer: () => {
      enregistrer();
    },
    apresChangement: peindreEtapes,
    annoncer: (message) => {
      toast(message);
    },
  };
}

export function peindreLignes(): void {
  peindreFormulation(contexteFormulation());
}

export function lierLaSelection(): void {
  lierSelection(contexteFormulation());
}

/** Contexte de la saisie des étudiants (étape 4), qui reçoit les résultats de l'évaluation en cours. */
export function contexteSaisie(): ContexteSaisieEtudiants {
  const courante = evaluation();
  if (!courante.res || typeof courante.res !== "object") courante.res = {};
  return {
    resultats: courante.res as Objet,
    niveaux: (courante.niveaux as string[] | undefined) || [],
    etudiants: studentsOf(courante),
    lignes: lignesOf(courante).map((ligne) => {
      const titre = ligTitre(ligne);
      return { cle: ligKey(ligne), code: titre.code, libelle: titre.lib };
    }),
    vue: { mode: ui().emode === "fiche" ? "fiche" : "grille", etudiant: (ui().eleve as string) || "" },
    aujourdhui: () => new Date().toISOString().slice(0, 10),
    retenirVue: (vue) => {
      ui().emode = vue.mode;
      ui().eleve = vue.etudiant;
    },
    enregistrer: () => {
      enregistrer();
    },
    apresSaisie: peindreEtapes,
    annoncer: (message) => {
      toast(message);
    },
  };
}

export function peindreEtudiants(): void {
  const hote = document.getElementById("elevesPane");
  if (!hote) return;
  peindreSaisieEtudiants(hote, contexteSaisie());
}

/** Donne au module l'écriture du stockage (évaluations, brouillon). */
export function brancherEditeur(ecrireStockage: (cle: string, valeur: string) => void): void {
  ecrire = ecrireStockage;
}
