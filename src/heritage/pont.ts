// SPDX-License-Identifier: CECILL-2.1
import { convertirEnOctets, type ContenuFichier } from "../domaine/contenu-fichier";
import { estObjet, lireDonneesEtablissementDe, lirePromotion } from "../domaine/echange/modele";
import { estCadreVierge } from "../domaine/diplome-vierge";
import * as zoomCarte from "../domaine/zoom-carte";
import * as reglesEvaluation from "../domaine/evaluation";
import * as diplomes from "../domaine/diplomes";
import { peindreEtapeBlocs, peindreEtapeEcs, peindreEtapeUes } from "../referentiel/etapes";
import { peindrePlanification } from "../referentiel/planification";
import { peindrePageConstituer } from "../referentiel/constituer";
import { peindreRecherche } from "../referentiel/recherche";
import { peindreHabillageCarte } from "../referentiel/habillage-carte";
import { lireMoisConservation } from "../domaine/conservation";
import { MOIS_CONSERVATION_MAXIMUM, MOIS_CONSERVATION_MINIMUM, MOIS_CONSERVATION_PAR_DEFAUT } from "../configuration";
import { etat, publierEtat } from "../interface/etat";
import { brancherAidesCommunes } from "../interface/aides-communes";
import { brancherChaineDessin } from "../interface/chaine-dessin";
import { brancherRadialeDessin } from "../interface/radiale-dessin";
import { brancherRadialeGestes, ecouterRedimensionnement } from "../interface/radiale-gestes";
import { brancherExplorer } from "../interface/explorer";
import { brancherDonnees } from "../interface/donnees";
import { brancherEvaluationCourante } from "../interface/evaluation-courante";
import { brancherEtDessiner, chargerEtat, terminerDemarrage, type BranchementsDemarrage } from "../interface/demarrage";
import { brancherEditeurEtape1 } from "../interface/editeur-etape1";
import { brancherPreferencesParametres } from "../interface/preferences-parametres";
import { brancherPromotionsCalendrier } from "../interface/promotions-calendrier";
import { brancherVersionsReferentiel } from "../interface/versions-referentiel";
import { brancherEditeur } from "../interface/editeur";
import { brancherEvaluations } from "../interface/evaluations";
import { brancherProgression } from "../interface/progression";
import { brancherExportDocument } from "../interface/export-document";
import { brancherExemple } from "../interface/exemple";
import { publierNomsDuBanc } from "./noms-banc";
import { installerReferentielExemple } from "./exemple";
import type { EnseignantsEtMoi } from "../domaine/enseignant-moi";
import { diplomeAReferentielValide, promotionAReferentielValide } from "../domaine/validation-referentiel";
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

/** Document que l'interface demande d'enregistrer. */
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

/** Ce que l'interface attend de l'application, sous `window.dnmaxPont`. */
interface Pont {
  /**
   * Posée par l'interface à son chargement : contenu lisible du
   * référentiel d'un diplôme, pour une version validée ou (identifiant vide)
   * pour le référentiel de travail. Rend `null` si le diplôme est inconnu.
   */
  projeterReferentiel?: (diplomeId: string, versionId: string) => unknown;
  /**
   * Posée par l'interface à son chargement : applique une règle aux
   * enseignants de l'établissement qu'elle tient en mémoire, puis les enregistre
   * si la règle rend autre chose que `null`.
   */
  ajusterEnseignants?: (regle: RegleEnseignants) => void;
  /** Posée par l'interface à son chargement : affiche la page Préférences. */
  ouvrirPreferences?: () => void;
  /**
   * Posée par l'application (voir `suivreRenommageMoi`) : appelée quand
   * l'enseignant corrige le prénom ou le nom de sa ligne « C'est moi ».
   * Les valeurs ne sont pas typées.
   */
  renommerMoi?: (prenom: unknown, nomFamille: unknown) => void;
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
   * Posée par l'interface à son chargement : ouvre Mon établissement > Établissement
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
  /** Le diplôme-cadre vierge, à cacher à l'enseignant (voir `domaine/diplome-vierge`). */
  readonly estCadreVierge: typeof estCadreVierge;
  /** Calculs du zoom de la carte radiale du référentiel (voir `domaine/zoom-carte`). */
  readonly zoomCarte: typeof zoomCarte;
  /** Règles de la composition d'une évaluation (voir `domaine/evaluation`). */
  readonly evaluation: typeof reglesEvaluation;
  /** Code, libellé, regroupement, création et suppression des diplômes (voir `domaine/diplomes`). */
  readonly diplomes: typeof diplomes;
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
  readonly stockage: Pick<MagasinMemoire, "getItem" | "setItem" | "removeItem">;
  readonly telechargements: {
    save(demande: DemandeEnregistrement): Promise<void>;
  };
}

declare global {
  interface Window {
    dnmaxPont?: Pont;
  }
}

/** Erreur dont l'interface lit le champ `code` (« declined » = annulation, sans message). */
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
 * Installe l'interface (reprise du fichier historique, décision 38) : pose le
 * pont, branche chaque module sur ce qu'il demande à l'extérieur, publie sur
 * la fenêtre l'état et les fonctions qu'appelle le banc de comparaison (voir
 * `noms-banc`), puis la démarre.
 *
 * Le démarrage lit le stockage : le magasin doit donc déjà contenir les
 * données de l'enseignant quand cette fonction est appelée.
 *
 * @param surExport appelée après chaque document enregistré, avec le nom proposé pour ce document
 *   et l'indication qu'il contient, ou non, des données d'étudiants
 * @param motDePasseEleves le mot de passe des données, à confirmer dans la boîte
 *   d'activation du module Étudiants. Hors de l'enveloppe, il n'y en a pas (`null`) :
 *   rien n'est demandé.
 * @param avantExportEleves avant d'enregistrer un document qui contient des étudiants :
 *   rend `true` si l'enseignant confirme, après avoir lu qu'il ne sera pas protégé
 */
// eslint-disable-next-line @typescript-eslint/require-await -- asynchrone comme avant : les appelants l'attendent, et une erreur de publication y devient un rejet
export async function chargerInterfaceHistorique(
  magasin: MagasinMemoire,
  surExport: SurExport = () => undefined,
  motDePasseEleves: MotDePasseModule | null = null,
  avantExportEleves: () => Promise<boolean> = () => Promise.resolve(true),
): Promise<void> {
  // Données non typées : elles sont relues prudemment, et tout ce qui est illisible vaut « non validé ».
  const promotionValide = (donnees: unknown, promotion: unknown): boolean =>
    estObjet(promotion) && promotionAReferentielValide(lireDonneesEtablissementDe(donnees), lirePromotion(promotion));
  const diplomeValide = (donnees: unknown, diplomeId: unknown): boolean =>
    typeof diplomeId === "string" && diplomeAReferentielValide(lireDonneesEtablissementDe(donnees), diplomeId);
  window.dnmaxPont = {
    stockage: magasin,
    telechargements: { save: (demande) => enregistrerPourInterfaceHistorique(demande, surExport, avantExportEleves) },
    estCadreVierge,
    zoomCarte,
    evaluation: reglesEvaluation,
    diplomes,
    referentiel: { peindreEtapeUes, peindreEtapeEcs, peindreEtapeBlocs, peindrePlanification, peindrePageConstituer, peindreRecherche, peindreHabillageCarte },
    ...(estDansEnveloppe()
      ? { dossierExports: { lire: lireDossierExports, choisir: choisirDossierExports, oublier: oublierDossierExports } }
      : {}),
    // L'interface n'est pas typée : les champs reçus sont vérifiés.
    confirmerModuleEleves: (etablissement) =>
      confirmerActivationEleves({ ...contexteDocumentsEleves(etablissement), motDePasse: motDePasseEleves }),
    documentsModuleEleves: (etablissement) => {
      montrerDocumentsEleves(contexteDocumentsEleves(etablissement));
    },
  };
  // L'état et les fonctions que le banc de comparaison appelle sont publiés sur la fenêtre sous leurs anciens noms
  // (voir `noms-banc`) ; chaque module reçoit ce qu'il demande à l'extérieur.
  publierEtat(window, etat);
  publierNomsDuBanc(window as unknown as Record<string, unknown>);
  brancherAidesCommunes(document);
  brancherChaineDessin(document);
  brancherRadialeDessin(document);
  brancherRadialeGestes(document);
  brancherExplorer(document);
  brancherDonnees({
    ecrireStockage: (cle, valeur) => {
      magasin.setItem(cle, valeur);
    },
    maintenant: () => Date.now(),
    hasard: () => Math.random(),
  });
  brancherEvaluationCourante(() => Math.random());
  brancherEditeurEtape1(() => new Date());
  brancherPreferencesParametres(window as unknown as Record<string, unknown>, {
    ecrireStockage: (cle, valeur) => {
      magasin.setItem(cle, valeur);
    },
    maintenant: () => Date.now(),
  });
  brancherPromotionsCalendrier((cle, valeur) => {
    magasin.setItem(cle, valeur);
  });
  brancherEditeur((cle, valeur) => {
    magasin.setItem(cle, valeur);
  });
  brancherEvaluations(
    (cle, valeur) => {
      magasin.setItem(cle, valeur);
    },
    (cle) => magasin.getItem(cle),
  );
  brancherProgression((cle) => magasin.getItem(cle));
  brancherExportDocument(() => window.dnmaxPont?.telechargements);
  brancherExemple(
    (cle, valeur) => {
      magasin.setItem(cle, valeur);
    },
    (cle) => magasin.getItem(cle),
    () => installerReferentielExemple(magasin, new Date()),
  );
  brancherVersionsReferentiel({
    ecrireStockage: (cle, valeur) => {
      magasin.setItem(cle, valeur);
    },
    promotionValide,
    diplomeValide,
    maintenant: () => new Date(),
  });
  // Le démarrage suit, dans l'ordre où l'ancien script l'exécutait à sa lecture : écoute du redimensionnement
  // de la carte radiale, puis lecture des données, branchements et premier dessin.
  try {
    ecouterRedimensionnement(window);
    const branchementsDemarrage: BranchementsDemarrage = {
      lireStockage: (cle) => magasin.getItem(cle),
      ecrireStockage: (cle, valeur) => {
        magasin.setItem(cle, valeur);
      },
      maintenant: () => new Date(),
    };
    chargerEtat(branchementsDemarrage);
    const ponts = brancherEtDessiner(window, document, branchementsDemarrage);
    if (window.dnmaxPont as Window["dnmaxPont"] | undefined) Object.assign(window.dnmaxPont, ponts);
    terminerDemarrage();
  } catch (erreur) {
    // Comme quand le démarrage suivait le chargement du script : une erreur est signalée comme non
    // rattrapée, sans empêcher la suite du lancement.
    queueMicrotask(() => {
      throw erreur;
    });
  }
}

/**
 * Fait appliquer une règle aux enseignants par l'interface, qui
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
