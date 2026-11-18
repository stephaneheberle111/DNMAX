// SPDX-License-Identifier: CECILL-2.1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide } from "./etat";
import { allerALaValidation, allerALEtape, contexteDeLEtape, publierReferentiel } from "./referentiel";

let appels: string[];

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.ui = { tab: "saved", ref: { pane: "explorer", cp: "ues", cq: "" } };
  etat.armement = "x";
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [{ id: "d1" }, { id: "d2" }],
    refs: { d1: { ues: [{ id: "u1" }], ecs: [], blocs: [], competences: [] } },
    dico: { ues: [{ id: "u1" }, { id: "u2" }], ecs: [], blocs: [], competences: [] },
  };
  appels = [];
  // Sans navigateur : aucune zone de l'écran n'est trouvée, seuls les appels au fichier historique sont notés.
  vi.stubGlobal("document", { getElementById: () => null });
  vi.stubGlobal("window", { scrollTo: () => undefined });
  publierReferentiel({
    paintExplore: () => appels.push("explorer"),
    paintTabs: () => appels.push("onglets"),
    saveData: (redessiner?: boolean, depuisDictionnaire?: boolean) => appels.push(`enregistrer:${String(redessiner)}:${String(depuisDictionnaire)}`),
    newId: (prefixe: string) => `${prefixe}1`,
    persistData: () => appels.push("persist"),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("passages vers Constituer", () => {
  it("ouvre une étape filtrée et désarme la suppression", () => {
    allerALEtape("ecs", "EC 2");
    expect(etat.ui.ref).toMatchObject({ pane: "constituer", cp: "ecs", cq: "EC 2" });
    expect(etat.armement).toBeNull();
  });

  it("ouvre la validation depuis un autre onglet", () => {
    allerALaValidation();
    expect(etat.ui.tab).toBe("ref");
    expect(etat.ui.ref).toMatchObject({ pane: "constituer", cp: "valider" });
    expect(appels).toContain("onglets");
  });

  it("ignore une mention inconnue pour la validation", () => {
    allerALaValidation("inconnue");
    expect(etat.donnees.activeDiplome).toBe("d1");
  });
});

describe("contexte des étapes 1 à 3", () => {
  it("reprend un élément du dictionnaire dans le référentiel, une seule fois", () => {
    const contexte = contexteDeLEtape(etat.donnees, "DN MADE");
    contexte.reprendre("ues", "u2");
    contexte.reprendre("ues", "u2");
    const ues = (etat.donnees.refs as Record<string, Record<string, { id: string }[]>>).d1?.ues ?? [];
    expect(ues.map((ue) => ue.id)).toEqual(["u1", "u2"]);
    expect(appels).toEqual(["enregistrer:true:true", "enregistrer:true:true"]);
  });

  it("enregistre sans redessiner pendant la frappe", () => {
    contexteDeLEtape(etat.donnees, "DN MADE").enregistrer(false);
    expect(appels).toEqual(["enregistrer:false:undefined"]);
  });

  it("vide le filtre sans rien redessiner", () => {
    (etat.ui.ref as Record<string, unknown>).cq = "atelier";
    contexteDeLEtape(etat.donnees, "DN MADE").viderFiltre();
    expect((etat.ui.ref as Record<string, unknown>).cq).toBe("");
    expect(appels).toEqual([]);
  });
});
