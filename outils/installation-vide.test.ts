// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { ecartsInstallationVide } from "./installation-vide";

const VIERGE = {
  "dnmade.data": JSON.stringify({
    diplomes: [{ id: "d0", nom: "", mention: "", cadre: true }],
    dico: { ues: [], ecs: [], blocs: [], competences: [] },
    refs: { d0: { ues: [], ecs: [], blocs: [], competences: [] } },
    enseignants: [],
    livrables: ["Carnet de projet", "Diaporama"],
  }),
};

describe("ecartsInstallationVide", () => {
  it("accepte une installation vierge avec le cadre et les types de livrables", () => {
    expect(ecartsInstallationVide(VIERGE)).toEqual([]);
  });

  it("signale un enseignant, une promotion ou une évaluation livrés", () => {
    const donnees = JSON.stringify({ enseignants: [{ id: "t1" }], promos: [{ id: "p" }], fiches: [{ id: "f" }] });
    expect(ecartsInstallationVide({ "dnmade.data": donnees })).toEqual([
      "données livrées : enseignants",
      "données livrées : promos",
      "données livrées : fiches",
    ]);
  });

  it("signale un référentiel, un diplôme nommé ou un établissement renseigné", () => {
    const donnees = JSON.stringify({
      dico: { competences: [{ code: "C1.1" }] },
      diplomes: [{ id: "d0", nom: "DN MADE", mention: "Objet" }],
      etab: { nom: "Lycée", ville: "" },
    });
    expect(ecartsInstallationVide({ "dnmade.data": donnees })).toEqual([
      "référentiel livré : competences",
      "établissement renseigné",
      "diplôme livré : DN MADE Objet",
    ]);
  });

  it("signale toute autre entrée présente au démarrage", () => {
    expect(ecartsInstallationVide({ ...VIERGE, "dnmade.promos": "[]" })).toEqual(["entrée inattendue au démarrage : dnmade.promos"]);
  });

  it("signale des données illisibles", () => {
    expect(ecartsInstallationVide({ "dnmade.data": "{" })).toEqual(["dnmade.data illisible"]);
  });
});
