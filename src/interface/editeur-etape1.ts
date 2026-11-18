// SPDX-License-Identifier: CECILL-2.1
/**
 * Éditeur d'évaluation, étape 1 et compétences, tels que l'interface les
 * prépare : évaluation vierge, nouvelle évaluation, blocs de l'étape 1
 * (livrables, promotions, étudiants, enseignants, semestre, UE et EC),
 * contexte de l'étape 2 (compétences), et quelques aides de la grille.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom ; les règles
 * sont dans `domaine/cadre-evaluation` et les écrans dans `editeur/`.
 */
import { autresEvaluationsDesPromotions, ecsAssures, etudiantsVises, estEnCours, promotionsAProposer, type PromotionDatee, type RepartitionDePromotion } from "../domaine/cadre-evaluation";
import { ECHELLE, nettoyerRegroupements } from "../domaine/evaluation";
import { progressionDesCompetences } from "../domaine/progression-competences";
import { etudiantsSansRendu } from "../domaine/saisie-resultats";
import { LIBELLES_STATUT, type StatutSuivi } from "../domaine/suivi-evaluation";
import { promotionsAAvertir } from "../domaine/validation-referentiel";
import { avertirReferentielNonValide } from "../editeur/avertissement-referentiel";
import { peindreCompetences, type ContexteCompetences, type EvaluationCitee } from "../editeur/competences";
import { peindreEnseignants, peindreLivrables, peindrePromotions, peindreSemestres, peindreUesEtEcs } from "../editeur/etape-evaluation";
import { remplirFormulaire } from "../editeur/formulaire";
import { balise } from "../etablissement/editeur-commun";
import { SEMESTRES } from "../domaine/constituer";
import { norm, tidy } from "./constantes";
import { etat, type Objet } from "./etat";

/** Échelle proposée à une évaluation neuve (`DEF_PRESET_GET` du fichier historique). */
const ECHELLE_PAR_DEFAUT = "maitrise";

/** Ce que le module appelle encore par la fenêtre : le fichier historique et les autres modules repris. */
interface FonctionsHistoriques {
  // Fichier historique
  esc(texte: unknown): string;
  askModal(html: string, oui: () => void, non?: () => void): void;
  toast(message: string): void;
  paintTabs(): void;
  blocName(numero: unknown): string;
  ecColor(code: unknown): string;
  ueColor(ue: unknown): string;
  // Évaluation en cours
  uid(): string;
  migF(evaluation: Objet): Objet;
  setClasses(classes: readonly unknown[]): void;
  setSemestre(semestre: unknown): void;
  ecsOfSem(semestre: unknown): Objet[];
  ecsOf(competence: Objet, semestre: unknown): Objet[];
  compsFor(semestre: unknown): Objet[];
  itemEcs(competence: Objet | undefined, semestre: unknown): string[];
  syncItemEcs(): void;
  promoElevesOf(evaluation: Objet): { id: string; nom: string; promo: Objet }[];
  studentsOf(evaluation: Objet): { id: string; nom: string }[];
  migPromo(promotion: Objet): Objet;
  // Promotions et calendrier
  semSuggere(): string;
  anneeFiche(): number;
  semsOfAnnee(annee: number): string[];
  dnLabel(semestre: unknown): string;
  anneeScolaire(): string;
  applySemDate(): void;
  migPromoCohorte(promotion: Objet): Objet;
  promoAnneeAt(promotion: Objet, anneeScolaire: string): number;
  promoDuree(promotion: Objet): number;
  promoDisp(nom: unknown): string;
  classesDisp(evaluation: Objet): string;
  // Versions du référentiel, établissement, référentiel
  computeREF(): Objet;
  dipBloquant(evaluation: Objet): unknown;
  promoRefValide(promotion: Objet): boolean;
  allerValidation(diplome: unknown): void;
  affGet(promotion: unknown): Readonly<Record<string, readonly string[] | undefined>>;
  promoEcs(promotion: Objet, anneeScolaire: string): { id: string; code: string }[];
  // Données
  saveData(redessiner?: boolean): void;
  livrNames(): string[];
  dipLabel(diplome: Objet): string;
  // Éditeur et Mes évaluations
  save(valide?: boolean): void;
  paintSteps(): void;
  paintEleves(): void;
  paintLignes(): void;
  goStep(etape: number): void;
  promoVisible(promotion: Objet): boolean;
  evalueeF(evaluation: Objet): boolean;
  statutOf(evaluation: Objet): StatutSuivi;
}

type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};
let horloge: () => Date = () => new Date();

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function evaluation(): Objet {
  return etat.evaluation;
}

function ui(): Objet {
  return etat.ui;
}

function donnees(): Objet {
  return etat.donnees;
}

function diplomes(): Objet[] {
  return donnees().diplomes as Objet[];
}

function enseignants(): Objet[] {
  return donnees().enseignants as Objet[];
}

function promotionNommee(nom: unknown): Objet | undefined {
  return etat.promotions.find((promotion) => promotion.nom === nom);
}

function promotionsCochees(): Objet[] {
  return ((evaluation().classes || []) as unknown[]).map(promotionNommee).filter(Boolean) as Objet[];
}

/** Phrase sous la liste des étudiants : combien sont visés, sur combien. */
export function consigneEtudiants(vises: number, total: number): string {
  if (!total) return "";
  if (vises)
    return (
      String(vises) +
      " étudiant" +
      (vises > 1 ? "s" : "") +
      " sur " +
      String(total) +
      " : seuls " +
      (vises > 1 ? "eux sont notés" : "lui est noté") +
      " à l'étape 4 et exporté" +
      (vises > 1 ? "s" : "") +
      "."
    );
  return "Toute la promotion — " + String(total) + " étudiant" + (total > 1 ? "s" : "") + ".";
}

/** Étape 1, choix des étudiants visés parmi ceux des promotions cochées (module Étudiants). */
export function peindreChampEtudiants(): void {
  const champ = document.getElementById("fld-eleve"),
    hote = document.getElementById("f-eleve");
  if (!champ) return;
  champ.hidden = !etat.modules.eleves;
  if (!etat.modules.eleves) return;
  const courante = evaluation();
  const tous = historique().promoElevesOf(courante),
    plusieurs = new Set(tous.map((etudiant) => etudiant.promo.id)).size > 1;
  const vises = etudiantsVises(
    courante,
    tous.map((etudiant) => etudiant.id),
  );
  delete courante.eleveId;
  courante.eleveIds = vises;
  if (!hote) return;
  if (tous.length) {
    const boutons: HTMLElement[] = tous.map((etudiant) => {
      const bouton = balise(
        "button",
        [
          ["type", "button"],
          ["class", "liv"],
          ["data-elv", etudiant.id],
          ["aria-pressed", String(vises.includes(etudiant.id))],
        ],
        etudiant.nom,
      );
      if (plusieurs) bouton.append(balise("span", [["class", "n"]], historique().promoDisp(etudiant.promo.nom)));
      bouton.onclick = () => {
        // Comme l'historique, l'identifiant est relu sur le bouton (toujours un texte).
        const id = bouton.dataset.elv ?? "";
        const actuelle = evaluation();
        const choisis = actuelle.eleveIds as string[];
        actuelle.eleveIds = choisis.includes(id) ? choisis.filter((autre) => autre !== id) : [...choisis, id];
        historique().save();
        peindreChampEtudiants();
        historique().paintSteps();
        if (ui().step === 4) historique().paintEleves();
      };
      return bouton;
    });
    if (vises.length) {
      const toute = balise(
        "button",
        [
          ["type", "button"],
          ["class", "liv add"],
          ["id", "elvAll"],
        ],
        "Toute la promotion",
      );
      toute.onclick = () => {
        evaluation().eleveIds = [];
        historique().save();
        peindreChampEtudiants();
        historique().paintSteps();
      };
      boutons.push(toute);
    }
    hote.replaceChildren(...boutons);
  } else {
    hote.replaceChildren(balise("span", [["class", "hint"]], "Choisissez d'abord une promotion."));
  }
  const consigne = document.getElementById("eleveHint");
  if (consigne) consigne.textContent = consigneEtudiants(vises.length, tous.length);
}

/** EC du semestre (celui de l'évaluation en cours par défaut) qui appartiennent à l'UE. */
export function ecsDeLUe(ue: unknown, semestre?: unknown): unknown[] {
  return historique()
    .ecsOfSem(semestre || evaluation().semestre)
    .filter((entree) => entree.ue === ue)
    .map((entree) => entree.ec);
}

/** Entrée d'un EC parmi ceux du semestre, ou `null`. */
export function entreeEc(code: unknown, semestre: unknown): Objet | null {
  return historique()
    .ecsOfSem(semestre)
    .find((entree) => entree.ec === code) || null;
}

/**
 * UE retenues par l'évaluation en cours : celles cochées, plus celles des EC
 * cochés seuls. Diffère de `uesRetenues` (domaine) pour un EC sans UE, compté
 * ici comme dans l'historique (décision 37).
 */
export function uesChoisies(): unknown[] {
  const courante = evaluation();
  const ues = [...((courante.ues || []) as unknown[])];
  (courante.ecCodes as unknown[]).forEach((code) => {
    const entree = entreeEc(code, courante.semestre);
    if (entree && !ues.includes(entree.ue)) ues.push(entree.ue);
  });
  return ues;
}

/** Une évaluation vierge, prête à composer. */
export function evaluationVierge(): Objet {
  const outils = historique();
  return outils.migF({
    id: outils.uid(),
    promoId: "",
    titre: "",
    livrables: [],
    semestre: outils.semSuggere() || "S1",
    classe: "",
    date: horloge().toISOString().slice(0, 10),
    prof: "",
    ues: [],
    ecCodes: [],
    compCode: "",
    consignes: "",
    ops: [],
    preset: ECHELLE_PAR_DEFAUT,
    niveaux: ECHELLE.niveaux.slice(),
    opts: { crit: true, obs: true },
    eleves: "",
    items: [],
    res: {},
  });
}

/** Ouvre l'éditeur sur une évaluation neuve, dont l'enseignant est « C'est moi » s'il est connu. */
export function nouvelleEvaluation(): void {
  etat.evaluation = evaluationVierge();
  const moi = enseignants().find((enseignant) => enseignant.id === donnees().moi);
  if (moi && moi.nom) {
    evaluation().profs = [moi.nom];
    evaluation().prof = moi.nom;
  }
  historique().save();
  ui().tab = "new";
  ui().step = 1;
  ui().sel = [];
  ui().eleve = "";
  historique().paintTabs();
  peindreFormulaire();
  peindreCompetencesChoisies();
  historique().paintLignes();
  historique().goStep(1);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Étape 1 entière : champs simples (`editeur/formulaire`) et autres blocs (`editeur/etape-evaluation`). */
export function peindreFormulaire(): void {
  etat.referentiel = historique().computeREF();
  peindreLivrablesChoisis();
  const courante = evaluation();
  remplirFormulaire(document, {
    titre: courante.titre as string,
    consignes: courante.consignes as string,
    distribution: (courante.distribPrev as string) || "",
    rendu: (courante.renduPrev as string) || "",
  });
  peindrePromotionsChoisies();
  peindreChampEtudiants();
  peindreEnseignantsChoisis();
  peindreSemestresProposes();
  peindreContexte();
  historique().paintSteps();
}

/** Étape 1, semestre : ceux de l'année de formation des promotions cochées, ou tous. */
export function peindreSemestresProposes(): void {
  const outils = historique();
  const annee = outils.anneeFiche();
  const courante = evaluation();
  peindreSemestres({
    semestre: courante.semestre as string,
    tousLesSemestres: SEMESTRES,
    autorises: annee ? outils.semsOfAnnee(annee) : (SEMESTRES),
    annee,
    classe: (courante.classe as string) || "",
    niveauDn: etat.modules.dn ? outils.dnLabel(courante.semestre) : "",
    nombreCompetences: outils.compsFor(courante.semestre).length,
    anneeScolaire: outils.anneeScolaire(),
    choisiALaMain: !!courante.semManuel,
    choisir: (semestre) => {
      evaluation().semManuel = true;
      historique().setSemestre(semestre);
      historique().save();
      peindreFormulaire();
      peindreCompetencesChoisies();
    },
    suivreLaDate: () => {
      evaluation().semManuel = false;
      historique().applySemDate();
      historique().save();
      peindreFormulaire();
      peindreCompetencesChoisies();
    },
  });
}

/**
 * Étape 1, promotions : celles en cours de toutes les mentions du diplôme
 * actif, celles de la répartition de service mises en avant par l'écran ;
 * même année de formation pour toutes (`domaine/cadre-evaluation`).
 */
export function peindrePromotionsChoisies(): void {
  const outils = historique();
  if (!Array.isArray(evaluation().classes)) outils.migF(evaluation());
  const scolaire = outils.anneeScolaire();
  const actif = diplomes().find((diplome) => diplome.id === donnees().activeDiplome) || {};
  const memeDiplome = diplomes()
    .filter((diplome) => norm(diplome.nom || "") === norm(actif.nom || ""))
    .map((diplome) => diplome.id);
  const rangDiplome = (id: unknown): number => diplomes().findIndex((diplome) => diplome.id === id);
  const promotions = etat.promotions.map((promotion) => outils.migPromoCohorte(promotion)).filter((promotion) => memeDiplome.includes(promotion.diplomeId));
  const datees = new Map<Objet, PromotionDatee>(
    promotions.map((promotion) => [
      promotion,
      { nom: promotion.nom as string, annee: outils.promoAnneeAt(promotion, scolaire), duree: outils.promoDuree(promotion), rangDiplome: rangDiplome(promotion.diplomeId) },
    ]),
  );
  const cochees = evaluation().classes as string[];
  const proposees = promotionsAProposer([...datees.values()], cochees);
  const bloquant = outils.dipBloquant(evaluation());
  peindrePromotions({
    promotions: proposees.noms.map((nom) => {
      const promotion = promotions.find((candidate) => candidate.nom === nom);
      const datee = promotion ? datees.get(promotion) : undefined;
      return {
        nom,
        libelle: outils.promoDisp(nom),
        annee: datee ? datee.annee : null,
        enCours: !!datee && estEnCours(datee),
        referentielValide: !promotion || outils.promoRefValide(promotion),
        mienne: !promotion || outils.promoVisible(promotion),
      };
    }),
    cochees: evaluation().classes as string[],
    anneeScolaire: scolaire,
    aucuneEnCours: proposees.aucuneEnCours,
    referentielNonValide: !!bloquant,
    allerValidation: () => {
      historique().allerValidation(bloquant);
    },
    basculer: (nom) => {
      basculerPromotion(nom);
    },
  });
}

export function peindreEnseignantsChoisis(): void {
  peindreEnseignants({
    evaluation: evaluation(),
    enseignants: enseignants()
      .map((enseignant) => enseignant.nom as string)
      .filter(Boolean),
    enregistrer: () => {
      historique().save();
    },
    apresChangement: () => {
      peindreContexte();
      historique().paintSteps();
    },
  });
}

/** EC que les enseignants choisis assurent pour les promotions cochées (`null` : pas de restriction). */
export function ecsDesEnseignants(): Set<string> | null {
  const outils = historique();
  const ids = ((evaluation().profs || []) as unknown[]).map((nom) => (enseignants().find((enseignant) => enseignant.nom === nom) || {}).id).filter(Boolean) as string[];
  const promotions = promotionsCochees();
  if (!ids.length || !promotions.length) return null;
  // Lues promotion par promotion, dans l'ordre de l'historique : l'année scolaire est relue à chacune.
  const repartitions: RepartitionDePromotion[] = promotions.map((promotion) => {
    const affectations = outils.affGet(promotion.id);
    return { affectations, ecs: outils.promoEcs(promotion, outils.anneeScolaire()) };
  });
  return ecsAssures(ids, repartitions);
}

/**
 * Coche ou décoche une promotion. Une promotion au référentiel non validé se
 * coche quand même : l'enseignant en est averti. Le diplôme actif suit la
 * première promotion cochée, et le semestre l'année de formation.
 */
export function basculerPromotion(nom: string): void {
  const outils = historique();
  const avant = (evaluation().classes || []) as string[];
  outils.setClasses(avant.includes(nom) ? avant.filter((autre) => autre !== nom) : [...avant, nom]);
  const valide = (candidate: string): boolean => {
    const promotion = promotionNommee(candidate);
    return !promotion || outils.promoRefValide(promotion);
  };
  const aAvertir = promotionsAAvertir(avant, (evaluation().classes || []) as string[], valide);
  if (aAvertir.length) {
    const promotion = promotionNommee(aAvertir[0]);
    const diplome = diplomes().find((candidat) => promotion && candidat.id === promotion.diplomeId);
    avertirReferentielNonValide(document, {
      promotions: aAvertir.map((candidate) => outils.promoDisp(candidate)),
      diplome: diplome ? outils.dipLabel(diplome) : "",
      allerValidation: () => {
        historique().allerValidation(promotion ? promotion.diplomeId : donnees().activeDiplome);
      },
    });
  }
  const premiere = (evaluation().classes as unknown[]).map(promotionNommee).find(Boolean);
  evaluation().promoId = premiere ? premiere.id : "";
  if (premiere && premiere.diplomeId && premiere.diplomeId !== donnees().activeDiplome && diplomes().some((diplome) => diplome.id === premiere.diplomeId)) {
    donnees().activeDiplome = premiere.diplomeId;
    outils.saveData(false);
  }
  const annee = outils.anneeFiche(),
    semestres = annee ? outils.semsOfAnnee(annee) : [];
  if (semestres.length && (!evaluation().semManuel || !semestres.includes(evaluation().semestre as string))) outils.setSemestre(outils.semSuggere() || semestres[0]);
  outils.save();
  peindreFormulaire();
  peindreCompetencesChoisies();
}

export function peindreLivrablesChoisis(): void {
  peindreLivrables({
    evaluation: evaluation(),
    livrablesEtablissement: historique().livrNames(),
    enregistrer: () => {
      historique().save();
    },
    apresChangement: () => {
      historique().paintSteps();
    },
    proposerAjoutEtablissement: (livrable) => {
      historique().askModal(`Ajouter « ${historique().esc(livrable)} » à la liste des livrables de Mon établissement, pour les prochaines évaluations ?`, () => {
        (donnees().livrables as Objet[]).push({ nom: livrable, type: "" });
        historique().saveData();
        historique().toast("« " + livrable + " » ajouté aux livrables.");
      });
    },
  });
}

/** Étape 1, UE et EC du semestre (`editeur/etape-evaluation`), limités à ceux des enseignants choisis s'il y en a. */
export function peindreContexte(): void {
  const outils = historique();
  const limite = ecsDesEnseignants();
  const courante = evaluation();
  peindreUesEtEcs({
    evaluation: courante,
    ecs: outils.ecsOfSem(courante.semestre).map((entree) => ({
      ec: entree.ec as string,
      nom: (entree.nom as string) || "",
      ue: entree.ue as string,
      couleur: (entree.couleur as string) || outils.ecColor(entree.ec),
    })),
    couleurUe: (ue) => historique().ueColor(ue),
    nomUe: (ue) => tidy(ue).replace(/^UE\s*/i, ""),
    ecsAffectes: limite ? [...limite] : null,
    enseignants: ((courante.profs || []) as string[]).join(", "),
    promotionChoisie: ((courante.classes || []) as unknown[]).length > 0,
    apresChangement: () => {
      historique().syncItemEcs();
      historique().save();
      peindreFormulaire();
      peindreCompetencesChoisies();
    },
  });
}

/** Numéro (à partir de 1) d'un regroupement dans l'évaluation en cours ; 0 s'il n'y est pas. */
export function rangRegroupement(id: unknown): number {
  return (evaluation().ops as Objet[]).findIndex((regroupement) => regroupement.id === id) + 1;
}

export function nettoyerLesRegroupements(): void {
  Object.assign(evaluation(), nettoyerRegroupements(evaluation()));
}

/** Étudiants d'une évaluation dont le rendu n'est pas renseigné (module Étudiants), 0 sans le module. */
export function rendusManquants(cible: Objet): number {
  if (!etat.modules.eleves) return 0;
  return etudiantsSansRendu(
    cible.res,
    historique()
      .studentsOf(cible)
      .map((etudiant) => etudiant.id),
  );
}

/**
 * Contexte de l'étape 2 (`editeur/competences`) ; la progression de la
 * promotion (ses autres évaluations enregistrées, hors celle-ci) est calculée
 * par `domaine/progression-competences`.
 */
export function contexteCompetences(): ContexteCompetences {
  const outils = historique();
  const courante = evaluation();
  const semestre = courante.semestre as string,
    disponibles = outils.compsFor(semestre);
  const limite = ecsDesEnseignants(),
    codes = (courante.ecCodes as unknown[]).length ? (courante.ecCodes as unknown[]) : limite ? [...limite] : [];
  const promotions = promotionsCochees();
  const progression = promotions.length
    ? progressionDesCompetences<EvaluationCitee>({
        codes: disponibles.map((competence) => competence.code as string),
        semestre,
        evaluations: autresEvaluationsDesPromotions(etat.evaluations, courante.id, promotions),
        idsEtudiants: promotions.flatMap((promotion) => outils.migPromo(promotion).liste as Objet[]).map((etudiant) => etudiant.id as string),
        estEvaluee: (citee) => outils.evalueeF(citee as Objet),
        moduleEleves: !!etat.modules.eleves,
      })
    : null;
  return {
    evaluation: courante,
    semestre,
    competences: disponibles.map((competence) => ({
      code: competence.code as string,
      libelle: competence.libelle as string,
      bloc: String(competence.bloc),
      nomBloc: outils.blocName(competence.bloc),
      dansLeCadre: outils.ecsOf(competence, semestre).some((entree) => codes.includes(entree.ec)),
    })),
    cadre: codes.length ? { enseignements: codes.length, unites: uesChoisies().length } : null,
    toutVoir: () => !!ui().allComps,
    basculerToutVoir: () => {
      ui().allComps = !ui().allComps;
    },
    recherche: () => norm((ui().q as string).trim()),
    normaliser: norm,
    progression,
    nomPromotions: outils.classesDisp(courante),
    statutDe: (citee) => LIBELLES_STATUT[historique().statutOf(citee as Objet)].toLowerCase(),
    filtre: () => (ui().pf as ReturnType<ContexteCompetences["filtre"]> | undefined) || "tout",
    retenirFiltre: (filtre) => {
      ui().pf = filtre;
    },
    ecsDe: (code) =>
      historique().itemEcs(
        (etat.referentiel.competences as Objet[]).find((competence) => competence.code === code),
        semestre,
      ),
    regroupementDe: (op) => ({
      numero: rangRegroupement(op),
      libelle: (((evaluation().ops as Objet[]).find((regroupement) => regroupement.id === op) || {}).libelle as string) || "",
    }),
    teinteBloc: etat.teinteBlocs,
    enregistrer: () => {
      historique().save();
    },
    apresChangement: () => {
      historique().paintSteps();
    },
  };
}

export function peindreCompetencesChoisies(): void {
  peindreCompetences(contexteCompetences());
}

/**
 * Publie ces fonctions sous leurs anciens noms, pour le fichier historique et
 * les autres modules repris. `maintenant` date une évaluation vierge.
 */
export function publierEditeurEtape1(cible: Fenetre, maintenant: () => Date): void {
  fenetre = cible;
  horloge = maintenant;
  Object.assign(cible, {
    paintEleveField: peindreChampEtudiants,
    ecEntry: entreeEc,
    uesSelected: uesChoisies,
    ecsOfUe: ecsDeLUe,
    vierge: evaluationVierge,
    nouvelleFiche: nouvelleEvaluation,
    paintForm: peindreFormulaire,
    paintSems: peindreSemestresProposes,
    paintClasse: peindrePromotionsChoisies,
    paintProf: peindreEnseignantsChoisis,
    ecsAffectes: ecsDesEnseignants,
    toggleClasse: basculerPromotion,
    paintLivrables: peindreLivrablesChoisis,
    paintContexte: peindreContexte,
    opIndex: rangRegroupement,
    cleanOps: nettoyerLesRegroupements,
    rendusManquants,
    contexteCompetences,
    paintPick: peindreCompetencesChoisies,
  });
}
