// SPDX-License-Identifier: CECILL-2.1
/**
 * L'exemple, tel que l'interface l'installe : trois évaluations détaillées,
 * puis le jeu étendu (quatre mentions, promotions de chaque année, dizaines
 * d'évaluations avec résultats), et la validation du référentiel que
 * l'exemple apporte lui-même.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom ; le contenu et
 * les tirages de l'exemple sont dans `domaine/exemple`. L'ordre des tirages
 * (identifiants, hasard) est celui de l'interface historique : le changer
 * changerait l'exemple.
 */
import { SEMESTRES } from "../domaine/constituer";
import { ECHELLE } from "../domaine/evaluation";
import * as EXEMPLE from "../domaine/exemple";
import { absorber, materialiser, referentielDe } from "../domaine/modele-donnees";
import { nettoyerDiplomesVierges } from "../domaine/diplome-vierge";
import { enregistrer, peindreEtapes, peindreEtudiants, peindreLignes } from "./editeur";
import { repartitionDe, ecsDeLaPromotion } from "./etablissement";
import { etat, type Objet } from "./etat";
import { peindreEvaluations } from "./evaluations";
import { anneeScolaire, debutAnneeScolaire, enregistrerPromotions, normaliserPromotion, rangSemestre } from "./promotions-calendrier";
import { anneeScolaireDe } from "../domaine/etablissement";
import { diplomeAReferentielValide, referentielAffiche, versionsDe } from "./versions-referentiel";

/** Ce que le module appelle encore dans le fichier historique. */
interface FonctionsHistoriques {
  livrNames(): string[];
  newId(prefixe: string): string;
  addMention(source: unknown, nom: unknown): Objet;
  migF(evaluation: Objet): Objet;
  nouvellePersonne(id: string, ligne: string): Objet;
  syncListe(promotion: Objet, texte: string): void;
  migPromo(promotion: Objet): Objet;
  uid(): string;
  compsFor(semestre: string): Objet[];
  itemEcs(competence: unknown, semestre: unknown): string[];
  studentsOf(evaluation: Objet): { id: string }[];
  lignesOf(evaluation: Objet): unknown[];
  ligKey(ligne: unknown): string;
  persistData(): void;
  saveData(redessiner?: boolean): void;
  toast(message: string): void;
  paintTabs(): void;
  paintForm(): void;
  paintPick(): void;
}

type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};
let ecrire: (cle: string, valeur: string) => void = () => undefined;
let lire: (cle: string) => string | null = () => null;
let installerReferentiel: () => Promise<string | null> = () => Promise.resolve(null);

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function liste(valeur: unknown): Objet[] {
  return Array.isArray(valeur) ? (valeur as Objet[]) : [];
}

function ecrireEntree(cle: string, valeur: unknown): void {
  try {
    ecrire(cle, JSON.stringify(valeur));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
}

function lireEntree(cle: string): unknown {
  try {
    const valeur = lire(cle);
    return valeur ? (JSON.parse(valeur) as unknown) : null;
  } catch {
    return null;
  }
}

const SEMS: readonly string[] = SEMESTRES;
const NIVEAUX: string[] = [...ECHELLE.niveaux];

/** Résultats détaillés tirés pour une évaluation de l'exemple. */
export function remplirResultats(evaluation: Objet, graine: number, part: number): Objet {
  evaluation.res = EXEMPLE.resultatsDetailles(
    historique()
      .studentsOf(evaluation)
      .map((etudiant) => etudiant.id),
    historique()
      .lignesOf(evaluation)
      .map((ligne) => historique().ligKey(ligne)),
    (Array.isArray(evaluation.niveaux) ? evaluation.niveaux.length : 0) || 4,
    graine,
    part,
  );
  return evaluation;
}

export function contexteDetaille(): Parameters<typeof EXEMPLE.evaluationMobilier>[0] {
  return {
    competence: (code: unknown) => liste(etat.referentiel.competences).find((competence) => competence.code === code),
    ecsRetenus: (competence: unknown, semestre: unknown) => historique().itemEcs(competence, semestre),
    nouvelIdentifiant: () => historique().uid(),
    maintenant: Date.now(),
    niveaux: NIVEAUX,
  } as unknown as Parameters<typeof EXEMPLE.evaluationMobilier>[0];
}

/** Jeu d'exemple étendu : quatre mentions, des promotions de chaque année (et une sortie), des dizaines d'évaluations avec résultats. */
export function jeuEtendu(): { fiches: Objet[]; nPr: number; nEl: number; nM: number } {
  const donnees = etat.donnees;
  const debutAnnee = debutAnneeScolaire(anneeScolaire(new Date())) ?? 0;
  const hasard = EXEMPLE.suiteEtendue(EXEMPLE.GRAINE_ETENDUE);
  const diplomes = liste(donnees.diplomes);
  const base = diplomes.find((diplome) => diplome.id === donnees.activeDiplome) as Objet;
  const actif = base.id;
  const mentions: [Objet, unknown][] = [[base, EXEMPLE.THEME_MENTION_REFERENTIEL]];
  EXEMPLE.MENTIONS_EXEMPLE.forEach(([mention, code, theme]) => {
    let diplome = liste(donnees.diplomes).find((candidat) => candidat.nom === base.nom && candidat.mention === mention);
    if (!diplome) {
      diplome = historique().addMention(base.id, base.nom);
      diplome.mention = mention;
      diplome.code = code;
      diplome.duree = Number(base.duree) || 3;
    }
    mentions.push([diplome, theme]);
  });
  historique().saveData(false);
  const professeurs = EXEMPLE.ENSEIGNANTS_EXEMPLE;
  const enseignants = liste(donnees.enseignants);
  professeurs.forEach((nom) => {
    if (!enseignants.some((enseignant) => enseignant.nom === nom)) enseignants.push(historique().nouvellePersonne(historique().uid(), nom));
  });
  if (!donnees.moi) donnees.moi = (enseignants.find((enseignant) => enseignant.nom === professeurs[0]) ?? {}).id;
  const livrables = historique().livrNames().length ? historique().livrNames() : EXEMPLE.LIVRABLES_PAR_DEFAUT;
  const fiches: Objet[] = [];
  let nombreEtudiants = 0;
  let nombrePromotions = 0;
  mentions.forEach(([diplome, theme]) => {
    donnees.activeDiplome = diplome.id;
    historique().saveData(false);
    const duree = Number(diplome.duree) || 3;
    // k : années depuis l'entrée ; k = durée : promotion sortie.
    for (let annees = 0; annees <= duree; annees++) {
      const debut = debutAnnee - annees;
      let promotion = etat.promotions.find((candidate) => normaliserPromotion(candidate).diplomeId === diplome.id && candidate.debut === debut);
      if (!promotion) {
        promotion = { id: historique().uid(), debut, diplomeId: diplome.id, eleves: "", liste: [] };
        etat.promotions.push(promotion);
      }
      normaliserPromotion(promotion);
      nombrePromotions++;
      {
        const rangMention = mentions.findIndex((candidate) => candidate[0] === diplome);
        // L'enseignant « moi » n'intervient qu'en Objet et en Espace.
        const ids = enseignants.filter((enseignant) => professeurs.includes(enseignant.nom as string) && (rangMention < 2 || enseignant.nom !== professeurs[0])).map((enseignant) => enseignant.id);
        // Une répartition par année scolaire vécue par la promotion (historique).
        for (let annee = debut; annee <= debutAnnee && annee < debut + duree; annee++) {
          const scolaire = anneeScolaireDe(annee);
          const repartition = repartitionDe(promotion.id as string, scolaire);
          ecsDeLaPromotion(promotion, scolaire).forEach((ec, rang) => {
            if (!(repartition[ec.id] || []).length) repartition[ec.id] = EXEMPLE.enseignantsDeLEc(hasard, rang, ids as string[]);
          });
        }
      }
      const inscrits = liste(promotion.liste);
      if (!inscrits.length || inscrits.every((etudiant) => EXEMPLE.estNomExemple(etudiant.nom as string))) {
        const deja = inscrits.length;
        const noms = EXEMPLE.nomsDePromotion(hasard, deja);
        // Promotion d'exemple déjà là : on garde les étudiants (et leurs résultats), seuls les noms changent.
        if (deja) {
          inscrits.forEach((etudiant, rang) => (etudiant.nom = noms[rang]));
          promotion.eleves = noms.join("\n");
        } else historique().syncListe(promotion, noms.join("\n"));
      }
      const etudiants = liste(historique().migPromo(promotion).liste);
      nombreEtudiants += etudiants.length;
      const semestresOuverts = EXEMPLE.semestresOuverts(annees, duree, rangSemestre(new Date()));
      for (let rang = 0; rang < semestresOuverts && rang < SEMS.length; rang++) {
        const semestre = SEMS[rang] as string;
        const disponibles = historique().compsFor(semestre);
        if (!disponibles.length) continue;
        fiches.push(
          ...(EXEMPLE.evaluationsDuSemestre({
            hasard,
            rang,
            semestre,
            competences: disponibles,
            ecsRetenus: (competence: unknown, sem: unknown) => historique().itemEcs(competence, sem),
            livrables,
            theme,
            promotion: { id: promotion.id, nom: promotion.nom },
            debut,
            etudiants: etudiants.map((etudiant) => etudiant.id),
            maintenant: Date.now(),
            nouvelIdentifiant: () => historique().uid(),
            preset: "maitrise",
            niveaux: NIVEAUX,
          } as never) as unknown as Objet[]),
        );
      }
    }
  });
  donnees.activeDiplome = actif;
  historique().saveData(false);
  enregistrerPromotions();
  historique().persistData();
  fiches.sort((une, autre) => String(autre.date).localeCompare(String(une.date)));
  return { fiches, nPr: nombrePromotions, nEl: nombreEtudiants, nM: mentions.length };
}

/** Valide, pour la démonstration, le référentiel des mentions que l'exemple a installées lui-même. */
export function validerExemple(diplomes: string[]): void {
  const nouvelIdentifiant = (prefixe: string): string => historique().newId(prefixe);
  absorber(etat.donnees, nouvelIdentifiant);
  const jour = new Date().toISOString().slice(0, 10);
  diplomes.forEach((diplome) => {
    if (diplomeAReferentielValide(diplome)) return;
    const referentiel = referentielDe(etat.donnees, diplome);
    const version: Objet = {
      id: nouvelIdentifiant("v"),
      date: jour,
      note: "Exemple",
      attestation: jour,
      snap: JSON.parse(JSON.stringify({ ues: referentiel.ues, ecs: referentiel.ecs, blocs: referentiel.blocs, competences: referentiel.competences })) as unknown,
    };
    versionsDe(diplome).unshift(version);
    etat.donnees.valide = Object.assign({}, etat.donnees.valide ?? {});
    (etat.donnees.valide as Objet)[diplome] = version.id;
  });
  historique().persistData();
  etat.referentiel = referentielAffiche();
}

/**
 * Charge l'exemple. Sans référentiel, il installe celui du DN MADE mention
 * Objet livré avec DNMAX, comme à la bienvenue ; le reste de l'établissement
 * est gardé.
 */
export async function chargerExemple(): Promise<void> {
  const referentielApporte = !referentielDe(etat.donnees, etat.donnees.activeDiplome as string).competences.length;
  if (referentielApporte) {
    historique().persistData();
    let diplome: string | null;
    try {
      diplome = await installerReferentiel();
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : erreur;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- message tel quel, comme avant
      historique().toast(`Exemple : ${message || erreur}`);
      return;
    }
    etat.donnees = lireEntree("dnmade.data") as Objet;
    materialiser(etat.donnees);
    if (diplome && liste(etat.donnees.diplomes).some((candidat) => candidat.id === diplome)) etat.donnees.activeDiplome = diplome;
    const nettoyage = nettoyerDiplomesVierges(etat.donnees, etat.promotions) as { modifie?: boolean; donnees?: Objet } | null;
    if (nettoyage?.modifie) {
      etat.donnees = nettoyage.donnees as Objet;
      materialiser(etat.donnees);
    }
    etat.referentiel = referentielAffiche();
    historique().persistData();
  }
  const diplomesAvant = new Set(referentielApporte ? [] : liste(etat.donnees.diplomes).map((diplome) => diplome.id));
  const enseignants = liste(etat.donnees.enseignants);
  EXEMPLE.ENSEIGNANTS_DETAILLES.forEach(([nom, discipline]) => {
    if (!enseignants.some((enseignant) => enseignant.nom === nom)) enseignants.push({ ...historique().nouvellePersonne(historique().uid(), nom), discipline });
  });
  historique().persistData();
  const debutAnnee = debutAnneeScolaire(anneeScolaire(new Date())) ?? 0;
  const promotionDeLAnnee = (annee: number, noms: readonly string[]): Objet => {
    const debut = debutAnnee - annee + 1;
    let promotion = etat.promotions.find((candidate) => normaliserPromotion(candidate).diplomeId === etat.donnees.activeDiplome && candidate.debut === debut);
    if (!promotion) {
      promotion = { id: historique().uid(), debut, diplomeId: etat.donnees.activeDiplome, eleves: "", liste: [] };
      etat.promotions.push(promotion);
    }
    normaliserPromotion(promotion);
    historique().syncListe(promotion, noms.join("\n"));
    return promotion;
  };
  const deuxieme = promotionDeLAnnee(2, EXEMPLE.ETUDIANTS_DEUXIEME_ANNEE);
  const premiere = promotionDeLAnnee(1, EXEMPLE.ETUDIANTS_PREMIERE_ANNEE);
  enregistrerPromotions();
  const rattacher = (evaluation: Objet, promotion: Objet): Objet => {
    evaluation.promoId = promotion.id;
    evaluation.classe = promotion.nom;
    evaluation.classes = [promotion.nom];
    historique().migF(evaluation);
    return evaluation;
  };
  const mobilier = rattacher(EXEMPLE.evaluationMobilier(contexteDetaille()), deuxieme);
  remplirResultats(mobilier, 11, 3);
  const lecture = rattacher(EXEMPLE.evaluationLecture(contexteDetaille()), premiere);
  remplirResultats(lecture, 29, 0);
  const soutenance = rattacher(EXEMPLE.evaluationSoutenance(contexteDetaille()), deuxieme);
  remplirResultats(soutenance, 47, 8);
  const titres = [mobilier.titre, lecture.titre, soutenance.titre];
  const etendu = jeuEtendu();
  // Le référentiel que l'exemple installe lui-même est validé pour la démonstration ; celui de l'enseignant
  // (et les mentions que l'exemple en dérive) reste à valider par lui.
  if (referentielApporte) validerExemple(liste(etat.donnees.diplomes).filter((diplome) => !diplomesAvant.has(diplome.id)).map((diplome) => diplome.id as string));
  etat.evaluations = [
    structuredClone(mobilier),
    structuredClone(soutenance),
    structuredClone(lecture),
    ...etendu.fiches,
    ...etat.evaluations.filter((evaluation) => !titres.includes(evaluation.titre) && !evaluation.demo),
  ];
  ecrireEntree("dnmade.fiches", etat.evaluations);
  etat.evaluation = historique().migF(mobilier);
  enregistrer();
  let active = "";
  if (!etat.modules.eleves) {
    etat.modules.eleves = true;
    ecrireEntree("dnmade.modules", etat.modules);
    active = " · module Étudiants activé";
  }
  const ui = etat.ui;
  ui.step = 4;
  ui.sel = [];
  ui.emode = "grille";
  ui.eleve = "";
  ui.tab = "saved";
  historique().paintTabs();
  historique().paintForm();
  historique().paintPick();
  peindreLignes();
  peindreEvaluations();
  peindreEtapes();
  peindreEtudiants();
  historique().toast(
    `Exemple chargé : ${String(etendu.nM)} mentions, ${String(etendu.nPr)} promotions, ${String(etendu.fiches.length + 3)} évaluations, résultats saisis${active}.`,
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Publie ces fonctions sous leurs anciens noms, pour le fichier historique.
 * `installer` installe le référentiel livré avec l'exemple et rend l'identifiant de son diplôme.
 */
export function publierExemple(
  cible: Fenetre,
  ecrireStockage: (cle: string, valeur: string) => void,
  lireStockage: (cle: string) => string | null,
  installer: () => Promise<string | null>,
): void {
  fenetre = cible;
  ecrire = ecrireStockage;
  lire = lireStockage;
  installerReferentiel = installer;
  Object.assign(cible, {
    fillRes: remplirResultats,
    contexteDetaille,
    demoMass: jeuEtendu,
    validerExemple,
    loadDemo: chargerExemple,
  });
}
