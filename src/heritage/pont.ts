// SPDX-License-Identifier: AGPL-3.0-or-later
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { convertirEnOctets, type ContenuFichier } from "../domaine/contenu-fichier";
import type { MagasinMemoire } from "../domaine/magasin-memoire";
import { enregistrerFichier } from "../enveloppe";

/** Adresse du script de l'interface historique, servi depuis `public/`. */
const ADRESSE_SCRIPT_HISTORIQUE = "/heritage/application.js";

/** Ce que l'interface historique attend de l'application, sous `window.dnmaxPont`. */
interface Pont {
  /**
   * Posée par l'interface historique à son chargement : contenu lisible du
   * référentiel d'un diplôme, pour une version validée ou (identifiant vide)
   * pour le référentiel de travail. Rend `null` si le diplôme est inconnu.
   */
  projeterReferentiel?: (diplomeId: string, versionId: string) => unknown;
  readonly stockage: Pick<MagasinMemoire, "getItem" | "setItem" | "removeItem">;
  readonly telechargements: {
    save(demande: { filename: string; data: ContenuFichier }): Promise<void>;
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
  demande: { filename: string; data: ContenuFichier },
  surExport: (nomFichier: string) => void,
): Promise<void> {
  const octets = await convertirEnOctets(demande.data);
  const fichierEcrit = await enregistrerFichier(demande.filename, octets);
  if (!fichierEcrit) {
    throw new ErreurEnregistrement("declined", "enregistrement annulé");
  }
  surExport(demande.filename);
}

/**
 * Installe ce dont l'interface historique dépend, puis charge son script.
 *
 * Le script lit le stockage dès son chargement : le magasin doit donc déjà
 * contenir les données de l'enseignant quand cette fonction est appelée.
 *
 * @param surExport appelée après chaque document enregistré, avec le nom proposé pour ce document
 */
export async function chargerInterfaceHistorique(
  magasin: MagasinMemoire,
  surExport: (nomFichier: string) => void = () => undefined,
): Promise<void> {
  window.XLSX = XLSX;
  window.JSZip = JSZip;
  window.dnmaxPont = {
    stockage: magasin,
    telechargements: { save: (demande) => enregistrerPourInterfaceHistorique(demande, surExport) },
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
