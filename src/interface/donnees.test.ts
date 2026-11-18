// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide } from "./etat";
import {
  anneeCode,
  critLabel,
  dipVisibles,
  ecCodeAt,
  ecCodeLbl,
  ecCodeShort,
  livrNames,
  modDeps,
  newId,
  persistData,
  publierDonnees,
  saveData,
  savePrefs,
} from "./donnees";

let ecrits: [string, string][] = [];
let appels: string[] = [];
let fenetre: Record<string, unknown> = {};

function brancher(ecrire: (cle: string, valeur: string) => void = (cle, valeur) => ecrits.push([cle, valeur])): void {
  fenetre = {};
  for (const nom of ["cleanOps", "syncItemEcs", "save", "paintForm", "paintPick", "paintLignes", "paintRef", "paintOrg", "paintPrefs"]) {
    fenetre[nom] = () => appels.push(nom);
  }
  fenetre.computeREF = () => {
    appels.push("computeREF");
    return { competences: [{ code: "C1" }] };
  };
  publierDonnees(fenetre, { ecrireStockage: ecrire, maintenant: () => 36 ** 3, hasard: () => 0.5 });
}

beforeEach(() => {
  Object.assign(etat, etatVide());
  ecrits = [];
  appels = [];
  brancher();
});

describe("publierDonnees", () => {
  it("publie les fonctions sous leurs noms historiques", () => {
    for (const nom of ["saveData", "persistData", "newId", "anneeCode", "ecCodeLbl", "dipVisibles", "savePrefs", "modDeps"]) {
      expect(typeof fenetre[nom]).toBe("function");
    }
  });
});

describe("newId", () => {
  it("compose le préfixe, l'heure en base 36 et trois caractères tirés", () => {
    expect(newId("s")).toBe("s1000" + (0.5).toString(36).slice(2, 5));
  });
});

describe("codes d'un EC", () => {
  const ec = { codes: { 1: "EC 1.2", 2: "EC 9.2" } };

  it("lit le code de l'année du semestre", () => {
    expect(ecCodeAt(ec, "S3")).toBe("EC 9.2");
  });

  it("rend un texte vide sans code pour l'année, ou sans EC", () => {
    expect(ecCodeAt(ec, "S5")).toBe("");
    expect(ecCodeAt(null, "S1")).toBe("");
  });

  it("prend la première année pour un semestre inconnu", () => {
    expect(ecCodeAt(ec, "S9")).toBe("EC 1.2");
  });

  it("écrit tous les codes, en abrégeant après le premier dans une colonne étroite", () => {
    expect(ecCodeLbl(ec)).toBe("EC 1.2 · EC 9.2");
    expect(ecCodeShort(ec)).toBe("EC 1.2 · 9.2");
  });

  it("met un tiret pour un EC sans code", () => {
    expect(ecCodeLbl({})).toBe("—");
    expect(ecCodeShort(undefined)).toBe("—");
  });
});

describe("diplômes et années", () => {
  it("cache le cadre vierge d'une installation neuve à côté d'un vrai diplôme", () => {
    etat.donnees = {
      diplomes: [
        { id: "vierge", nom: "", mention: "" },
        { id: "d1", nom: "DN MADE", mention: "Objet", code: "DNO" },
      ],
      referentiels: {},
    };
    expect(dipVisibles().map((diplome) => diplome.id)).toContain("d1");
  });

  it("code une année avec le diplôme actif par défaut", () => {
    etat.donnees = { activeDiplome: "d1", diplomes: [{ id: "d1", code: "DNO" }] };
    expect(anneeCode(2)).toBe("DNO2");
  });
});

describe("livrables", () => {
  it("garde les noms renseignés, dans l'ordre", () => {
    etat.donnees = { livrables: [{ nom: "Carnet" }, { nom: "" }, { nom: "Diaporama" }] };
    expect(livrNames()).toEqual(["Carnet", "Diaporama"]);
  });
});

describe("enregistrement", () => {
  it("écrit les données et les préférences dans le stockage", () => {
    etat.donnees = { diplomes: [], dico: {}, referentiels: {} };
    etat.preferences = { critere: "Critère" };
    persistData();
    savePrefs();
    expect(ecrits.map(([cle]) => cle)).toEqual(["dnmade.data", "dnmade.prefs"]);
    expect(JSON.parse(ecrits[1]?.[1] ?? "")).toEqual({ critere: "Critère" });
  });

  it("n'interrompt pas l'interface quand le stockage refuse l'écriture", () => {
    brancher(() => {
      throw new Error("plein");
    });
    expect(() => {
      savePrefs();
    }).not.toThrow();
  });

  it("recalcule le référentiel, retire les compétences disparues et redessine l'onglet ouvert", () => {
    etat.donnees = { activeDiplome: "d1", _viewOf: "d1", diplomes: [], dico: {}, referentiels: {} };
    etat.evaluation = { items: [{ code: "C1" }, { code: "C2" }] };
    etat.ui = { tab: "pref" };
    saveData(undefined, true);
    expect(etat.referentiel).toEqual({ competences: [{ code: "C1" }] });
    expect(etat.evaluation.items).toEqual([{ code: "C1" }]);
    expect(appels).toEqual(["computeREF", "cleanOps", "syncItemEcs", "save", "paintForm", "paintPick", "paintLignes", "paintRef", "paintPrefs"]);
    expect(ecrits.map(([cle]) => cle)).toEqual(["dnmade.data"]);
  });

  it("ne redessine rien quand on le lui demande", () => {
    etat.donnees = { activeDiplome: "d1", _viewOf: "d1", diplomes: [], dico: {}, referentiels: {} };
    etat.evaluation = { items: [] };
    saveData(false, true);
    expect(appels).toEqual(["computeREF", "cleanOps", "syncItemEcs", "save"]);
  });
});

describe("modules et préférences", () => {
  it("désactive un module privé de celui qu'il requiert", () => {
    etat.modules = { base: true, eleves: false, dn: true };
    modDeps();
    expect(etat.modules.dn).toBe(false);
  });

  it("lit le libellé du critère dans les préférences", () => {
    etat.preferences = {};
    expect(typeof critLabel()).toBe("string");
  });
});
