// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { CLE_PARCOURS, doitLancerAuDemarrage, estIdentifiantParcours, lireAvancement, lireParcoursVus, noterParcoursVu } from "./parcours";

const DONNEES_COMPLETES = {
  "dnmade.data": JSON.stringify({
    dico: { competences: [{ id: "c0" }] },
    enseignants: [{ id: "t1" }, { id: "t2" }],
    affectH: { "2026-2027": { p1: { e0: ["t1"] } } },
  }),
  "dnmade.promos": JSON.stringify([
    { id: "p1", liste: [{ id: "s1" }, { id: "s2" }] },
    { id: "p2", eleves: "Léa Martin\n\nNoé Petit\n" },
  ]),
  "dnmade.fiches": JSON.stringify([{ id: "f1" }]),
  "dnmade.modules": JSON.stringify({ eleves: true, dn: false }),
};

describe("lireAvancement", () => {
  it("compte ce qui est en place dans une installation remplie", () => {
    expect(lireAvancement(DONNEES_COMPLETES)).toEqual({
      referentiel: true,
      promotions: 2,
      elevesInscrits: 4,
      enseignants: 2,
      repartition: true,
      evaluations: 1,
      moduleEleves: true,
      moduleNiveaux: false,
    });
  });

  it("ne voit rien de fait sur une installation vide", () => {
    expect(lireAvancement({})).toEqual({
      referentiel: false,
      promotions: 0,
      elevesInscrits: 0,
      enseignants: 0,
      repartition: false,
      evaluations: 0,
      moduleEleves: false,
      moduleNiveaux: false,
    });
  });

  it("tient pour vides des entrées illisibles", () => {
    const avancement = lireAvancement({ "dnmade.data": "{pas du json", "dnmade.promos": '"texte"', "dnmade.modules": "[]" });
    expect(avancement.referentiel).toBe(false);
    expect(avancement.promotions).toBe(0);
    expect(avancement.moduleEleves).toBe(false);
  });

  it("ne compte pas une répartition dont toutes les listes sont vides", () => {
    const donnees = JSON.stringify({ affectH: { "2026-2027": { p1: { e0: [], e1: [] } } } });
    expect(lireAvancement({ "dnmade.data": donnees }).repartition).toBe(false);
  });

  it("reconnaît l'ancienne répartition non datée", () => {
    const donnees = JSON.stringify({ affect: { p1: { e0: ["t1"] } } });
    expect(lireAvancement({ "dnmade.data": donnees }).repartition).toBe(true);
  });
});

describe("visites vues", () => {
  it("lance la prise en main tant qu'elle n'a pas été vue", () => {
    expect(doitLancerAuDemarrage({})).toBe(true);
  });

  it("ne relance pas la prise en main une fois vue ou passée", () => {
    expect(doitLancerAuDemarrage({ [CLE_PARCOURS]: noterParcoursVu(undefined, "prise-en-main") })).toBe(false);
  });

  it("note une visite sans doublon et ignore les identifiants inconnus", () => {
    const texte = noterParcoursVu(JSON.stringify({ vus: ["eleves", "inconnu", "eleves"] }), "eleves");
    expect(lireParcoursVus(texte)).toEqual(["eleves"]);
  });

  it("relance la prise en main si l'entrée est illisible", () => {
    expect(doitLancerAuDemarrage({ [CLE_PARCOURS]: "corrompu" })).toBe(true);
  });

  it("reconnaît les identifiants de visite", () => {
    expect(estIdentifiantParcours("niveaux")).toBe(true);
    expect(estIdentifiantParcours("autre")).toBe(false);
    expect(estIdentifiantParcours(undefined)).toBe(false);
  });
});
