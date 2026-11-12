// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { CLE_BROUILLON, effacerEleve, extraireEleve, listerEleves, type EleveRepere } from "./droits-eleve";
import { CLE_EVALUATIONS, CLE_PROMOTIONS } from "./echange/modele";
import type { Entrees } from "./magasin-memoire";
import { CLE_INSTANTANE_EXEMPLE } from "./retrait-exemple";

// Noms fictifs.
const PROMO = {
  id: "p1",
  nom: "DNO-2025-2028",
  liste: [
    { id: "sAlice", nom: "Alice Martin" },
    { id: "sBruno", nom: "Bruno Petit" },
  ],
  eleves: "Alice Martin\nBruno Petit",
};
const RESULTAT_ALICE = { n: { "op:a": 2 }, appr: "Bon travail" };
const RESULTAT_BRUNO = { n: { "op:a": 1 } };
const EVAL_PROMO = {
  id: "e1",
  titre: "Projet",
  semestre: "S1",
  classes: ["DNO-2025-2028"],
  res: { sAlice: RESULTAT_ALICE, sBruno: RESULTAT_BRUNO },
  eleveIds: ["sAlice", "sBruno"],
};
// Liste saisie à la main : Chloé est « libre0 », Alice « libre1 », Damien « libre2 ».
const EVAL_LIBRE = {
  id: "e2",
  titre: "Croquis",
  eleves: "Chloé Roux\nAlice Martin\nDamien Faure",
  res: { libre0: { n: { x: 1 } }, libre1: { n: { x: 2 } }, libre2: { n: { x: 3 } } },
  eleveIds: ["libre1", "libre2"],
};

function donnees(autres: Record<string, string> = {}): Entrees {
  return {
    [CLE_PROMOTIONS]: JSON.stringify([PROMO]),
    [CLE_EVALUATIONS]: JSON.stringify([EVAL_PROMO, EVAL_LIBRE]),
    "dnmade.data": '{"etab":"x"}',
    ...autres,
  };
}

function lire(entrees: Entrees, cle: string): unknown {
  return JSON.parse(entrees[cle] ?? "null");
}

function repere(nom: string): EleveRepere {
  const trouve = listerEleves(donnees()).find((eleve) => eleve.nom === nom);
  if (trouve === undefined) {
    throw new Error(`élève absent : ${nom}`);
  }
  return trouve;
}

describe("listerEleves", () => {
  it("liste les élèves des promotions et ceux des seules listes saisies à la main, par ordre alphabétique", () => {
    expect(listerEleves(donnees()).map((eleve) => eleve.nom)).toEqual(["Alice Martin", "Bruno Petit", "Chloé Roux", "Damien Faure"]);
  });

  it("ne liste pas deux fois un élève de promotion aussi saisi à la main", () => {
    expect(listerEleves(donnees()).filter((eleve) => eleve.nom === "Alice Martin")).toHaveLength(1);
  });

  it("rend une liste vide sur des données vides", () => {
    expect(listerEleves({})).toEqual([]);
  });
});

describe("extraireEleve", () => {
  it("rassemble les résultats de l'élève dans chaque évaluation, par identifiant et par liste saisie", () => {
    const extrait = extraireEleve(donnees(), repere("Alice Martin"), "2026-11-12");
    expect(extrait.eleve).toEqual({ nom: "Alice Martin", promotions: ["DNO-2025-2028"] });
    expect(extrait.extraitLe).toBe("2026-11-12");
    expect(extrait.evaluations.map((evaluation) => [evaluation.titre, evaluation.resultats])).toEqual([
      ["Projet", RESULTAT_ALICE],
      ["Croquis", { n: { x: 2 } }],
    ]);
  });

  it("ne contient rien des autres élèves", () => {
    const extrait = JSON.stringify(extraireEleve(donnees(), repere("Alice Martin"), "2026-11-12"));
    expect(extrait).not.toContain("Bruno");
    expect(extrait).not.toContain("Chloé");
  });

  it("rend une liste d'évaluations vide pour un élève sans résultat", () => {
    const sansResultat: EleveRepere = { cle: "sZoe", nom: "Zoé Blanc", identifiants: ["sZoe"], promotions: [] };
    expect(extraireEleve(donnees(), sansResultat, "2026-11-12").evaluations).toEqual([]);
  });
});

describe("effacerEleve", () => {
  it("retire l'élève de sa promotion, liste et texte", () => {
    const { entrees } = effacerEleve(donnees(), repere("Alice Martin"));
    expect(lire(entrees, CLE_PROMOTIONS)).toEqual([
      { ...PROMO, liste: [{ id: "sBruno", nom: "Bruno Petit" }], eleves: "Bruno Petit" },
    ]);
  });

  it("retire ses résultats et son identifiant des évaluations, sans toucher aux autres élèves", () => {
    const { entrees } = effacerEleve(donnees(), repere("Alice Martin"));
    const [evaluation] = lire(entrees, CLE_EVALUATIONS) as [Record<string, unknown>];
    expect(evaluation.res).toEqual({ sBruno: RESULTAT_BRUNO });
    expect(evaluation.eleveIds).toEqual(["sBruno"]);
  });

  it("retire son nom d'une liste saisie à la main et renumérote les élèves suivants", () => {
    const { entrees } = effacerEleve(donnees(), repere("Alice Martin"));
    const libre = (lire(entrees, CLE_EVALUATIONS) as Record<string, unknown>[])[1];
    expect(libre?.eleves).toBe("Chloé Roux\nDamien Faure");
    expect(libre?.res).toEqual({ libre0: { n: { x: 1 } }, libre1: { n: { x: 3 } } });
    expect(libre?.eleveIds).toEqual(["libre1"]);
  });

  it("efface aussi l'élève du brouillon et des copies gardées pour retirer l'exemple", () => {
    const copie = JSON.stringify({ avant: donnees(), apres: donnees() });
    const { entrees } = effacerEleve(
      donnees({ [CLE_BROUILLON]: JSON.stringify(EVAL_PROMO), [CLE_INSTANTANE_EXEMPLE]: copie }),
      repere("Alice Martin"),
    );
    expect(entrees[CLE_BROUILLON]).not.toContain("sAlice");
    expect(entrees[CLE_INSTANTANE_EXEMPLE]).not.toContain("Alice");
    expect(entrees[CLE_INSTANTANE_EXEMPLE]).toContain("Bruno");
  });

  it("ne laisse plus aucune trace du nom ni de l'identifiant dans les données", () => {
    const { entrees } = effacerEleve(donnees({ [CLE_BROUILLON]: JSON.stringify(EVAL_LIBRE) }), repere("Alice Martin"));
    const tout = JSON.stringify(entrees);
    expect(tout).not.toContain("Alice");
    expect(tout).not.toContain("sAlice");
  });

  it("dresse le bilan de ce qui a été retiré", () => {
    const { bilan } = effacerEleve(donnees({ [CLE_BROUILLON]: JSON.stringify(EVAL_PROMO) }), repere("Alice Martin"));
    expect(bilan).toEqual({ promotions: 1, evaluations: 3, listesSaisies: 1 });
  });

  it("efface un élève saisi à la main seulement, sans toucher aux promotions", () => {
    const { entrees, bilan } = effacerEleve(donnees(), repere("Chloé Roux"));
    expect(entrees[CLE_PROMOTIONS]).toBe(donnees()[CLE_PROMOTIONS]);
    const libre = (lire(entrees, CLE_EVALUATIONS) as Record<string, unknown>[])[1];
    expect(libre?.eleves).toBe("Alice Martin\nDamien Faure");
    expect(libre?.res).toEqual({ libre0: { n: { x: 2 } }, libre1: { n: { x: 3 } } });
    expect(bilan).toEqual({ promotions: 0, evaluations: 1, listesSaisies: 1 });
  });

  it("laisse intactes les autres données", () => {
    const { entrees } = effacerEleve(donnees(), repere("Alice Martin"));
    expect(entrees["dnmade.data"]).toBe('{"etab":"x"}');
  });

  it("ne change rien pour un élève absent des données", () => {
    const absent: EleveRepere = { cle: "sZoe", nom: "Zoé Blanc", identifiants: ["sZoe"], promotions: [] };
    const { bilan } = effacerEleve(donnees(), absent);
    expect(bilan).toEqual({ promotions: 0, evaluations: 0, listesSaisies: 0 });
  });

  it("supporte des données vides ou mal formées sans lever d'erreur", () => {
    const absent: EleveRepere = { cle: "sZoe", nom: "Zoé", identifiants: ["sZoe"], promotions: [] };
    expect(() => effacerEleve({ [CLE_PROMOTIONS]: "pas du json", [CLE_BROUILLON]: "[]" }, absent)).not.toThrow();
  });
});
