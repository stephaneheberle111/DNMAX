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
import * as progression from "../domaine/progression";
import { installerReferentielExemple } from "./exemple";
import { peindreRepartition, peindreVoletEtablissement } from "../etablissement/volets";
import { peindreEnseignants, peindreLivrables, peindrePromotions, peindreSemestres, peindreUesEtEcs } from "../editeur/etape-evaluation";
import { lierSelection, peindreFormulation } from "../editeur/formulation";
import { progressionDesCompetences } from "../domaine/progression-competences";
import { peindreSaisieEtudiants } from "../editeur/saisie-etudiants";
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
  readonly etablissement: { peindreVoletEtablissement: typeof peindreVoletEtablissement; peindreRepartition: typeof peindreRepartition };
  /** Calculs de la page Progression (voir `domaine/progression`). */
  readonly progression: typeof progression;
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
  window.dnmaxPont = {
    stockage: magasin,
    telechargements: { save: (demande) => enregistrerPourInterfaceHistorique(demande, surExport, avantExportEleves) },
    estCadreVierge,
    nettoyerDiplomesVierges,
    zoomCarte,
    renumeroterBloc,
    saisie: saisieResultats,
    evaluation: reglesEvaluation,
    suiviSimplifie,
    jauge: jaugeExport,
    teintes: { couleurNiveau, encreNiveau },
    editeur: { peindreBarreEtapes, peindreEnregistrement, peindreLivrables, peindreEnseignants, peindreSemestres, peindreUesEtEcs, peindrePromotions, peindreCompetences, peindreFormulation, lierSelection, peindreSaisieEtudiants },
    progressionCompetences: progressionDesCompetences,
    etapesEditeur,
    suivi: suiviEvaluation,
    progression,
    etablissement: { peindreVoletEtablissement, peindreRepartition },
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
    // Données non typées : elles sont relues prudemment, et tout ce qui est illisible vaut « non validé ».
    referentielValide: {
      promotion: (donnees, promotion) =>
        estObjet(promotion) && promotionAReferentielValide(lireDonneesEtablissementDe(donnees), lirePromotion(promotion)),
      diplome: (donnees, diplomeId) =>
        typeof diplomeId === "string" && diplomeAReferentielValide(lireDonneesEtablissementDe(donnees), diplomeId),
    },
  };
  await new Promise<void>((resoudre, rejeter) => {
    const script = document.createElement("script");
    script.src = ADRESSE_SCRIPT_HISTORIQUE;
    script.addEventListener("load", () => {
      resoudre();
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
