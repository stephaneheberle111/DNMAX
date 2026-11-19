// SPDX-License-Identifier: CECILL-2.1
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { convertirEnOctets, type ContenuFichier } from "../domaine/contenu-fichier";
import { estObjet, lireDonneesEtablissementDe, lirePromotion } from "../domaine/echange/modele";
import { estCadreVierge, nettoyerDiplomesVierges } from "../domaine/diplome-vierge";
import * as zoomCarte from "../domaine/zoom-carte";
import { renumeroterBloc } from "../domaine/numero-bloc";
import * as saisieResultats from "../domaine/saisie-resultats";
import * as reglesEvaluation from "../domaine/evaluation";
import * as personnes from "../domaine/personnes";
import * as promotions from "../domaine/promotions";
import * as diplomes from "../domaine/diplomes";
import * as constituer from "../domaine/constituer";
import * as filtresEvaluations from "../domaine/filtres-evaluations";
import { peindreFiltres } from "../evaluations/filtres";
import { peindreListe } from "../evaluations/liste";
import { apresDessinListe, ouvrirActions } from "../evaluations/actions";
import * as actionsEvaluation from "../domaine/actions-evaluation";
import { peindreEtapeBlocs, peindreEtapeEcs, peindreEtapeUes } from "../referentiel/etapes";
import { peindrePlanification } from "../referentiel/planification";
import { peindrePageConstituer } from "../referentiel/constituer";
import { peindreRecherche } from "../referentiel/recherche";
import { peindreHabillageCarte } from "../referentiel/habillage-carte";
import { NIVEAUX_ACQUISITION, regleNiveauxAcquisition } from "../domaine/regles-affichees";
import * as suiviSimplifie from "../domaine/suivi-simplifie";
import { lireMoisConservation } from "../domaine/conservation";
import { MOIS_CONSERVATION_MAXIMUM, MOIS_CONSERVATION_MINIMUM, MOIS_CONSERVATION_PAR_DEFAUT } from "../configuration";
import * as jaugeExport from "../domaine/jauge-export";
import { couleurNiveau, encreNiveau } from "../domaine/teintes-niveaux";
import { peindreBarreEtapes, peindreEnregistrement } from "../editeur/barre-etapes";
import { dessinateurJauge } from "../export/image-jauge";
import { colonnesExport } from "../export/modele";
import { construireOdt } from "../export/opendocument";
import { construireTableur } from "../export/tableur";
import { construireDocx } from "../export/word";
import { peindreCompetences } from "../editeur/competences";
import * as etapesEditeur from "../domaine/etapes-editeur";
import * as suiviEvaluation from "../domaine/suivi-evaluation";
import * as progressionCalculs from "../domaine/progression";
import { peindreProgressionEtudiant } from "../progression/etudiant";
import { peindreProgressionPromotion } from "../progression/promotion";
import * as vueProgression from "../domaine/vue-progression";
import * as exemple from "../domaine/exemple";
import * as modele from "../domaine/modele-donnees";
import { afficherPage, brancherOnglets } from "../interface/onglets";
import { etat, publierEtat } from "../interface/etat";
import { publierConstantes } from "../interface/constantes";
import { publierAidesCommunes } from "../interface/aides-communes";
import { publierCarteDonnees } from "../interface/carte-donnees";
import { publierChaineModele } from "../interface/chaine-modele";
import { publierChaineDessin } from "../interface/chaine-dessin";
import { publierDonnees } from "../interface/donnees";
import { publierEvaluationCourante } from "../interface/evaluation-courante";
import { brancherEtDessiner, chargerEtat, terminerDemarrage, type BranchementsDemarrage } from "../interface/demarrage";
import { publierEditeurEtape1 } from "../interface/editeur-etape1";
import { publierPreferencesParametres } from "../interface/preferences-parametres";
import { publierPromotionsCalendrier } from "../interface/promotions-calendrier";
import { publierVersionsReferentiel } from "../interface/versions-referentiel";
import { publierEtablissement } from "../interface/etablissement";
import { publierReferentiel } from "../interface/referentiel";
import { publierEditeur } from "../interface/editeur";
import { publierEvaluations } from "../interface/evaluations";
import { publierProgression } from "../interface/progression";
import { publierExportDocument } from "../interface/export-document";
import { publierExemple } from "../interface/exemple";
import { brancherInterface } from "../interface/branchements";
import { MODULES, appliquerDependances, entraineDautres, modulesParDefaut } from "../domaine/modules";
import { peindreModules } from "../parametres/modules";
import { libelleCritere, preferencesInitiales, sceauActif } from "../domaine/preferences";
import { peindreDossierExports, peindreSceau, peindreVocabulaire } from "../preferences/preferences";
import { installerReferentielExemple } from "./exemple";
import { peindreRepartition, peindreVoletEtablissement } from "../etablissement/volets";
import { peindreEnseignants as peindreVoletEnseignants } from "../etablissement/enseignants";
import { peindreLivrables as peindreVoletLivrables } from "../etablissement/livrables";
import { peindrePromotions as peindreVoletPromotions } from "../etablissement/promotions";
import { peindreDiplomes as peindreVoletDiplomes } from "../etablissement/diplomes";
import { peindreEnseignants, peindreLivrables, peindrePromotions, peindreSemestres, peindreUesEtEcs } from "../editeur/etape-evaluation";
import { lierSelection, peindreFormulation } from "../editeur/formulation";
import { progressionDesCompetences } from "../domaine/progression-competences";
import { peindreSaisieEtudiants } from "../editeur/saisie-etudiants";
import { avertirReferentielNonValide } from "../editeur/avertissement-referentiel";
import { brancherFormulaire, remplirFormulaire } from "../editeur/formulaire";
import type { EnseignantsEtMoi } from "../domaine/enseignant-moi";
import { diplomeAReferentielValide, promotionAReferentielValide, promotionsAAvertir } from "../domaine/validation-referentiel";
import type { MagasinMemoire } from "../domaine/magasin-memoire";
import { lireSaisieEtablissement } from "../domaine/documents-rgpd";
import {
  confirmerActivationEleves,
  montrerDocumentsEleves,
  type ContexteDocumentsEleves,
  type MotDePasseModule,
} from "../ecran-avertissement-eleves";
import {
  choisirDossierExports,
  enregistrerFichier,
  estDansEnveloppe,
  lireDossierExports,
  oublierDossierExports,
} from "../enveloppe";

/** Adresse du script de l'interface historique, servi depuis `public/`. */
const ADRESSE_SCRIPT_HISTORIQUE = "/heritage/application.js";

/** Document que l'interface historique demande d'enregistrer. */
interface DemandeEnregistrement {
  filename: string;
  data: ContenuFichier;
  /** Vrai si le document contient des noms ou des résultats d'étudiants. */
  eleves?: boolean;
}

/** Appelée après chaque document enregistré. */
export type SurExport = (nomFichier: string, contientEleves: boolean) => void;

/** Règle appliquée aux enseignants : rend les données à enregistrer, ou `null` s'il n'y a rien à changer. */
export type RegleEnseignants = (donnees: EnseignantsEtMoi) => EnseignantsEtMoi | null;

/** Ce que l'interface historique attend de l'application, sous `window.dnmaxPont`. */
interface Pont {
  /**
   * Posée par l'interface historique à son chargement : contenu lisible du
   * référentiel d'un diplôme, pour une version validée ou (identifiant vide)
   * pour le référentiel de travail. Rend `null` si le diplôme est inconnu.
   */
  projeterReferentiel?: (diplomeId: string, versionId: string) => unknown;
  /**
   * Posée par l'interface historique à son chargement : applique une règle aux
   * enseignants de l'établissement qu'elle tient en mémoire, puis les enregistre
   * si la règle rend autre chose que `null`.
   */
  ajusterEnseignants?: (regle: RegleEnseignants) => void;
  /** Posée par l'interface historique à son chargement : affiche la page Préférences. */
  ouvrirPreferences?: () => void;
  /**
   * Posée par l'application (voir `suivreRenommageMoi`) : appelée quand
   * l'enseignant corrige le prénom ou le nom de sa ligne « C'est moi ».
   * Les valeurs ne sont pas typées.
   */
  renommerMoi?: (prenom: unknown, nomFamille: unknown) => void;
  /**
   * Appelée avant tout changement d'échelle d'évaluation dans Préférences.
   * Rend `true` si l'enseignant confirme.
   */
  /**
   * Préférences > Documents exportés : dossier proposé par « Enregistrer sous ».
   * Absent hors de l'enveloppe de bureau, qui seule enregistre des fichiers.
   */
  readonly dossierExports?: {
    lire(): Promise<string | null>;
    choisir(): Promise<string | null>;
    oublier(): Promise<void>;
  };
  /**
   * Posée par l'interface historique à son chargement : ouvre Mon établissement > Établissement
   * et place le curseur sur le premier champ utile aux documents RGPD qui est vide.
   */
  ouvrirEtablissement?: () => void;
  /**
   * Appelée quand l'enseignant coche le module Étudiants : avertissement RGPD,
   * documents à remettre et mot de passe renforcé, dans une seule boîte. Rend
   * `true` s'il confirme l'activation.
   *
   * @param etablissement l'objet `DATA.etab` de « Mon établissement » (champs `nom` et `contactDpo` lus)
   */
  readonly confirmerModuleEleves: (etablissement: unknown) => Promise<boolean>;
  /**
   * Rouvre les documents à remettre du module Étudiants, depuis sa carte.
   *
   * @param etablissement l'objet `DATA.etab` de « Mon établissement »
   */
  readonly documentsModuleEleves: (etablissement: unknown) => void;
  /**
   * Règles de validation du référentiel (`src/domaine/validation-referentiel.ts`),
   * appliquées aux données que tient l'interface historique : `donnees` est
   * l'objet de `dnmade.data`, `promotion` un élément de `dnmade.promos`.
   */
  readonly referentielValide: {
    promotion(donnees: unknown, promotion: unknown): boolean;
    diplome(donnees: unknown, diplomeId: unknown): boolean;
    /** Promotions qui viennent d'être cochées et dont le référentiel n'est pas validé. */
    aAvertir: typeof promotionsAAvertir;
    /** Fenêtre d'avertissement à la sélection d'une telle promotion (voir `editeur/avertissement-referentiel`). */
    avertir: typeof avertirReferentielNonValide;
  };
  /** Le diplôme-cadre vierge, à cacher à l'enseignant (voir `domaine/diplome-vierge`). */
  readonly estCadreVierge: typeof estCadreVierge;
  /** Appelée au chargement : retire les diplômes-cadres vierges devenus inutiles. */
  readonly nettoyerDiplomesVierges: typeof nettoyerDiplomesVierges;
  /** Calculs du zoom de la carte radiale du référentiel (voir `domaine/zoom-carte`). */
  readonly zoomCarte: typeof zoomCarte;
  /** Référentiel > Constituer > Blocs et compétences : nouveau numéro d'un bloc (voir `domaine/numero-bloc`). */
  readonly renumeroterBloc: typeof renumeroterBloc;
  /** Règles de la saisie des résultats des étudiants (voir `domaine/saisie-resultats`). */
  readonly saisie: typeof saisieResultats;
  /** Règles de la composition d'une évaluation (voir `domaine/evaluation`). */
  readonly evaluation: typeof reglesEvaluation;
  /** Prénom et nom des enseignants et des étudiants (voir `domaine/personnes`). */
  readonly personnes: typeof personnes;
  /** Ordre, état et liste des étudiants des promotions (voir `domaine/promotions`). */
  readonly promotions: typeof promotions;
  /** Code, libellé, regroupement, création et suppression des diplômes (voir `domaine/diplomes`). */
  readonly diplomes: typeof diplomes;
  /** Référentiel > Constituer : libellés, éléments neufs, codes en double, retrait (voir `domaine/constituer`). */
  readonly constituer: typeof constituer;
  /** Filtres de Mes évaluations (voir `domaine/filtres-evaluations`). */
  readonly filtresEvaluations: typeof filtresEvaluations;
  /** Écrans de Mes évaluations écrits en TypeScript (voir `evaluations/`). */
  readonly evaluations: {
    peindreFiltres: typeof peindreFiltres;
    peindreListe: typeof peindreListe;
    ouvrirActions: typeof ouvrirActions;
    apresDessinListe: typeof apresDessinListe;
  };
  /** Actions de suivi d'une évaluation (voir `domaine/actions-evaluation`). */
  readonly actionsEvaluation: typeof actionsEvaluation;
  /** Écrans de Référentiel > Constituer écrits en TypeScript (voir `referentiel/`). */
  readonly referentiel: {
    peindreEtapeUes: typeof peindreEtapeUes;
    peindreEtapeEcs: typeof peindreEtapeEcs;
    peindreEtapeBlocs: typeof peindreEtapeBlocs;
    peindrePlanification: typeof peindrePlanification;
    peindrePageConstituer: typeof peindrePageConstituer;
    peindreRecherche: typeof peindreRecherche;
    peindreHabillageCarte: typeof peindreHabillageCarte;
  };
  /** Niveaux d'acquisition du DN MADE et leur règle, montrée dans la carte du module (voir `domaine/regles-affichees`). */
  readonly niveauxAcquisition: { noms: typeof NIVEAUX_ACQUISITION; regle: typeof regleNiveauxAcquisition };
  /** Suivi simplifié « À faire / Faite » (voir `domaine/suivi-simplifie`). */
  readonly suiviSimplifie: typeof suiviSimplifie;
  /** Libellés de niveaux au-dessus de la jauge des exports Word et OpenDocument (voir `domaine/jauge-export`). */
  readonly jauge: typeof jaugeExport;
  /** Couleur et encre de chaque niveau de maîtrise (voir `domaine/teintes-niveaux`). */
  readonly teintes: { couleurNiveau: typeof couleurNiveau; encreNiveau: typeof encreNiveau };
  /** Écrans de l'éditeur d'évaluation écrits en TypeScript (voir `editeur/`). */
  readonly editeur: {
    peindreBarreEtapes: typeof peindreBarreEtapes;
    peindreEnregistrement: typeof peindreEnregistrement;
    peindreLivrables: typeof peindreLivrables;
    peindreEnseignants: typeof peindreEnseignants;
    peindreSemestres: typeof peindreSemestres;
    peindreUesEtEcs: typeof peindreUesEtEcs;
    peindrePromotions: typeof peindrePromotions;
    peindreCompetences: typeof peindreCompetences;
    peindreFormulation: typeof peindreFormulation;
    lierSelection: typeof lierSelection;
    peindreSaisieEtudiants: typeof peindreSaisieEtudiants;
    remplirFormulaire: typeof remplirFormulaire;
    brancherFormulaire: typeof brancherFormulaire;
  };
  /** Exports Word, OpenDocument et tableur (voir `export/`). */
  readonly exports: {
    colonnesExport: typeof colonnesExport;
    construireDocx: typeof construireDocx;
    construireOdt: typeof construireOdt;
    construireTableur: typeof construireTableur;
    dessinateurJauge: typeof dessinateurJauge;
  };
  /** Suivi d'une évaluation : statut, saisie, restitutions (voir `domaine/suivi-evaluation`). */
  readonly suivi: typeof suiviEvaluation;
  /**
   * « Charger un exemple » sans référentiel : installe le référentiel Objet livré
   * dans le magasin et rend l'identifiant du diplôme installé.
   */
  installerReferentielExemple(): Promise<string | null>;
  /** Volets de Mon établissement écrits en TypeScript (voir `etablissement/`). */
  readonly etablissement: {
    peindreVoletEtablissement: typeof peindreVoletEtablissement;
    peindreRepartition: typeof peindreRepartition;
    peindreEnseignants: typeof peindreVoletEnseignants;
    peindreLivrables: typeof peindreVoletLivrables;
    peindrePromotions: typeof peindreVoletPromotions;
    peindreDiplomes: typeof peindreVoletDiplomes;
  };
  /** Calculs de la page Progression (voir `domaine/progression`). */
  readonly progression: typeof progressionCalculs & { peindrePromotion: typeof peindreProgressionPromotion; peindreEtudiant: typeof peindreProgressionEtudiant };
  /** Promotions et semestres proposés dans Progression (voir `domaine/vue-progression`). */
  readonly vueProgression: typeof vueProgression;
  /** Modèle des données de l'établissement : dictionnaire, référentiels, vue fusionnée (voir `domaine/modele-donnees`). */
  readonly modele: typeof modele;
  /** Barre des onglets et titre de la fenêtre (voir `interface/onglets`). */
  readonly interface: { afficherPage: typeof afficherPage; brancherOnglets: typeof brancherOnglets; brancherInterface: typeof brancherInterface };
  /** Modules de Paramètres > Modules (voir `domaine/modules`, `parametres/modules`). */
  readonly modules: {
    MODULES: typeof MODULES;
    modulesParDefaut: typeof modulesParDefaut;
    appliquerDependances: typeof appliquerDependances;
    entraineDautres: typeof entraineDautres;
    peindre: typeof peindreModules;
  };
  /** Préférences du menu « Mon compte » (voir `domaine/preferences`, `preferences/preferences`). */
  readonly preferences: {
    initiales: typeof preferencesInitiales;
    libelleCritere: typeof libelleCritere;
    sceauActif: typeof sceauActif;
    peindreVocabulaire: typeof peindreVocabulaire;
    peindreSceau: typeof peindreSceau;
    peindreDossierExports: typeof peindreDossierExports;
  };
  /** Contenu de « Charger un exemple » (voir `domaine/exemple`). */
  readonly exemple: typeof exemple;
  /** Étapes accessibles de l'éditeur (voir `domaine/etapes-editeur`). */
  readonly etapesEditeur: typeof etapesEditeur;
  /** Progression de la promotion sur chaque compétence du semestre (voir `domaine/progression-competences`). */
  readonly progressionCompetences: typeof progressionDesCompetences;
  readonly stockage: Pick<MagasinMemoire, "getItem" | "setItem" | "removeItem">;
  readonly telechargements: {
    save(demande: DemandeEnregistrement): Promise<void>;
  };
}

declare global {
  interface Window {
    dnmaxPont?: Pont;
    XLSX?: typeof XLSX;
    JSZip?: typeof JSZip;
  }
}

/** Erreur dont l'interface historique lit le champ `code` (« declined » = annulation, sans message). */
class ErreurEnregistrement extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function enregistrerPourInterfaceHistorique(
  demande: DemandeEnregistrement,
  surExport: SurExport,
  avantExportEleves: () => Promise<boolean>,
): Promise<void> {
  // Un document qui contient des étudiants sort du coffre en clair : l'enseignant en est prévenu avant de l'enregistrer.
  if (demande.eleves === true && !(await avantExportEleves())) {
    throw new ErreurEnregistrement("declined", "enregistrement annulé");
  }
  const octets = await convertirEnOctets(demande.data);
  const fichierEcrit = await enregistrerFichier(demande.filename, octets);
  if (!fichierEcrit) {
    throw new ErreurEnregistrement("declined", "enregistrement annulé");
  }
  surExport(demande.filename, demande.eleves === true);
}

/** Ce que les documents RGPD citent de l'établissement, lu dans `DATA.etab` de « Mon établissement ». */
function contexteDocumentsEleves(etablissement: unknown): ContexteDocumentsEleves {
  return {
    etablissement: lireSaisieEtablissement(etablissement),
    moisConservation: lireMoisConservation(etablissement, {
      minimum: MOIS_CONSERVATION_MINIMUM,
      maximum: MOIS_CONSERVATION_MAXIMUM,
      parDefaut: MOIS_CONSERVATION_PAR_DEFAUT,
    }),
    allerSaisirEtablissement: () => {
      window.dnmaxPont?.ouvrirEtablissement?.();
    },
    date: new Date(),
  };
}

/**
 * Installe ce dont l'interface historique dépend, puis charge son script.
 *
 * Le script lit le stockage dès son chargement : le magasin doit donc déjà
 * contenir les données de l'enseignant quand cette fonction est appelée.
 *
 * @param surExport appelée après chaque document enregistré, avec le nom proposé pour ce document
 *   et l'indication qu'il contient, ou non, des données d'étudiants
 * @param motDePasseEleves le mot de passe des données, à confirmer dans la boîte
 *   d'activation du module Étudiants. Hors de l'enveloppe, il n'y en a pas (`null`) :
 *   rien n'est demandé.
 * @param avantExportEleves avant d'enregistrer un document qui contient des étudiants :
 *   rend `true` si l'enseignant confirme, après avoir lu qu'il ne sera pas protégé
 */
export async function chargerInterfaceHistorique(
  magasin: MagasinMemoire,
  surExport: SurExport = () => undefined,
  motDePasseEleves: MotDePasseModule | null = null,
  avantExportEleves: () => Promise<boolean> = () => Promise.resolve(true),
): Promise<void> {
  window.XLSX = XLSX;
  window.JSZip = JSZip;
  // Données non typées : elles sont relues prudemment, et tout ce qui est illisible vaut « non validé ».
  const promotionValide = (donnees: unknown, promotion: unknown): boolean =>
    estObjet(promotion) && promotionAReferentielValide(lireDonneesEtablissementDe(donnees), lirePromotion(promotion));
  const diplomeValide = (donnees: unknown, diplomeId: unknown): boolean =>
    typeof diplomeId === "string" && diplomeAReferentielValide(lireDonneesEtablissementDe(donnees), diplomeId);
  window.dnmaxPont = {
    stockage: magasin,
    telechargements: { save: (demande) => enregistrerPourInterfaceHistorique(demande, surExport, avantExportEleves) },
    estCadreVierge,
    nettoyerDiplomesVierges,
    zoomCarte,
    renumeroterBloc,
    saisie: saisieResultats,
    evaluation: reglesEvaluation,
    personnes,
    promotions,
    diplomes,
    constituer,
    filtresEvaluations,
    evaluations: { peindreFiltres, peindreListe, ouvrirActions, apresDessinListe },
    actionsEvaluation,
    referentiel: { peindreEtapeUes, peindreEtapeEcs, peindreEtapeBlocs, peindrePlanification, peindrePageConstituer, peindreRecherche, peindreHabillageCarte },
    niveauxAcquisition: { noms: NIVEAUX_ACQUISITION, regle: regleNiveauxAcquisition },
    suiviSimplifie,
    jauge: jaugeExport,
    teintes: { couleurNiveau, encreNiveau },
    editeur: { peindreBarreEtapes, peindreEnregistrement, peindreLivrables, peindreEnseignants, peindreSemestres, peindreUesEtEcs, peindrePromotions, peindreCompetences, peindreFormulation, lierSelection, peindreSaisieEtudiants, remplirFormulaire, brancherFormulaire },
    progressionCompetences: progressionDesCompetences,
    etapesEditeur,
    suivi: suiviEvaluation,
    progression: { ...progressionCalculs, peindrePromotion: peindreProgressionPromotion, peindreEtudiant: peindreProgressionEtudiant },
    vueProgression,
    modele,
    interface: { afficherPage, brancherOnglets, brancherInterface },
    modules: { MODULES, modulesParDefaut, appliquerDependances, entraineDautres, peindre: peindreModules },
    preferences: { initiales: preferencesInitiales, libelleCritere, sceauActif, peindreVocabulaire, peindreSceau, peindreDossierExports },
    exemple,
    etablissement: {
      peindreVoletEtablissement,
      peindreRepartition,
      peindreEnseignants: peindreVoletEnseignants,
      peindreLivrables: peindreVoletLivrables,
      peindrePromotions: peindreVoletPromotions,
      peindreDiplomes: peindreVoletDiplomes,
    },
    installerReferentielExemple: () => installerReferentielExemple(magasin, new Date()),
    exports: { colonnesExport, construireDocx, construireOdt, construireTableur, dessinateurJauge },
    ...(estDansEnveloppe()
      ? { dossierExports: { lire: lireDossierExports, choisir: choisirDossierExports, oublier: oublierDossierExports } }
      : {}),
    // L'interface historique n'est pas typée : les champs reçus sont vérifiés.
    confirmerModuleEleves: (etablissement) =>
      confirmerActivationEleves({ ...contexteDocumentsEleves(etablissement), motDePasse: motDePasseEleves }),
    documentsModuleEleves: (etablissement) => {
      montrerDocumentsEleves(contexteDocumentsEleves(etablissement));
    },
    referentielValide: {
      promotion: promotionValide,
      diplome: diplomeValide,
      aAvertir: promotionsAAvertir,
      avertir: avertirReferentielNonValide,
    },
  };
  await new Promise<void>((resoudre, rejeter) => {
    // L'état est publié avant le script, qui en affecte les parties sans les déclarer.
    publierEtat(window, etat);
    publierConstantes(window as unknown as Record<string, unknown>);
    publierAidesCommunes(window as unknown as Record<string, unknown>, document);
    publierCarteDonnees(window as unknown as Record<string, unknown>);
    publierChaineModele(window as unknown as Record<string, unknown>);
    publierChaineDessin(window as unknown as Record<string, unknown>, document);
    publierDonnees(window as unknown as Record<string, unknown>, {
      ecrireStockage: (cle, valeur) => {
        magasin.setItem(cle, valeur);
      },
      maintenant: () => Date.now(),
      hasard: () => Math.random(),
    });
    publierEvaluationCourante(window as unknown as Record<string, unknown>, () => Math.random());
    publierEditeurEtape1(window as unknown as Record<string, unknown>, () => new Date());
    publierPreferencesParametres(window as unknown as Record<string, unknown>, {
      ecrireStockage: (cle, valeur) => {
        magasin.setItem(cle, valeur);
      },
      maintenant: () => Date.now(),
    });
    publierPromotionsCalendrier(window as unknown as Record<string, unknown>, (cle, valeur) => {
      magasin.setItem(cle, valeur);
    });
    publierEtablissement(window as unknown as Record<string, unknown>);
    publierReferentiel(window as unknown as Record<string, unknown>);
    publierEditeur(window as unknown as Record<string, unknown>, (cle, valeur) => {
      magasin.setItem(cle, valeur);
    });
    publierEvaluations(
      window as unknown as Record<string, unknown>,
      (cle, valeur) => {
        magasin.setItem(cle, valeur);
      },
      (cle) => magasin.getItem(cle),
    );
    publierProgression(window as unknown as Record<string, unknown>, (cle) => magasin.getItem(cle));
    publierExportDocument(window as unknown as Record<string, unknown>, () => window.dnmaxPont?.telechargements);
    publierExemple(
      window as unknown as Record<string, unknown>,
      (cle, valeur) => {
        magasin.setItem(cle, valeur);
      },
      (cle) => magasin.getItem(cle),
      () => installerReferentielExemple(magasin, new Date()),
    );
    publierVersionsReferentiel(window as unknown as Record<string, unknown>, {
      ecrireStockage: (cle, valeur) => {
        magasin.setItem(cle, valeur);
      },
      promotionValide,
      diplomeValide,
      maintenant: () => new Date(),
    });
    const script = document.createElement("script");
    script.src = ADRESSE_SCRIPT_HISTORIQUE;
    script.addEventListener("load", () => {
      // Le démarrage suit la lecture du script, dans l'ordre où le script l'exécutait (décision 38).
      try {
        const fenetre = window as unknown as Record<string, unknown>;
        const branchementsDemarrage: BranchementsDemarrage = {
          lireStockage: (cle) => magasin.getItem(cle),
          ecrireStockage: (cle, valeur) => {
            magasin.setItem(cle, valeur);
          },
          maintenant: () => new Date(),
        };
        chargerEtat(fenetre, branchementsDemarrage);
        const ponts = brancherEtDessiner(fenetre, document, branchementsDemarrage);
        if (window.dnmaxPont) Object.assign(window.dnmaxPont, ponts);
        terminerDemarrage();
      } finally {
        resoudre();
      }
    });
    script.addEventListener("error", () => {
      rejeter(new Error("le script de l'interface n'a pas pu être chargé"));
    });
    document.body.append(script);
  });
}

/**
 * Fait appliquer une règle aux enseignants par l'interface historique, qui
 * tient ses données en mémoire : les modifier dans le magasin serait écrasé à
 * son prochain enregistrement. Sans interface chargée, ne fait rien.
 */
export function ajusterEnseignants(regle: RegleEnseignants): void {
  window.dnmaxPont?.ajusterEnseignants?.(regle);
}

/**
 * Fait appeler `rappel` à chaque correction du prénom ou du nom de la ligne
 * « C'est moi » de « Mon établissement », avec les valeurs saisies, non vérifiées.
 * Sans interface chargée, ne fait rien.
 */
export function suivreRenommageMoi(rappel: (prenom: unknown, nomFamille: unknown) => void): void {
  if (window.dnmaxPont !== undefined) {
    window.dnmaxPont.renommerMoi = rappel;
  }
}
