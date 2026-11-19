// SPDX-License-Identifier: CECILL-2.1
/**
 * Garde-fou des noms de l'ancienne interface (décision 38). Les modules de
 * `interface/` s'appellent par des imports ; seuls l'état et les fonctions que
 * le banc de comparaison (`outils/banc/banc.cjs`) appelle dans la page restent
 * publiés sur la fenêtre (`noms-banc`). Un nom appelé par la fenêtre mais
 * publié nulle part ne se verrait sinon qu'à l'usage (c'est ce qui était
 * arrivé à `promoLabel`, #174 → #187, et au banc, #208) :
 *
 * - un module qui appellerait de nouveau par la fenêtre déclare ces noms dans
 *   une interface `FonctionsHistoriques`, et chacun doit être publié ;
 * - chaque nom libre des fonctions que le banc exécute dans la page doit être
 *   publié, faire partie de l'état ou venir du navigateur ;
 * - à l'inverse, chaque fonction publiée pour le banc doit y être appelée.
 */
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { NOMS_HISTORIQUES } from "../interface/etat";
import { nomsDuBanc } from "./noms-banc";

const DOSSIER = new URL("../interface/", import.meta.url);
const BANC = new URL("../../outils/banc/banc.cjs", import.meta.url);

/** Fonctions publiées pour le banc. */
const PUBLIEES = Object.keys(nomsDuBanc());

/** Ce que le navigateur fournit aux fonctions que le banc exécute dans la page. */
const NAVIGATEUR = [
  "Array",
  "Date",
  "Error",
  "Event",
  "JSON",
  "Math",
  "MutationObserver",
  "Object",
  "Promise",
  "Response",
  "String",
  "Uint8Array",
  "crypto",
  "document",
  "globalThis",
  "structuredClone",
  "window",
];

/** Ce qui existe sur la fenêtre : fonctions publiées, parties de l'état. */
const EXISTANTS = new Set<string>([...PUBLIEES, ...Object.keys(NOMS_HISTORIQUES)]);

/** Noms déclarés par l'interface `FonctionsHistoriques` d'un module (ce qu'il appellerait par la fenêtre). */
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

type Fonction = ts.ArrowFunction | ts.FunctionExpression;

function estFonction(noeud: ts.Node): noeud is Fonction {
  return ts.isArrowFunction(noeud) || ts.isFunctionExpression(noeud);
}

/**
 * Noms libres des fonctions que le script exécute dans la page
 * (`page.evaluate`, `page.addInitScript`), écrites sur place ou passées par
 * une constante : ni déclarés dans la fonction, ni noms de propriété.
 */
function nomsLibresDansLaPage(source: string): Set<string> {
  const fichier = ts.createSourceFile("banc.cjs", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const constantes = new Map<string, Fonction[]>();
  const fonctions: Fonction[] = [];
  const relever = (noeud: ts.Node): void => {
    if (ts.isVariableDeclaration(noeud) && ts.isIdentifier(noeud.name) && noeud.initializer && estFonction(noeud.initializer)) {
      constantes.set(noeud.name.text, [...(constantes.get(noeud.name.text) ?? []), noeud.initializer]);
    }
    ts.forEachChild(noeud, relever);
  };
  relever(fichier);
  const chercher = (noeud: ts.Node): void => {
    if (ts.isCallExpression(noeud) && ts.isPropertyAccessExpression(noeud.expression) && ["evaluate", "addInitScript"].includes(noeud.expression.name.text)) {
      const premier = noeud.arguments[0];
      if (premier && estFonction(premier)) fonctions.push(premier);
      else if (premier && ts.isIdentifier(premier)) fonctions.push(...(constantes.get(premier.text) ?? []));
    }
    ts.forEachChild(noeud, chercher);
  };
  chercher(fichier);
  const libres = new Set<string>();
  for (const fonction of fonctions) {
    const declares = new Set<string>();
    const declarer = (noeud: ts.Node): void => {
      if ((ts.isVariableDeclaration(noeud) || ts.isParameter(noeud) || ts.isFunctionDeclaration(noeud) || ts.isBindingElement(noeud)) && noeud.name && ts.isIdentifier(noeud.name)) {
        declares.add(noeud.name.text);
      }
      ts.forEachChild(noeud, declarer);
    };
    declarer(fonction);
    const lire = (noeud: ts.Node): void => {
      if (ts.isIdentifier(noeud)) {
        const parent = noeud.parent;
        const nomDePropriete =
          (ts.isPropertyAccessExpression(parent) && parent.name === noeud) ||
          (ts.isPropertyAssignment(parent) && parent.name === noeud) ||
          (ts.isMethodDeclaration(parent) && parent.name === noeud) ||
          (ts.isBindingElement(parent) && parent.propertyName === noeud);
        if (!nomDePropriete && !declares.has(noeud.text)) libres.add(noeud.text);
      }
      ts.forEachChild(noeud, lire);
    };
    lire(fonction.body);
  }
  return libres;
}

function inconnusDuBanc(source: string): string[] {
  return [...nomsLibresDansLaPage(source)].filter((nom) => !EXISTANTS.has(nom) && !NAVIGATEUR.includes(nom)).sort();
}

describe("appels par la fenêtre entre modules", () => {
  it("n'appellent aucun nom publié nulle part", () => {
    const modules = readdirSync(DOSSIER).filter((nom) => nom.endsWith(".ts") && !nom.endsWith(".test.ts"));
    expect(modules.length).toBeGreaterThan(20);
    expect(modules.flatMap((nom) => orphelins(nom, readFileSync(new URL(nom, DOSSIER), "utf8")))).toEqual([]);
  });

  it("repère un nom appelé mais publié nulle part", () => {
    expect(orphelins("essai.ts", "interface FonctionsHistoriques { paintRef(): void; inconnue(): void; }")).toEqual(["inconnue (essai.ts)"]);
  });

  it("accepte une fonction publiée et une partie de l'état", () => {
    expect(orphelins("essai.ts", "interface FonctionsHistoriques { paintSaved(): void; DATA: object; }")).toEqual([]);
  });

  it("ignore les interfaces d'un autre nom", () => {
    expect(orphelins("essai.ts", "interface Autre { inconnue(): void; }")).toEqual([]);
  });
});

describe("noms appelés par le banc de comparaison", () => {
  const banc = readFileSync(BANC, "utf8");

  it("sont tous publiés, dans l'état ou fournis par le navigateur", () => {
    // Le garde-fou porte bien sur quelque chose : le banc appelle des fonctions et lit l'état.
    expect([...nomsLibresDansLaPage(banc)].filter((nom) => EXISTANTS.has(nom)).length).toBeGreaterThan(20);
    expect(inconnusDuBanc(banc)).toEqual([]);
  });

  it("couvrent toutes les fonctions publiées pour lui", () => {
    const libres = nomsLibresDansLaPage(banc);
    expect(PUBLIEES.filter((nom) => !libres.has(nom))).toEqual([]);
  });

  it("repère une fonction appelée dans la page mais publiée nulle part", () => {
    const essai = `await page.evaluate(() => { paintRef(); inconnue(DATA); });
const lire = () => autreInconnue(document);
await page.evaluate(lire);`;
    expect(inconnusDuBanc(essai)).toEqual(["autreInconnue", "inconnue"]);
  });

  it("ignore les noms déclarés dans la page et les noms de propriété", () => {
    const essai = `await page.evaluate((x) => { const y = x.paintInconnu; window.appelsBanc = { cle: y }; });`;
    expect(inconnusDuBanc(essai)).toEqual([]);
  });

  it("ignore ce qui ne s'exécute pas dans la page", () => {
    expect(inconnusDuBanc(`inconnue(); await page.locator("#x").click();`)).toEqual([]);
  });
});
