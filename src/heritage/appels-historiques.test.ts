// SPDX-License-Identifier: CECILL-2.1
/**
 * Garde-fou de la reprise du fichier historique (décision 38). Le fichier
 * est supprimé, mais les modules repris s'appellent encore entre eux par la
 * fenêtre, sous les anciens noms (interface `FonctionsHistoriques` de chaque
 * module, lue par `historique()`) : chacun de ces noms doit être publié par
 * un module ou faire partie de l'état. Un nom publié nulle part ne se
 * verrait sinon qu'à l'usage, quand l'écran qui l'appelle s'ouvre (c'est ce
 * qui était arrivé à `promoLabel`, #174 → #187).
 */
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { NOMS_HISTORIQUES } from "../interface/etat";
import { publierPromotionsCalendrier } from "../interface/promotions-calendrier";
import { publierVersionsReferentiel } from "../interface/versions-referentiel";
import { publierEtablissement } from "../interface/etablissement";
import { publierReferentiel } from "../interface/referentiel";
import { publierEditeur } from "../interface/editeur";
import { publierEvaluations } from "../interface/evaluations";
import { publierProgression } from "../interface/progression";
import { publierExportDocument } from "../interface/export-document";
import { publierExemple } from "../interface/exemple";
import { publierConstantes } from "../interface/constantes";
import { publierAidesCommunes } from "../interface/aides-communes";
import { publierCarteDonnees } from "../interface/carte-donnees";
import { publierChaineModele } from "../interface/chaine-modele";
import { publierChaineDessin } from "../interface/chaine-dessin";
import { publierRadialeDessin } from "../interface/radiale-dessin";
import { publierRadialeGestes } from "../interface/radiale-gestes";
import { publierExplorer } from "../interface/explorer";
import { publierDonnees } from "../interface/donnees";
import { publierEvaluationCourante } from "../interface/evaluation-courante";
import { publierEditeurEtape1 } from "../interface/editeur-etape1";
import { publierPreferencesParametres } from "../interface/preferences-parametres";

const DOSSIER = new URL("../interface/", import.meta.url);

/** Noms réellement posés sur la fenêtre par les modules repris : la liste suit le code au lieu d'être recopiée. */
function nomsPublies(): string[] {
  const fenetre: Record<string, unknown> = {};
  publierConstantes(fenetre);
  publierAidesCommunes(fenetre, null);
  publierCarteDonnees(fenetre);
  publierChaineModele(fenetre);
  publierChaineDessin(fenetre, null);
  publierRadialeDessin(fenetre, null);
  publierRadialeGestes(fenetre, null);
  publierExplorer(fenetre, null);
  publierDonnees(fenetre, { ecrireStockage: () => undefined, maintenant: () => 0, hasard: () => 0 });
  publierEvaluationCourante(fenetre, () => 0);
  publierEditeurEtape1(fenetre, () => new Date(0));
  publierPreferencesParametres(fenetre, { ecrireStockage: () => undefined, maintenant: () => 0 });
  publierPromotionsCalendrier(fenetre, () => undefined);
  publierEtablissement(fenetre);
  publierReferentiel(fenetre);
  publierEditeur(fenetre, () => undefined);
  publierEvaluations(fenetre, () => undefined, () => null);
  publierProgression(fenetre, () => null);
  publierExportDocument(fenetre, () => undefined);
  publierExemple(fenetre, () => undefined, () => null, () => Promise.resolve(null));
  publierVersionsReferentiel(fenetre, { ecrireStockage: () => undefined, promotionValide: () => false, diplomeValide: () => false, maintenant: () => new Date(0) });
  return Object.keys(fenetre);
}

/** Fonctions du navigateur qu'un module appelle aussi par la fenêtre. */
const NAVIGATEUR = ["scrollTo"];

/** Ce qui existe sur la fenêtre : fonctions et constantes publiées, parties de l'état, fonctions du navigateur. */
const EXISTANTS = new Set<string>([...nomsPublies(), ...Object.keys(NOMS_HISTORIQUES), ...NAVIGATEUR]);

/** Noms déclarés par l'interface `FonctionsHistoriques` d'un module (ce qu'il appelle par la fenêtre). */
function nomsAppeles(source: string): string[] {
  const fichier = ts.createSourceFile("module.ts", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const noms: string[] = [];
  const visiter = (noeud: ts.Node): void => {
    if (ts.isInterfaceDeclaration(noeud) && noeud.name.text === "FonctionsHistoriques") {
      for (const membre of noeud.members) if (membre.name && ts.isIdentifier(membre.name)) noms.push(membre.name.text);
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return noms;
}

function orphelins(fichier: string, source: string): string[] {
  return nomsAppeles(source)
    .filter((nom) => !EXISTANTS.has(nom))
    .map((nom) => `${nom} (${fichier})`);
}

describe("appels par la fenêtre entre modules repris", () => {
  it("n'appellent aucun nom publié nulle part", () => {
    const modules = readdirSync(DOSSIER).filter((nom) => nom.endsWith(".ts") && !nom.endsWith(".test.ts"));
    const appels = modules.flatMap((nom) => nomsAppeles(readFileSync(new URL(nom, DOSSIER), "utf8")));
    // Le garde-fou porte bien sur quelque chose : plusieurs modules appellent encore par la fenêtre.
    expect(appels.length).toBeGreaterThan(20);
    expect(modules.flatMap((nom) => orphelins(nom, readFileSync(new URL(nom, DOSSIER), "utf8")))).toEqual([]);
  });

  it("repère un nom appelé mais publié nulle part", () => {
    expect(orphelins("essai.ts", "interface FonctionsHistoriques { paintRef(): void; inconnue(): void; }")).toEqual(["inconnue (essai.ts)"]);
  });

  it("accepte une fonction publiée, une constante publiée et une partie de l'état", () => {
    expect(orphelins("essai.ts", "interface FonctionsHistoriques { paintExplore(): void; GROUPS: object; DATA: object; }")).toEqual([]);
  });

  it("ignore les interfaces d'un autre nom", () => {
    expect(orphelins("essai.ts", "interface Autre { inconnue(): void; }")).toEqual([]);
  });
});
