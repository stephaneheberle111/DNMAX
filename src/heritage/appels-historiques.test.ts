// SPDX-License-Identifier: CECILL-2.1
/**
 * Garde-fou de la reprise du fichier historique (décision 38) : chaque
 * fonction qu'il appelle par son nom doit exister, définie dans le fichier,
 * publiée sur la fenêtre par l'application, ou fournie par le navigateur.
 * Une fonction retirée à tort ne se voit sinon qu'à l'usage, quand l'écran
 * qui l'appelle s'ouvre.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
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
import { publierDonnees } from "../interface/donnees";
import { publierEvaluationCourante } from "../interface/evaluation-courante";
import { publierEditeurEtape1 } from "../interface/editeur-etape1";
import { publierPreferencesParametres } from "../interface/preferences-parametres";

const CHEMIN = new URL("../../public/heritage/application.js", import.meta.url);

/** Fonctions du navigateur appelées sans `window.` dans le fichier historique. */
const NAVIGATEUR = new Set([
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "matchMedia",
  "getComputedStyle",
  "isNaN",
  "parseInt",
  "parseFloat",
  "String",
  "Number",
  "Boolean",
  "Array",
  "Object",
  "Date",
  "structuredClone",
  "encodeURIComponent",
  "decodeURIComponent",
  "Blob",
  "Error",
  "fetch",
  "btoa",
]);

/** Fonctions publiées sur la fenêtre par l'application, sous leur ancien nom, le temps de la reprise. */
const PUBLIEES = new Set<string>(nomsPublies());

/** Noms réellement posés sur la fenêtre par les modules repris : la liste suit le code au lieu d'être recopiée. */
function nomsPublies(): string[] {
  const fenetre: Record<string, unknown> = {};
  publierConstantes(fenetre);
  publierAidesCommunes(fenetre, null);
  publierCarteDonnees(fenetre);
  publierChaineModele(fenetre);
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

/** Noms appelés comme fonctions (`nom(...)`) et noms déclarés (fonctions, variables, paramètres) dans le fichier. */
function analyser(source: string): { appels: Map<string, number>; declares: Set<string> } {
  const fichier = ts.createSourceFile("application.js", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const appels = new Map<string, number>();
  const declares = new Set<string>();
  const declarer = (nom: ts.BindingName): void => {
    if (ts.isIdentifier(nom)) declares.add(nom.text);
    else for (const element of nom.elements) if (!ts.isOmittedExpression(element)) declarer(element.name);
  };
  const visiter = (noeud: ts.Node): void => {
    if ((ts.isFunctionDeclaration(noeud) || ts.isFunctionExpression(noeud)) && noeud.name) declares.add(noeud.name.text);
    if (ts.isVariableDeclaration(noeud) || ts.isParameter(noeud)) declarer(noeud.name);
    if (ts.isCallExpression(noeud) && ts.isIdentifier(noeud.expression) && !appels.has(noeud.expression.text)) {
      appels.set(noeud.expression.text, fichier.getLineAndCharacterOfPosition(noeud.getStart()).line + 1);
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(fichier);
  return { appels, declares };
}

function orphelins(source: string): string[] {
  const { appels, declares } = analyser(source);
  return [...appels]
    .filter(([nom]) => !declares.has(nom) && !PUBLIEES.has(nom) && !NAVIGATEUR.has(nom))
    .map(([nom, ligne]) => `${nom} (ligne ${String(ligne)})`);
}

describe("fichier historique", () => {
  it("n'appelle aucune fonction qui n'existe nulle part", () => {
    expect(orphelins(readFileSync(CHEMIN, "utf8"))).toEqual([]);
  });

  it("repère une fonction appelée mais définie nulle part", () => {
    expect(orphelins("function a(){ return b(1); }")).toEqual(["b (ligne 1)"]);
  });

  it("accepte une fonction locale, un paramètre appelé et une fonction du navigateur", () => {
    expect(orphelins("function a(f){ const g = () => 1; return f(g()) + setTimeout(a, 1); }")).toEqual([]);
  });
});
