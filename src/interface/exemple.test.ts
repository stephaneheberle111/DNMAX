// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide } from "./etat";
import { brancherExemple, remplirResultats, validerExemple } from "./exemple";
import { brancherVersionsReferentiel, versionActive } from "./versions-referentiel";

beforeEach(() => {
  Object.assign(etat, etatVide());
  brancherVersionsReferentiel({ ecrireStockage: () => undefined, promotionValide: () => false, diplomeValide: () => false, maintenant: () => new Date(0) });
  brancherExemple(() => undefined, () => null, () => Promise.resolve(null));
});

describe("résultats de l'exemple", () => {
  it("tire les mêmes résultats pour la même graine", () => {
    const une = remplirResultats({ niveaux: ["A", "B", "C", "D"] }, 11, 3);
    const autre = remplirResultats({ niveaux: ["A", "B", "C", "D"] }, 11, 3);
    expect(une.res).toEqual(autre.res);
    // Seuls les étudiants de l'évaluation peuvent avoir des résultats.
    expect(Object.keys(une.res as object).every((id) => ["a", "b"].includes(id))).toBe(true);
  });
});

describe("validation du référentiel de l'exemple", () => {
  it("crée une version attestée et en vigueur pour chaque mention installée", () => {
    etat.donnees = {
      activeDiplome: "d1",
      diplomes: [{ id: "d1" }],
      refs: { d1: { ues: [], ecs: [], blocs: [], competences: [] } },
      dico: { ues: [], ecs: [], blocs: [], competences: [] },
    };
    validerExemple(["d1"]);
    expect(versionActive("d1")).toMatchObject({ note: "Exemple" });
    expect(versionActive("d1")?.attestation).toBeTruthy();
  });

  it("ne touche à rien sans mention", () => {
    etat.donnees = { activeDiplome: "d1", diplomes: [], refs: {}, dico: { ues: [], ecs: [], blocs: [], competences: [] } };
    validerExemple([]);
    expect(etat.donnees.valide).toBeUndefined();
  });
});
