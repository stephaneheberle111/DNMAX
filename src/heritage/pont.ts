// SPDX-License-Identifier: AGPL-3.0-or-later
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { convertirEnOctets, type ContenuFichier } from "../domaine/contenu-fichier";
import { estCadreVierge, nettoyerDiplomesVierges } from "../domaine/diplome-vierge";
import type { EnseignantsEtMoi } from "../domaine/enseignant-moi";
import { CLE_IDENTITE, lireIdentite } from "../domaine/identite";
import type { MagasinMemoire } from "../domaine/magasin-memoire";
import { confirmerActivationEleves } from "../ecran-avertissement-eleves";
import { enregistrerFichier } from "../enveloppe";

/** Adresse du script de l'interface historique, servi depuis `public/`. */
const ADRESSE_SCRIPT_HISTORIQUE = "/heritage/application.js";

/** Document que l'interface historique demande d'enregistrer. */
interface DemandeEnregistrement {
  filename: string;
  data: ContenuFichier;
  /** Vrai si le document contient des noms ou des résultats d'élèves. */
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
  /**
   * Appelée quand l'enseignant coche le module Élèves : avertissement RGPD et
   * documents à remettre. Rend `true` s'il confirme l'activation.
   *
   * @param etablissement nom de l'établissement saisi dans « Mon établissement », vide s'il ne l'est pas
   */
  readonly confirmerModuleEleves: (etablissement: unknown) => Promise<boolean>;
  /** Le diplôme-cadre vierge, à cacher à l'enseignant (voir `domaine/diplome-vierge`). */
  readonly estCadreVierge: typeof estCadreVierge;
  /** Appelée au chargement : retire les diplômes-cadres vierges devenus inutiles. */
  readonly nettoyerDiplomesVierges: typeof nettoyerDiplomesVierges;
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
): Promise<void> {
  const octets = await convertirEnOctets(demande.data);
  const fichierEcrit = await enregistrerFichier(demande.filename, octets);
  if (!fichierEcrit) {
    throw new ErreurEnregistrement("declined", "enregistrement annulé");
  }
  surExport(demande.filename, demande.eleves === true);
}

/**
 * Installe ce dont l'interface historique dépend, puis charge son script.
 *
 * Le script lit le stockage dès son chargement : le magasin doit donc déjà
 * contenir les données de l'enseignant quand cette fonction est appelée.
 *
 * @param surExport appelée après chaque document enregistré, avec le nom proposé pour ce document
 *   et l'indication qu'il contient, ou non, des données d'élèves
 */
export async function chargerInterfaceHistorique(
  magasin: MagasinMemoire,
  surExport: SurExport = () => undefined,
): Promise<void> {
  window.XLSX = XLSX;
  window.JSZip = JSZip;
  window.dnmaxPont = {
    stockage: magasin,
    telechargements: { save: (demande) => enregistrerPourInterfaceHistorique(demande, surExport) },
    estCadreVierge,
    nettoyerDiplomesVierges,
    // L'interface historique n'est pas typée : le nom reçu est vérifié.
    confirmerModuleEleves: (etablissement) =>
      confirmerActivationEleves({
        etablissement: typeof etablissement === "string" ? etablissement : "",
        enseignant: lireIdentite(magasin.getItem(CLE_IDENTITE))?.nom ?? "",
      }),
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
