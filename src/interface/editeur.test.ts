// SPDX-License-Identifier: CECILL-2.1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publierEditeur, enregistrerDansLaListe, estBrouillon, etatEnregistrement, contexteSaisie } from "./editeur";
import { etat, etatVide } from "./etat";
import { publierVersionsReferentiel } from "./versions-referentiel";

let stockage: Map<string, string>;

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.donnees = { activeDiplome: "d1", diplomes: [{ id: "d1" }] };
  etat.ui = { step: 1, sel: [] };
  stockage = new Map();
  const fenetre: Record<string, unknown> = {
    suiviOf: (evaluation: Record<string, unknown>) => {
      evaluation.suivi = evaluation.suivi ?? { saisie: "2026-11-18" };
    },
    studentsOf: () => [{ id: "s1", nom: "Ana" }],
    lignesOf: () => ["l1"],
    ligKey: () => "one:C1",
    ligTitre: () => ({ code: "C1", lib: "Compétence" }),
  };
  publierVersionsReferentiel(fenetre, { ecrireStockage: () => undefined, promotionValide: () => true, diplomeValide: () => true, maintenant: () => new Date(0) });
  publierEditeur(fenetre, (cle, valeur) => {
    stockage.set(cle, valeur);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("enregistrement dans la liste", () => {
  it("laisse hors de la liste une évaluation pas encore commencée", () => {
    etat.evaluation = { id: "f1", titre: "", items: [] };
    enregistrerDansLaListe(false);
    expect(etat.evaluations).toEqual([]);
    expect(etatEnregistrement()).toBe("vide");
  });

  it("range en brouillon une évaluation commencée, puis la valide", () => {
    etat.evaluation = { id: "f1", titre: "Maquette", items: [] };
    enregistrerDansLaListe(false);
    expect(etat.evaluations).toHaveLength(1);
    expect(etat.evaluations[0]?.brouillon).toBe(true);
    expect(estBrouillon()).toBe(true);
    enregistrerDansLaListe(true);
    expect(etat.evaluations).toHaveLength(1);
    expect(etat.evaluations[0]?.brouillon).toBeUndefined();
    expect(estBrouillon()).toBe(false);
    expect(etatEnregistrement()).toBe("liste");
    expect(JSON.parse(stockage.get("dnmade.fiches") ?? "[]")).toHaveLength(1);
  });

  it("range une copie, que les modifications suivantes ne touchent pas", () => {
    etat.evaluation = { id: "f1", titre: "Maquette", items: [] };
    enregistrerDansLaListe(true);
    etat.evaluation.titre = "Autre";
    expect(etat.evaluations[0]?.titre).toBe("Maquette");
  });
});

describe("contexte de la saisie des étudiants", () => {
  it("crée les résultats absents et lit les lignes de l'évaluation", () => {
    etat.evaluation = { id: "f1", res: null, niveaux: ["A", "B"] };
    const contexte = contexteSaisie();
    expect(etat.evaluation.res).toEqual({});
    expect(contexte.lignes).toEqual([{ cle: "one:C1", code: "C1", libelle: "Compétence" }]);
    expect(contexte.vue).toEqual({ mode: "grille", etudiant: "" });
  });

  it("retient la vue choisie", () => {
    etat.evaluation = { id: "f1", res: {} };
    contexteSaisie().retenirVue({ mode: "fiche", etudiant: "s1" });
    expect(etat.ui).toMatchObject({ emode: "fiche", eleve: "s1" });
  });
});
