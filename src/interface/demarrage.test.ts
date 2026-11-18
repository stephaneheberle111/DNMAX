// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide, type Objet } from "./etat";
import { publierDonnees } from "./donnees";
import { publierEvaluationCourante } from "./evaluation-courante";
import { brancherEtDessiner, chargerEtat, terminerDemarrage, type BranchementsDemarrage } from "./demarrage";

let stockage: Map<string, string>;
let appels: string[];
let fenetre: Record<string, unknown>;
let branchements: BranchementsDemarrage;

/** Faux élément : garde ses écouteurs pour les déclencher dans le test. */
interface FauxElement {
  ecouteurs: Record<string, (() => void)[]>;
  focalise: boolean;
  value: string;
  dataset: Record<string, string>;
  addEventListener(type: string, action: () => void): void;
  focus(): void;
}

let elements: Map<string, FauxElement>;

function element(id: string): FauxElement {
  let trouve = elements.get(id);
  if (!trouve) {
    const nouveau: FauxElement = {
      ecouteurs: {},
      focalise: false,
      value: "",
      dataset: {},
      addEventListener(type, action) {
        (nouveau.ecouteurs[type] ??= []).push(action);
      },
      focus() {
        nouveau.focalise = true;
      },
    };
    elements.set(id, nouveau);
    trouve = nouveau;
  }
  return trouve;
}

function fauxDocument(): Document {
  return {
    title: "",
    getElementById: (id: string) => element(id),
    querySelectorAll: () => [],
  } as unknown as Document;
}

function ecrireDansLeStockage(cle: string, valeur: string): void {
  stockage.set(cle, valeur);
}

function cliquer(id: string): void {
  for (const action of element(id).ecouteurs.click ?? []) action();
}

// Les tests tournent sans navigateur : les champs simulés ne sont d'aucun de ces types, et sont donc ignorés comme champs.
for (const nom of ["HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement"]) {
  (globalThis as Record<string, unknown>)[nom] ??= function TypeAbsent(): void {
    // Aucun objet simulé n'en est une instance.
  };
}

beforeEach(() => {
  Object.assign(etat, etatVide());
  stockage = new Map();
  appels = [];
  elements = new Map();
  fenetre = {};
  for (const nom of ["paintTabs", "paintForm", "paintPick", "paintLignes", "paintSaved", "paintProg", "paintRef", "paintOrg", "paintSet", "paintPrefs", "paintSteps", "paintEleves", "applySemDate", "loadDemo", "nouvelleFiche", "linkSelection"]) {
    fenetre[nom] = () => appels.push(nom);
  }
  fenetre.save = (fin?: boolean) => appels.push(fin ? "save(fin)" : "save");
  fenetre.toast = (message: string) => appels.push("toast:" + message);
  fenetre.goStep = (etape: unknown) => appels.push("goStep:" + String(etape));
  fenetre.scrollTo = () => appels.push("scrollTo");
  fenetre.computeREF = () => ({ competences: [], meta: {} });
  fenetre.versionsOf = () => [{ id: "v1", snap: { competences: [{ code: "C9" }] } }];
  fenetre.projectSnap = (_donnees: unknown, diplomeId: string, instantane: unknown) => ({ diplomeId, instantane });
  branchements = {
    lireStockage: (cle) => stockage.get(cle) ?? null,
    ecrireStockage: ecrireDansLeStockage,
    maintenant: () => new Date("2026-11-18T10:00:00Z"),
  };
  publierDonnees(fenetre, { ecrireStockage: ecrireDansLeStockage, maintenant: () => 1, hasard: () => 0.5 });
  publierEvaluationCourante(fenetre, () => 0.5);
});

describe("chargement de l'état", () => {
  it("part d'une installation neuve sans rien d'enregistré", () => {
    chargerEtat(fenetre, branchements);
    expect(Array.isArray(etat.donnees.diplomes)).toBe(true);
    expect(etat.evaluations).toEqual([]);
    expect(etat.promotions).toEqual([]);
    expect(etat.evaluation.date).toBe("2026-11-18");
    expect(etat.evaluation.semestre).toBe("S1");
    expect(etat.evaluation.id).toBe((0.5).toString(36).slice(2, 9));
    expect(etat.modules.base).toBe(true);
    expect(etat.ui.tab).toBe("saved");
    expect(etat.teinteBlocs).toBe("#D1F1DA");
  });

  it("garde les modules enregistrés et désactive celui qui perd le module qu'il requiert", () => {
    stockage.set("dnmade.modules", JSON.stringify({ eleves: false, dn: true }));
    chargerEtat(fenetre, branchements);
    expect(etat.modules.eleves).toBe(false);
    expect(etat.modules.dn).toBe(false);
  });

  it("reprend une évaluation enregistrée plutôt que le brouillon qui s'en écartait", () => {
    stockage.set("dnmade.draft", JSON.stringify({ id: "f1", titre: "Brouillon" }));
    stockage.set("dnmade.fiches", JSON.stringify([null, { id: "f1", titre: "Enregistrée", items: [] }]));
    chargerEtat(fenetre, branchements);
    expect(etat.evaluation.titre).toBe("Enregistrée");
    expect(etat.evaluation).not.toBe(etat.evaluations[1]);
  });

  it("ignore une entrée illisible et prend la valeur par défaut", () => {
    stockage.set("dnmade.promos", "{pas du json");
    chargerEtat(fenetre, branchements);
    expect(etat.promotions).toEqual([]);
  });
});

describe("branchements et premier dessin", () => {
  beforeEach(() => {
    chargerEtat(fenetre, branchements);
    appels = [];
  });

  it("dessine chaque page au démarrage, dans l'ordre", () => {
    brancherEtDessiner(fenetre, fauxDocument(), branchements);
    expect(appels).toEqual(["paintTabs", "paintForm", "paintPick", "paintSaved", "paintRef", "paintSet", "paintPrefs"]);
  });

  it("ouvre la page d'un onglet et la redessine", () => {
    brancherEtDessiner(fenetre, fauxDocument(), branchements);
    appels = [];
    cliquer("t-ref");
    expect(etat.ui.tab).toBe("ref");
    expect(appels).toEqual(["paintTabs", "paintRef"]);
  });

  it("refuse de terminer un brouillon incomplet et dit ce qui manque", () => {
    brancherEtDessiner(fenetre, fauxDocument(), branchements);
    appels = [];
    cliquer("bSave3");
    const message = appels.find((appel) => appel.startsWith("toast:")) ?? "";
    expect(message).toContain("il lui manque");
    expect(appels).not.toContain("save(fin)");
  });

  it("remet les modules par défaut et les enregistre", () => {
    etat.modules = { base: true, eleves: true };
    brancherEtDessiner(fenetre, fauxDocument(), branchements);
    cliquer("bModReset");
    expect(JSON.parse(stockage.get("dnmade.modules") ?? "{}")).toEqual(etat.modules);
  });
});

describe("ponts vers l'application", () => {
  beforeEach(() => {
    chargerEtat(fenetre, branchements);
  });

  it("ouvre les Préférences en désarmant une suppression en attente", () => {
    etat.armement = "ens1";
    const ponts = brancherEtDessiner(fenetre, fauxDocument(), branchements);
    appels = [];
    ponts.ouvrirPreferences();
    expect(etat.ui.tab).toBe("pref");
    expect(etat.armement).toBeNull();
    expect(appels).toEqual(["paintTabs", "paintPrefs", "scrollTo"]);
  });

  it("projette une version validée, et rien pour un diplôme inconnu", () => {
    const ponts = brancherEtDessiner(fenetre, fauxDocument(), branchements);
    const diplomeId = (etat.donnees.diplomes as Objet[])[0]?.id as string;
    expect(ponts.projeterReferentiel(diplomeId, "v1")).toEqual({ diplomeId, instantane: { competences: [{ code: "C9" }] } });
    expect(ponts.projeterReferentiel("inconnu", "")).toBeNull();
  });

  it("applique une règle aux enseignants et enregistre, sauf si elle ne rend rien", () => {
    const ponts = brancherEtDessiner(fenetre, fauxDocument(), branchements);
    stockage.delete("dnmade.data");
    ponts.ajusterEnseignants(() => null);
    expect(stockage.has("dnmade.data")).toBe(false);
    ponts.ajusterEnseignants(() => ({ enseignants: [{ id: "e1" }], moi: "e1" }));
    expect(etat.donnees.enseignants).toEqual([{ id: "e1" }]);
    expect(etat.donnees.moi).toBe("e1");
    expect(stockage.has("dnmade.data")).toBe(true);
  });

  it("mène au nom de l'établissement s'il manque, sinon au contact du délégué", () => {
    const ponts = brancherEtDessiner(fenetre, fauxDocument(), branchements);
    ponts.ouvrirEtablissement();
    expect(element("et-nom").focalise).toBe(true);
    etat.donnees.etab = { nom: "Lycée" };
    ponts.ouvrirEtablissement();
    expect(element("et-contactDpo").focalise).toBe(true);
  });

  it("inscrit les données dans le stockage à la fin du démarrage", () => {
    stockage.delete("dnmade.data");
    terminerDemarrage();
    expect(stockage.has("dnmade.data")).toBe(true);
  });
});
