// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  CLE_PARCOURS,
  colleguesDeclares,
  doitLancerAuDemarrage,
  estIdentifiantParcours,
  lireAvancement,
  lireParcoursVus,
  lireReprise,
  noterParcoursVu,
} from "./parcours";

const DONNEES_COMPLETES = {
  "dnmade.data": JSON.stringify({
    dico: { competences: [{ id: "c0" }] },
    diplomes: [{ id: "d0", nom: "DN MADE", mention: "Objet" }],
    versions: { d0: [{ id: "v1", date: "2026-09-01", attestation: "2026-09-01" }] },
    valide: { d0: "v1" },
    enseignants: [{ id: "t1" }, { id: "t2" }],
    affectH: { "2026-2027": { p1: { e0: ["t1"] } } },
  }),
  "dnmade.promos": JSON.stringify([
    { id: "p1", liste: [{ id: "s1" }, { id: "s2" }] },
    { id: "p2", eleves: "Léa Martin\n\nNoé Petit\n" },
  ]),
  "dnmade.fiches": JSON.stringify([{ id: "f1" }, { id: "f2", titre: "Commencée", brouillon: true }]),
  "dnmade.modules": JSON.stringify({ eleves: true, dn: false }),
};

describe("lireAvancement", () => {
  it("compte ce qui est en place dans une installation remplie", () => {
    expect(lireAvancement(DONNEES_COMPLETES)).toEqual({
      referentiel: true,
      referentielValide: true,
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
      referentielValide: false,
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

  it("compte une évaluation enregistrée", () => {
    const evaluations = JSON.stringify([{ id: "f1", titre: "Fiche de lecture" }]);
    expect(lireAvancement({ "dnmade.fiches": evaluations }).evaluations).toBe(1);
  });

  it("ne compte pas un brouillon", () => {
    const evaluations = JSON.stringify([{ id: "f1", titre: "Fiche de lecture", brouillon: true }]);
    expect(lireAvancement({ "dnmade.fiches": evaluations }).evaluations).toBe(0);
  });

  it("ne tient pour brouillon que la marque exacte posée par l'application", () => {
    const evaluations = JSON.stringify([{ id: "f1", brouillon: false }, { id: "f2", brouillon: "oui" }]);
    expect(lireAvancement({ "dnmade.fiches": evaluations }).evaluations).toBe(2);
  });

  it("ne compte pas une répartition dont toutes les listes sont vides", () => {
    const donnees = JSON.stringify({ affectH: { "2026-2027": { p1: { e0: [], e1: [] } } } });
    expect(lireAvancement({ "dnmade.data": donnees }).repartition).toBe(false);
  });

  it("reconnaît l'ancienne répartition non datée", () => {
    const donnees = JSON.stringify({ affect: { p1: { e0: ["t1"] } } });
    expect(lireAvancement({ "dnmade.data": donnees }).repartition).toBe(true);
  });

  it("ne tient pas pour validé un référentiel installé dont la version n'est pas attestée", () => {
    const donnees = JSON.stringify({
      dico: { competences: [{ id: "c0" }] },
      diplomes: [{ id: "d0", nom: "DN MADE", mention: "Objet" }],
      versions: { d0: [{ id: "v1", date: "2026-09-01", note: "Reçu de Noé Baptiste" }] },
      valide: { d0: "v1" },
    });
    const avancement = lireAvancement({ "dnmade.data": donnees });
    expect(avancement.referentiel).toBe(true);
    expect(avancement.referentielValide).toBe(false);
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

describe("lireReprise", () => {
  it("relit l'étape notée", () => {
    expect(lireReprise(JSON.stringify({ identifiant: "prise-en-main", index: 3 }))).toEqual({ identifiant: "prise-en-main", index: 3 });
  });

  it("ignore une note absente ou illisible", () => {
    expect(lireReprise(null)).toBeNull();
    expect(lireReprise("{")).toBeNull();
  });

  it("ignore une visite inconnue ou un index invalide", () => {
    expect(lireReprise(JSON.stringify({ identifiant: "autre", index: 1 }))).toBeNull();
    expect(lireReprise(JSON.stringify({ identifiant: "eleves", index: -1 }))).toBeNull();
    expect(lireReprise(JSON.stringify({ identifiant: "eleves", index: 1.5 }))).toBeNull();
  });
});

describe("colleguesDeclares", () => {
  it("ne compte pas l'enseignant de l'installation, seul dans la liste", () => {
    expect(colleguesDeclares({ enseignants: 1 })).toBe(false);
  });

  it("voit l'équipe déclarée dès un collègue ajouté", () => {
    expect(colleguesDeclares({ enseignants: 2 })).toBe(true);
  });

  it("ne voit rien de déclaré dans une liste vide", () => {
    expect(colleguesDeclares({ enseignants: 0 })).toBe(false);
  });
});
