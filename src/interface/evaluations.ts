// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations, tel que l'interface le prépare : suivi et statut de chaque
 * évaluation, filtres de la liste, liste elle-même et fenêtre des actions
 * (évaluer, exporter, dupliquer, supprimer).
 *
 * Repris du fichier historique (décision 38). L'export d'un document et
 * l'avertissement avant de restituer sont dans `interface/export-document`.
 */
import { correspondFiltres, filtresParDefaut, normaliserFiltres } from "../domaine/filtres-evaluations";
import { avancementSaisie, estEvaluee, LIBELLES_STATUT, promotionsVisees, restitutionsEtudiants, statutEvaluation } from "../domaine/suivi-evaluation";
import { apresDessinListe, ouvrirActions, type ContexteActions } from "../evaluations/actions";
import { peindreFiltres, type ContexteFiltres } from "../evaluations/filtres";
import { peindreListe, type ContexteListe } from "../evaluations/liste";
import { paintTabs, toast as afficherBulle } from "./aides-communes";
import { allerALEtape, enregistrer, peindreLignes } from "./editeur";
import { evaluationVierge, nouvelleEvaluation, peindreCompetencesChoisies, peindreFormulaire, rendusManquants } from "./editeur-etape1";
import { aEuLaPromotionDonnee } from "./etablissement";
import { etat, type Objet } from "./etat";
import { migF, studentsOf, uid } from "./evaluation-courante";
import { chargerExemple } from "./exemple";
import { avertirAvantRestitution, exporterEvaluation } from "./export-document";
import { anneeDeFormation, anneeScolaire, dureePromotion, nomAffiche, nomCourt, normaliserPromotion, promotionsAffichees } from "./promotions-calendrier";
import { afficherMention, mentionDe } from "./versions-referentiel";

let ecrire: (cle: string, valeur: string) => void = () => undefined;
let lire: (cle: string) => string | null = () => null;

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

function lireEntree(cle: string, parDefaut: unknown): unknown {
  try {
    const valeur = lire(cle);
    return valeur ? (JSON.parse(valeur) as unknown) : parDefaut;
  } catch {
    return parDefaut;
  }
}

function idsEtudiants(evaluation: Objet): string[] {
  return studentsOf(evaluation).map((etudiant) => etudiant.id);
}

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Suivi de l'évaluation, créé au besoin ; la date de saisie d'une évaluation ancienne est complétée. */
export function suiviDe(evaluation: Objet): Objet {
  evaluation.suivi = evaluation.suivi || {};
  const suivi = evaluation.suivi as Objet;
  if (!suivi.saisie) suivi.saisie = evaluation.date || new Date().toISOString().slice(0, 10);
  return suivi;
}

export function saisieDansDnmax(evaluation: Objet): { any: number; full: number; tot: number } {
  return avancementSaisie(evaluation, idsEtudiants(evaluation));
}

export function restitutionsDesEtudiants(evaluation: Objet): { n: number; tot: number } {
  if (!etat.modules.eleves) return { n: 0, tot: 0 };
  return restitutionsEtudiants(evaluation, idsEtudiants(evaluation));
}

/** Statut de l'évaluation, qui découle de ce qui a été fait (jamais saisi). */
export function statutDe(evaluation: Objet): ReturnType<typeof statutEvaluation> {
  suiviDe(evaluation);
  return statutEvaluation(evaluation, {
    aujourdhui: aujourdhui(),
    moduleEleves: !!etat.modules.eleves,
    idsEtudiants: etat.modules.eleves ? idsEtudiants(evaluation) : [],
  });
}

export function estEvalueeDonnee(evaluation: Objet): boolean {
  return estEvaluee(statutDe(evaluation));
}

/** Suivi simplifié (Paramètres > Règles d'évaluation) : affichage seul. */
export function suiviSimplifie(): boolean {
  return !!(lireEntree("dnmade.reglages", {}) as Objet).suiviSimplifie;
}

/** Étudiants ayant une évaluation individuelle enregistrée (niveaux, observations, appréciation ou restitution). */
export function evaluationsIndividuelles(evaluation: Objet): number {
  return Object.values((evaluation.res || {}) as Objet).filter((resultat) => {
    const r = resultat as Objet | null;
    return (
      r &&
      (Object.values((r.n || {}) as Objet).some((valeur) => valeur != null && valeur !== "") ||
        Object.values((r.obs || {}) as Objet).some(Boolean) ||
        r.appr ||
        r.rest)
    );
  }).length;
}

/** Retire l'évaluation de la liste ; l'évaluation en cours qui était celle-là repart à vierge, pour ne pas y revenir à la prochaine modification. */
export function retirerDeLaListe(rang: number): void {
  const retiree = etat.evaluations[rang];
  if (!retiree) return;
  etat.evaluations.splice(rang, 1);
  ecrireEntree("dnmade.fiches", etat.evaluations);
  if (etat.evaluation.id === retiree.id) {
    etat.evaluation = evaluationVierge();
    ecrireEntree("dnmade.draft", etat.evaluation);
  }
  peindreEvaluations();
}

/** Arme une suppression dans la liste ; elle se désarme d'elle-même après six secondes. */
export function armerDansLaListe(cle: string): void {
  ui().delArm = cle;
  peindreEvaluations();
  setTimeout(() => {
    if (ui().delArm === cle) {
      ui().delArm = null;
      peindreEvaluations();
    }
  }, 6000);
}

/**
 * Promotions de la répartition de service de « C'est moi » ; `null` (tout
 * reste visible) sans « C'est moi » ou sans aucune affectation.
 */
export function mesPromotions(): Set<unknown> | null {
  const moi = etat.donnees.moi;
  if (!moi) return null;
  const ids = etat.promotions.filter((promotion) => aEuLaPromotionDonnee(promotion.id, moi)).map((promotion) => promotion.id);
  return ids.length ? new Set(ids) : null;
}

export function promotionVisible(promotion: Objet): boolean {
  const visibles = mesPromotions();
  return !visibles || visibles.has(promotion.id);
}

export function etatDesFiltres(): ReturnType<typeof normaliserFiltres> {
  ui().sf = ui().sf || filtresParDefaut();
  return normaliserFiltres(ui().sf as Objet);
}

export function nomDeMoi(): string {
  const enseignants = Array.isArray(etat.donnees.enseignants) ? (etat.donnees.enseignants as Objet[]) : [];
  return ((enseignants.find((enseignant) => enseignant.id === etat.donnees.moi) ?? {}).nom as string) || "";
}

/** Promotions d'une évaluation : celles de ses classes, puis la sienne si elle manque. */
export function promotionsDe(evaluation: Objet): Objet[] {
  const noms =
    Array.isArray(evaluation.classes) && evaluation.classes.length
      ? (evaluation.classes as unknown[])
      : // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface
        String(evaluation.classe || "")
          .split(/,\s*/)
          .filter(Boolean);
  const trouvees = noms.map((nom) => etat.promotions.find((promotion) => promotion.nom === nom)).filter((promotion): promotion is Objet => Boolean(promotion));
  if (evaluation.promoId) {
    const sienne = etat.promotions.find((promotion) => promotion.id === evaluation.promoId);
    if (sienne && !trouvees.includes(sienne)) trouvees.push(sienne);
  }
  return trouvees;
}

export function promotionEnCours(promotion: Objet): boolean {
  const rang = anneeDeFormation(promotion, anneeScolaire(new Date()));
  return rang >= 1 && rang <= dureePromotion(promotion);
}

export function correspondAuxFiltres(evaluation: Objet): boolean {
  return correspondFiltres(evaluation, etatDesFiltres(), {
    visibles: mesPromotions(),
    promotionsDe,
    enCours: promotionEnCours,
    moi: nomDeMoi(),
    statut: statutDe,
  });
}

/** Barre des filtres de Mes évaluations. */
export function peindreFiltresDeLaListe(): void {
  const hote = document.getElementById("sFilters");
  if (!hote) return;
  etat.promotions.forEach(normaliserPromotion);
  const diplomes = Array.isArray(etat.donnees.diplomes) ? (etat.donnees.diplomes as Objet[]) : [];
  const rangDiplome = (id: unknown): number => diplomes.findIndex((diplome) => diplome.id === id);
  const ordre = (une: Objet, autre: Objet): number => rangDiplome(une.diplomeId) - rangDiplome(autre.diplomeId) || Number(autre.debut) - Number(une.debut);
  const rangees = etat.promotions.filter(promotionVisible).sort(ordre);
  // Hors de ma répartition de service : proposées à part dans le filtre, masquées par défaut.
  const horsRepartition = mesPromotions() === null ? [] : etat.promotions.filter((promotion) => !promotionVisible(promotion)).sort(ordre);
  peindreFiltres(hote, {
    filtres: () => etatDesFiltres(),
    reinitialiser: () => {
      ui().sf = filtresParDefaut();
    },
    promotions: rangees.map((promotion) => ({ id: promotion.id, nom: promotion.nom, court: nomCourt(promotion) || "", enCours: promotionEnCours(promotion) })),
    autres: horsRepartition.map((promotion) => ({ id: promotion.id, nom: promotion.nom, court: nomCourt(promotion) || "", enCours: promotionEnCours(promotion) })),
    autresAffichees: () => !!ui().sfAutres,
    basculerAutres: () => {
      ui().sfAutres = !ui().sfAutres;
    },
    existe: (id: unknown) => etat.promotions.some((promotion) => promotion.id === id),
    nomPromotion: (id: unknown) => {
      const promotion = etat.promotions.find((candidate) => candidate.id === id);
      return promotion ? nomCourt(promotion) || (promotion.nom as string) || "" : "";
    },
    statuts: LIBELLES_STATUT,
    moiDefini: nomDeMoi() !== "",
    ouvert: () => (ui().sfOpen as string) || "",
    retenirOuvert: (cle: unknown) => {
      ui().sfOpen = cle;
    },
    redessiner: peindreEvaluations,
  } as unknown as ContexteFiltres);
}

/** Ouvre une copie de l'évaluation de la liste dans l'éditeur, sur la mention de sa promotion. */
function ouvrirDansLEditeur(rang: number): void {
  etat.evaluation = migF(structuredClone(etat.evaluations[rang] as Objet));
  afficherMention(mentionDe(etat.evaluation));
}

/** Liste de Mes évaluations, avec sa fenêtre des actions. */
export function peindreEvaluations(): void {
  peindreFiltresDeLaListe();
  const hote = document.getElementById("savedList");
  const compteur = document.getElementById("sCount");
  if (!hote || !compteur) return;
  const synchroniser = (evaluation: Objet): void => {
    if (etat.evaluation.id === evaluation.id) {
      etat.evaluation.suivi = structuredClone(evaluation.suivi);
      etat.evaluation.restit = structuredClone(evaluation.restit || {});
      enregistrer();
    }
    ecrireEntree("dnmade.fiches", etat.evaluations);
  };
  const toast = (message: string): void => {
    afficherBulle(message);
  };
  const contexteActions = {
    evaluation: (rang: number) => etat.evaluations[rang],
    moduleEleves: !!etat.modules.eleves,
    suivi: suiviDe,
    saisie: saisieDansDnmax,
    rendusManquants: (evaluation: Objet) => rendusManquants(evaluation),
    evaluationsIndividuelles,
    promotionsVisees,
    nomPromotion: nomAffiche,
    promotions: (evaluation: Objet) => promotionsAffichees(evaluation),
    armee: () => ui().delArm || null,
    armer: armerDansLaListe,
    desarmer: () => {
      ui().delArm = null;
    },
    aujourdhui: aujourdhui(),
    annoncer: toast,
    evaluer: (rang: number) => {
      ouvrirDansLEditeur(rang);
      enregistrer();
      ui().tab = "new";
      ui().step = 4;
      ui().eleve = "";
      paintTabs();
      peindreFormulaire();
      peindreCompetencesChoisies();
      peindreLignes();
      allerALEtape(4);
    },
    exporter: (rang: number, format: string, mode: string) => {
      const evaluation = etat.evaluations[rang];
      if (!evaluation) return;
      if (mode === "rest") {
        avertirAvantRestitution(evaluation, () => {
          void exporterEvaluation(rang, format, "rest");
        });
        return;
      }
      void exporterEvaluation(rang, format, "eval");
      if (!suiviDe(evaluation).exporte) {
        (evaluation.suivi as Objet).exporte = aujourdhui();
        synchroniser(evaluation);
      }
      peindreEvaluations();
    },
    dupliquer: (rang: number) => {
      ouvrirDansLEditeur(rang);
      const copie = etat.evaluation;
      copie.id = uid();
      copie.titre = `${String(copie.titre)} (copie)`;
      copie.date = new Date().toISOString().slice(0, 10);
      delete copie.distribPrev;
      delete copie.renduPrev;
      if (copie.suivi) (copie.suivi as Objet).saisie = copie.date;
      enregistrer();
      ui().tab = "new";
      paintTabs();
      peindreFormulaire();
      peindreCompetencesChoisies();
    },
    synchroniser: (evaluation: Objet, vides: boolean) => {
      if (vides && etat.evaluation.id === evaluation.id) {
        etat.evaluation.res = {};
        enregistrer();
      }
      if (etat.evaluation.id === evaluation.id) {
        if (evaluation.annulee) etat.evaluation.annulee = evaluation.annulee;
        else delete etat.evaluation.annulee;
      }
    },
    enregistrer: (evaluation: Objet) => {
      synchroniser(evaluation);
      peindreEvaluations();
    },
  } as unknown as ContexteActions;
  const ouvrir = (rang: number): void => {
    ouvrirDansLEditeur(rang);
    enregistrer();
    ui().tab = "new";
    ui().sel = [];
    ui().eleve = "";
    paintTabs();
    peindreFormulaire();
    peindreCompetencesChoisies();
    peindreLignes();
    allerALEtape(ui().step === 4 ? 1 : ui().step);
  };
  const supprimerSi = (rang: number, autorise: (evaluation: Objet) => boolean, prefixe: string, message: string): void => {
    const evaluation = etat.evaluations[rang];
    if (!evaluation || !autorise(evaluation)) return;
    const cle = `${prefixe}:${String(evaluation.id)}`;
    if (ui().delArm !== cle) {
      toast("Suppression définitive : cliquez sur « Confirmer la suppression ».");
      armerDansLaListe(cle);
      return;
    }
    ui().delArm = null;
    retirerDeLaListe(rang);
    toast(message);
  };
  peindreListe(hote, compteur, {
    evaluations: () => etat.evaluations,
    visible: correspondAuxFiltres,
    moduleEleves: !!etat.modules.eleves,
    suiviSimplifie: suiviSimplifie(),
    promotions: (evaluation: Objet) => promotionsAffichees(evaluation),
    statut: statutDe,
    suivi: suiviDe,
    saisie: saisieDansDnmax,
    restitutions: restitutionsDesEtudiants,
    datesRestitutionEtudiants: (evaluation: Objet) =>
      studentsOf(evaluation).map((etudiant) => (((evaluation.res || {}) as Objet)[etudiant.id] as Objet | undefined)?.rest),
    rendusManquants: (evaluation: Objet) => rendusManquants(evaluation),
    evaluationsIndividuelles,
    armee: ui().delArm || null,
    etapeOuverte: () => (ui().stOpen == null ? null : String(ui().stOpen)),
    retenirEtape: (cle: unknown) => {
      ui().stOpen = cle;
    },
    aujourdhui: aujourdhui(),
    enregistrer: (evaluation: Objet) => {
      synchroniser(evaluation);
      peindreEvaluations();
    },
    synchroniserPrevu: (evaluation: Objet, champ: string) => {
      if (etat.evaluation.id === evaluation.id) {
        if (evaluation[champ]) etat.evaluation[champ] = evaluation[champ];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- champ de date prévue (distribPrev, renduPrev), comme avant
        else delete etat.evaluation[champ];
        enregistrer();
      }
    },
    ouvrir,
    ouvrirActions: (rang: number) => {
      ouvrirActions(rang, contexteActions);
    },
    supprimer: (rang: number) => {
      const evaluation = etat.evaluations[rang];
      if (!evaluation || !evaluation.annulee) return;
      const nombre = evaluationsIndividuelles(evaluation);
      if (nombre) {
        const s = nombre > 1 ? "s" : "";
        toast(`Suppression impossible : supprimez d'abord les ${String(nombre)} évaluation${s} individuelle${s} (bouton « Actions… »).`);
        return;
      }
      supprimerSi(rang, () => true, "f", "Évaluation supprimée.");
    },
    supprimerBrouillon: (rang: number) => {
      supprimerSi(rang, (evaluation) => !!evaluation.brouillon, "b", "Brouillon supprimé.");
    },
    filtresParDefaut: () => {
      ui().sf = filtresParDefaut();
      peindreEvaluations();
    },
    toutAfficher: () => {
      ui().sf = { per: [], mine: false, sem: [], st: [], q: "", miennes: false };
      peindreEvaluations();
    },
    nouvelleEvaluation: () => {
      nouvelleEvaluation();
    },
    chargerExemple: () => chargerExemple(),
    apresDessin: () => {
      apresDessinListe(hote, contexteActions);
    },
  } as unknown as ContexteListe);
}

/** Donne au module l'accès aux entrées enregistrées. */
export function brancherEvaluations(ecrireStockage: (cle: string, valeur: string) => void, lireStockage: (cle: string) => string | null): void {
  ecrire = ecrireStockage;
  lire = lireStockage;
}
