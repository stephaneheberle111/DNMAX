// SPDX-License-Identifier: CECILL-2.1
/**
 * Progression, telle que l'interface la prépare : promotions suivies,
 * semestre affiché, vue « Promotion » (ce qui reste à évaluer au semestre)
 * et vue « Étudiant » (module Étudiants).
 *
 * Repris du fichier historique (décision 38) ; les règles sont dans
 * `domaine/progression` et `domaine/vue-progression`.
 */
import { SEMESTRES } from "../domaine/constituer";
import { anneeScolaireDe } from "../domaine/etablissement";
import { ECHELLE, RANG_ACQUIS } from "../domaine/evaluation";
import * as calculs from "../domaine/progression";
import { NIVEAUX_ACQUISITION } from "../domaine/regles-affichees";
import { rafraichirListe } from "../domaine/promotions";
import { statutRendu } from "../domaine/saisie-resultats";
import { couleurNiveau, encreNiveau } from "../domaine/teintes-niveaux";
import { promotionsSuivies, semestresProgression } from "../domaine/vue-progression";
import { creer } from "../ecran-echange";
import { peindreProgressionEtudiant } from "../progression/etudiant";
import { peindreProgressionPromotion } from "../progression/promotion";
import { ecsDeLaPromotion, aEuLaPromotionDonnee, repartitionLue } from "./etablissement";
import { dipLabel, saveData } from "./donnees";
import { etat, type Objet } from "./etat";
import { compsFor, ligKey, lignesOf, studentsOf as etudiantsDe } from "./evaluation-courante";
import { estEvalueeDonnee, saisieDansDnmax } from "./evaluations";
import { anneeDeFormation, anneeScolaire, dureePromotion, nomCourt, normaliserPromotion, rangSemestre } from "./promotions-calendrier";

let lire: (cle: string) => string | null = () => null;

const SEMS: readonly string[] = SEMESTRES;

function liste(valeur: unknown): Objet[] {
  return Array.isArray(valeur) ? (valeur as Objet[]) : [];
}

function progression(): Objet {
  etat.ui.prog = etat.ui.prog || {};
  return etat.ui.prog as Objet;
}

function anneeDuSemestre(semestre: unknown): number {
  return Math.floor(Math.max(0, SEMS.indexOf(semestre as string)) / 2) + 1;
}

function nomDeBloc(numero: string): string {
  return ((liste(etat.referentiel.blocs).find((bloc) => String(bloc.num) === numero) ?? {}).nom as string) || "";
}

function lireReglages(): Objet {
  try {
    const valeur = lire("dnmade.reglages");
    return valeur ? (JSON.parse(valeur) as Objet) : {};
  } catch {
    return {};
  }
}

/** Niveau d'acquisition visé pour une année : celui du référentiel, sinon le nom d'usage, sinon « Année n ». */
export function palierDeLAnnee(annee: number | string): string {
  const meta = (etat.referentiel.meta ?? {}) as Objet;
  const niveau = liste(meta.niveaux).find((candidat) => Number(candidat.annee) === Number(annee));
  return (niveau?.label as string) || NIVEAUX_ACQUISITION[Number(annee) - 1] || `Année ${String(annee)}`;
}

/** Progression : la promotion choisie parmi celles suivies, puis la vue « Promotion » ou « Étudiant ». */
export function peindreProgression(): void {
  const hote = document.getElementById("progPane");
  if (!hote) return;
  const choix = progression();
  const donnees = etat.donnees;
  const scolaire = anneeScolaire(new Date());
  const enseignants = liste(donnees.enseignants);
  const diplomes = liste(donnees.diplomes);
  // Avec « C'est moi » : seulement les promotions de ma répartition de service (en cours ou terminées) ; sinon, celles en cours.
  const moi = enseignants.find((enseignant) => enseignant.id === donnees.moi);
  const mienne = (promotion: Objet): boolean => !!moi && aEuLaPromotionDonnee(promotion.id, moi.id);
  const rangDiplome = (id: unknown): number => diplomes.findIndex((diplome) => diplome.id === id);
  const suivies = promotionsSuivies(
    etat.promotions
      .map(normaliserPromotion)
      .filter((promotion) => diplomes.some((diplome) => diplome.id === promotion.diplomeId))
      .map((promotion) => ({
        promotion,
        annee: anneeDeFormation(promotion, scolaire),
        duree: dureePromotion(promotion),
        rangDiplome: rangDiplome(promotion.diplomeId),
        debut: promotion.debut as number,
        mienne: mienne(promotion),
      })),
    !!moi,
  );
  const promotions = suivies.promotions;
  if (!promotions.length) {
    const meta = (etat.referentiel.meta ?? {}) as Objet;
    const panneau = creer("div", "panel");
    panneau.append(
      creer(
        "div",
        "empty",
        `Aucune promotion en cours pour ${(meta.diplome as string) || "cette mention"} en ${scolaire}.\n    Créez-la dans Mon établissement > Promotions.`,
      ),
    );
    hote.replaceChildren(panneau);
    return;
  }
  const promotion = promotions.find((candidate) => candidate.id === choix.promo) ?? promotions.find((candidate) => candidate.diplomeId === donnees.activeDiplome) ?? promotions[0];
  if (!promotion) return;
  choix.promo = promotion.id;
  // La progression lit le référentiel de la mention de la promotion affichée.
  if (promotion.diplomeId !== donnees.activeDiplome) {
    donnees.activeDiplome = promotion.diplomeId;
    saveData(false);
  }
  if (choix.t == null && moi && mienne(promotion)) choix.t = [moi.id];
  const semestres = semestresProgression(anneeDeFormation(promotion, scolaire), dureePromotion(promotion), rangSemestre(new Date()));
  const courant = semestres.courant;
  const semestre = semestres.semestres.includes(choix.sem as string) ? (choix.sem as string) : courant;
  choix.sem = semestre;
  const filtre = (choix.f as string) || "tout";
  const etudiants = liste(rafraichirListe(promotion).liste) as unknown as { id: string; nom: string }[];
  const evaluations = etat.evaluations.filter(
    (evaluation) => !evaluation.brouillon && ((Array.isArray(evaluation.classes) ? (evaluation.classes as unknown[]) : []).includes(promotion.nom) || evaluation.promoId === promotion.id),
  );
  // Filtres communs aux deux vues.
  const diplomesSuivis = [...new Set(promotions.map((candidate) => candidate.diplomeId))];
  const option = (candidate: Objet): { id: unknown; libelle: string } => ({
    id: candidate.id,
    libelle: (nomCourt(candidate) ? `${nomCourt(candidate)} — ` : "") + ((candidate.nom as string) || ""),
  });
  const communs = {
    groupes:
      diplomesSuivis.length > 1
        ? diplomesSuivis.map((diplome) => ({
            diplome: dipLabel(diplomes.find((candidat) => candidat.id === diplome) ?? {}),
            promotions: promotions.filter((candidate) => candidate.diplomeId === diplome).map(option),
          }))
        : [{ diplome: null, promotions: promotions.map(option) }],
    promotion: promotion.id,
    nomPromotion: promotion.nom,
    semestres: semestres.semestres,
    semestre,
    courant,
    choisir: (cle: string, valeur: unknown) => {
      if (cle === "promo") {
        choix.promo = valeur;
        choix.sem = "";
        choix.t = null;
        choix.el = "";
      } else if (cle === "sem") choix.sem = valeur;
      else if (cle === "f") choix.f = valeur;
      else if (cle === "t") choix.t = valeur ? [valeur] : [];
      else if (cle === "el") choix.el = valeur;
      peindreProgression();
    },
    choisirVue: (vue: unknown) => {
      choix.view = vue;
      peindreProgression();
    },
  };
  if (etat.modules.eleves && choix.view === "eleve") {
    peindreVueEtudiant(hote, { promotion, semestre, etudiants, evaluations, communs });
    return;
  }
  // Avec « C'est moi » : uniquement mes enseignements (pas de choix d'un autre enseignant).
  const anneeDeLaPromotion = anneeDuSemestre(semestre);
  const scolaireDuSemestre = anneeScolaireDe(Number(promotion.debut) + anneeDeLaPromotion - 1);
  const repartitionDuSemestre = repartitionLue(promotion.id as string, scolaireDuSemestre);
  const repartition = Object.keys(repartitionDuSemestre).length ? repartitionDuSemestre : repartitionLue(promotion.id as string);
  const assure = (id: unknown): boolean => Object.values(repartition).some((liste_) => (Array.isArray(liste_) ? (liste_ as unknown[]) : []).includes(id));
  const choisis = moi ? (assure(moi.id) ? [moi.id] : []) : liste(choix.t).filter((id) => enseignants.some((enseignant) => enseignant.id === id));
  let attendues = compsFor(semestre);
  const disponibles = moi ? [] : enseignants.filter((enseignant) => assure(enseignant.id));
  if (choisis.length) {
    const scolaireChoisie = `${String(Number(promotion.debut) + anneeDeLaPromotion - 1)}-${String(Number(promotion.debut) + anneeDeLaPromotion)}`;
    const codes = new Set(
      ecsDeLaPromotion(promotion, scolaireChoisie)
        .filter((ec) => (repartition[ec.id] || []).some((id) => choisis.includes(id)))
        .map((ec) => ec.code),
    );
    attendues = attendues.filter((competence) => liste(competence.ecs).some((ec) => ec.sem === semestre && codes.has(ec.ec as string)));
  }
  const niveaux = [...ECHELLE.niveaux];
  const parCompetence = calculs.progressionPromotion({
    codes: attendues.map((competence) => competence.code as string),
    semestre,
    evaluations: evaluations,
    idsEtudiants: etudiants.map((etudiant) => etudiant.id),
    nombreNiveaux: niveaux.length,
    estEvaluee: estEvalueeDonnee,
    moduleEleves: !!etat.modules.eleves,
  });
  const lignes = attendues.map((competence) => {
    const calcul = parCompetence[competence.code as string] as unknown as Objet;
    const nomsEc = [...new Set(liste(competence.ecs).filter((ec) => ec.sem === semestre).map((ec) => ec.nom || ec.ec))].join(", ");
    return { competence, calcul, nomsEc };
  });
  peindreProgressionPromotion(hote, {
    ...communs,
    enseignants: disponibles.map((enseignant) => ({ id: enseignant.id, nom: enseignant.nom })),
    enseignantsChoisis: choisis,
    nomsChoisis: choisis.map((id) => (enseignants.find((enseignant) => enseignant.id === id) ?? {}).nom).join(", "),
    filtre,
    lignes: lignes.map(({ competence, calcul, nomsEc }) => ({
      c: { code: competence.code, libelle: competence.libelle, bloc: competence.bloc },
      inSem: liste(calcul.auSemestre).map((evaluation) => ({ titre: evaluation.titre || "", date: evaluation.date })),
      cover: liste(calcul.partout).map((evaluation) => ({ semestre: evaluation.semestre || "", titre: evaluation.titre || "" })),
      done: calcul.faits,
      dist: calcul.repartition,
      ecn: nomsEc,
      state: calcul.etat,
    })),
    moduleEleves: !!etat.modules.eleves,
    etudiants: etudiants.length,
    evaluationsAuSemestre: evaluations.filter((evaluation) => evaluation.semestre === semestre).length,
    niveaux,
    couleurNiveau,
    nomBloc: nomDeBloc,
    vueEtudiant: choix.view === "eleve",
  } as never);
}

interface VueEtudiant {
  promotion: Objet;
  semestre: string;
  etudiants: { id: string; nom: string }[];
  evaluations: Objet[];
  communs: Objet;
}

/**
 * Vue « Étudiant » (module Étudiants) : où l'étudiant en est dans les
 * évaluations du semestre, comparé aux autres, et ce qu'il a acquis jusqu'à
 * ce semestre (dernier niveau connu, niveau d'acquisition atteint).
 */
export function peindreVueEtudiant(hote: HTMLElement, vue: VueEtudiant): void {
  const { promotion, semestre, etudiants, evaluations, communs } = vue;
  const choix = progression();
  const niveaux = [...ECHELLE.niveaux];
  const nombreNiveaux = niveaux.length;
  const etudiant = etudiants.find((candidat) => candidat.id === choix.el) ?? etudiants[0];
  if (etudiant) choix.el = etudiant.id;
  const studentsOf = (evaluation: Objet): { id: string }[] => etudiantsDe(evaluation);
  const dateDe = (evaluation: Objet): string => calculs.dateDeLEvaluation(evaluation);
  const vivantes = evaluations.filter((evaluation) => !evaluation.annulee && etudiant && studentsOf(evaluation).some((candidat) => candidat.id === etudiant.id));
  // A. Avancement du semestre.
  const avancement = vivantes
    .filter((evaluation) => evaluation.semestre === semestre)
    .sort((une, autre) => dateDe(une).localeCompare(dateDe(autre)))
    .map((evaluation) => {
      const cles = lignesOf(evaluation).map((ligne) => ligKey(ligne));
      const resultat = ((((evaluation.res || {}) as Objet)[etudiant?.id ?? ""] as Objet | undefined) || {});
      const saisie = saisieDansDnmax(evaluation);
      const etatEtudiant = calculs.etatEtudiantDansEvaluation(resultat, cles, saisie.any);
      return {
        etat: etatEtudiant.etat,
        titre: evaluation.titre || "",
        distribPrev: evaluation.distribPrev || "",
        renduPrev: evaluation.renduPrev || "",
        saisies: etatEtudiant.lignesSaisies,
        lignes: cles.length,
        sansLignes: !!(resultat.nr || resultat.disp),
        promoSaisis: saisie.full,
        promoTotal: saisie.tot,
      };
    });
  // Rendus, non-rendus et dispenses de l'étudiant au semestre, comparés à la moyenne de la promotion.
  const auSemestre = evaluations.filter((evaluation) => !evaluation.annulee && evaluation.semestre === semestre);
  const compter = (candidat: { id: string }): Record<string, number> => {
    const compte: Record<string, number> = { tot: 0, rendu: 0, nr: 0, disp: 0 };
    auSemestre.forEach((evaluation) => {
      if (!studentsOf(evaluation).some((autre) => autre.id === candidat.id)) return;
      compte.tot = (compte.tot ?? 0) + 1;
      const statut = statutRendu(((evaluation.res || {}) as Objet)[candidat.id]);
      if (compte[statut] != null) compte[statut] = (compte[statut] ?? 0) + 1;
    });
    return compte;
  };
  const lesSiens = etudiant ? compter(etudiant) : { tot: 0, rendu: 0, nr: 0, disp: 0 };
  const moyenne = (cle: string): number => (etudiants.length ? etudiants.reduce((total, candidat) => total + (compter(candidat)[cle] ?? 0), 0) / etudiants.length : 0);
  // B. Acquisition des compétences, cumulée jusqu'au semestre affiché.
  const jusquAuSemestre = (evaluation: Objet): boolean => SEMS.indexOf(evaluation.semestre as string) <= SEMS.indexOf(semestre);
  const parcours = calculs.trajectoires(vivantes.filter(jusquAuSemestre), etudiant ? etudiant.id : "", nombreNiveaux) as unknown as Record<string, { evaluation: Objet; niveau: number; semestre: string }[]>;
  // Niveau de la classe sur chaque compétence : dernier niveau de chaque étudiant, jusqu'au semestre affiché.
  const derniers = (candidat: { id: string }): Record<string, number> =>
    calculs.derniersNiveaux(
      evaluations.filter((evaluation) => !evaluation.annulee && jusquAuSemestre(evaluation) && studentsOf(evaluation).some((autre) => autre.id === candidat.id)),
      candidat.id,
      nombreNiveaux,
    );
  const classe = etudiants.map(derniers);
  // La comparaison à la promotion se masque dans Paramètres > Règles d'évaluation.
  const masquer = !!lireReglages().masquerComparaison;
  const competences = Object.entries(parcours).map(([code, etapes]) => {
    const competence = liste(etat.referentiel.competences).find((candidate) => candidate.code === code) ?? { code, libelle: code, bloc: "" };
    const derniere = etapes[etapes.length - 1] as { niveau: number };
    return {
      code: String(competence.code),
      libelle: (competence.libelle as string) || "",
       
      bloc: String(competence.bloc),
      trajectoire: etapes.map((etape) => ({
        titre: etape.evaluation.titre || "",
        semestre: etape.evaluation.semestre || "",
        niveau: etape.niveau,
        annee: anneeDuSemestre(etape.semestre),
      })),
      position: masquer ? null : calculs.positionDansLaClasse(derniere.niveau, classe.map((niveauxClasse) => niveauxClasse[competence.code as string])) || null,
    };
  });
  peindreProgressionEtudiant(hote, {
    ...communs,
    etudiants: etudiants.map((candidat) => ({ id: candidat.id, nom: candidat.nom })),
    etudiant: etudiant ? etudiant.id : null,
    promotionCourte: nomCourt(promotion) || promotion.nom,
    avancement,
    rendus: lesSiens,
    moyennes: { rendu: moyenne("rendu"), nr: moyenne("nr"), disp: moyenne("disp") },
    competences,
    niveaux,
    seuil: RANG_ACQUIS,
    couleurNiveau,
    encreNiveau,
    nomBloc: nomDeBloc,
    paliers: etat.modules.dn ? [1, 2, 3].map(palierDeLAnnee) : null,
    anneeCourante: anneeDuSemestre(semestre),
    choisirEtudiant: (id: unknown) => {
      choix.el = id;
      peindreProgression();
    },
  } as never);
}

/** Donne au module la lecture des réglages (comparaison masquée). */
export function brancherProgression(lireStockage: (cle: string) => string | null): void {
  lire = lireStockage;
}
