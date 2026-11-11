// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { identifiantsOrphelins, promotionsEchues, purgerDonneesEleves } from "./conservation";
import { CLE_BROUILLON, effacerEleve } from "./droits-eleve";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS } from "./echange/modele";
import type { Entrees } from "./magasin-memoire";
import { CLE_INSTANTANE_EXEMPLE } from "./retrait-exemple";

// Noms fictifs. Diplôme de 3 ans : la promotion 2020 sort le 1er juillet 2023.
const ANCIENNE = {
  id: "pA",
  nom: "DNO-2020-2023",
  debut: 2020,
  diplomeId: "d3",
  liste: [{ id: "sAncien", nom: "Ancien Élève" }],
  eleves: "Ancien Élève",
};
const RECENTE = {
  id: "pR",
  nom: "DNO-2024-2027",
  debut: 2024,
  diplomeId: "d3",
  liste: [{ id: "sRecent", nom: "Récent Élève" }],
  eleves: "Récent Élève",
};
// Diplôme d'un an : la promotion 2024 sort le 1er juillet 2025.
const COURTE = { id: "pC", nom: "DSAA-2024-2025", debut: 2024, diplomeId: "d1", liste: [{ id: "sCourt", nom: "Court Élève" }] };
const EVAL_ANCIENNE = {
  id: "e1",
  titre: "Projet ancien",
  promoId: "pA",
  classes: ["DNO-2020-2023"],
  eleves: "Ancien Élève",
  res: { sAncien: { n: { a: 2 } }, libre0: { n: { a: 1 } } },
};
const EVAL_RECENTE = { id: "e2", titre: "Projet récent", promoId: "pR", classes: ["DNO-2024-2027"], res: { sRecent: { n: { a: 3 } } } };
const EVAL_ORPHELINE = { id: "e3", titre: "Orpheline", res: { sParti: { n: { a: 1 } }, libre0: { n: {} } }, eleveIds: ["sParti"] };

function donnees(autres: Record<string, string> = {}): Entrees {
  return {
    [CLE_DONNEES]: JSON.stringify({ diplomes: [{ id: "d3", duree: 3 }, { id: "d1", duree: 1 }] }),
    [CLE_PROMOTIONS]: JSON.stringify([ANCIENNE, RECENTE, COURTE]),
    [CLE_EVALUATIONS]: JSON.stringify([EVAL_ANCIENNE, EVAL_RECENTE, EVAL_ORPHELINE]),
    ...autres,
  };
}

function lire(entrees: Entrees, cle: string): Record<string, unknown>[] {
  return JSON.parse(entrees[cle] ?? "[]") as Record<string, unknown>[];
}

describe("promotionsEchues", () => {
  it("propose une promotion sortie depuis plus longtemps que la durée de conservation", () => {
    expect(promotionsEchues(donnees(), "2026-11-12", 1).map((promotion) => promotion.id)).toEqual(["pA", "pC"]);
  });

  it("indique les dates de sortie et d'échéance", () => {
    const [ancienne] = promotionsEchues(donnees(), "2026-11-12", 1);
    expect(ancienne).toEqual({ id: "pA", nom: "DNO-2020-2023", sortie: "2023-07-01", echeance: "2024-07-01", eleves: 1 });
  });

  it("ne propose pas une promotion encore dans sa durée de conservation", () => {
    // La promotion d'un an est échue le 1er juillet 2026, pas la veille.
    expect(promotionsEchues(donnees(), "2026-06-30", 1).map((promotion) => promotion.id)).toEqual(["pA"]);
    expect(promotionsEchues(donnees(), "2024-06-30", 1).map((promotion) => promotion.id)).toEqual([]);
  });

  it("rend une promotion échue le jour même de son échéance", () => {
    expect(promotionsEchues(donnees(), "2024-07-01", 1).map((promotion) => promotion.id)).toEqual(["pA"]);
  });

  it("prend trois ans pour un diplôme dont la durée n'est pas renseignée", () => {
    const sansDuree = { ...donnees(), [CLE_DONNEES]: "{}" };
    expect(promotionsEchues(sansDuree, "2026-11-12", 1).map((promotion) => promotion.id)).toEqual(["pA"]);
  });

  it("ne propose ni une promotion sans élève ni une promotion sans année d'entrée", () => {
    const vides = {
      [CLE_PROMOTIONS]: JSON.stringify([
        { ...ANCIENNE, liste: [] },
        { ...ANCIENNE, id: "pX", debut: undefined },
      ]),
    };
    expect(promotionsEchues(vides, "2030-01-01", 1)).toEqual([]);
  });

  it("supporte des données vides", () => {
    expect(promotionsEchues({}, "2026-11-12", 1)).toEqual([]);
  });
});

describe("identifiantsOrphelins", () => {
  it("trouve les élèves présents dans des évaluations mais dans aucune promotion", () => {
    expect(identifiantsOrphelins(donnees())).toEqual(["sParti"]);
  });

  it("ignore les élèves des listes saisies à la main", () => {
    expect(identifiantsOrphelins(donnees())).not.toContain("libre0");
  });

  it("trouve l'élève retiré d'une promotion dont les résultats sont restés", () => {
    const retire = { ...donnees(), [CLE_PROMOTIONS]: JSON.stringify([{ ...RECENTE, liste: [] }, ANCIENNE, COURTE]) };
    expect(identifiantsOrphelins(retire)).toEqual(["sParti", "sRecent"]);
  });

  it("n'en trouve aucun quand tout est rattaché", () => {
    expect(identifiantsOrphelins({ [CLE_PROMOTIONS]: JSON.stringify([RECENTE]), [CLE_EVALUATIONS]: JSON.stringify([EVAL_RECENTE]) })).toEqual(
      [],
    );
  });
});

describe("purgerDonneesEleves", () => {
  it("vide la promotion choisie et retire les résultats de ses élèves", () => {
    const { entrees, bilan } = purgerDonneesEleves(donnees(), ["pA"], false);
    const [ancienne] = lire(entrees, CLE_PROMOTIONS);
    expect(ancienne?.liste).toEqual([]);
    expect(ancienne?.eleves).toBe("");
    expect(bilan).toEqual({ eleves: 1 });
  });

  it("garde l'évaluation, sans la liste saisie à la main restée écrite ni ses résultats", () => {
    const { entrees } = purgerDonneesEleves(donnees(), ["pA"], false);
    const [evaluation] = lire(entrees, CLE_EVALUATIONS);
    expect(evaluation?.titre).toBe("Projet ancien");
    expect(evaluation?.res).toEqual({});
    expect(evaluation?.eleves).toBe("");
  });

  it("ne touche ni aux autres promotions ni à leurs évaluations", () => {
    const { entrees } = purgerDonneesEleves(donnees(), ["pA"], false);
    expect(lire(entrees, CLE_PROMOTIONS)[1]).toEqual(RECENTE);
    expect(lire(entrees, CLE_EVALUATIONS)[1]).toEqual(EVAL_RECENTE);
    expect(lire(entrees, CLE_EVALUATIONS)[2]).toEqual(EVAL_ORPHELINE);
  });

  it("retire aussi les résultats orphelins quand c'est demandé", () => {
    const { entrees, bilan } = purgerDonneesEleves(donnees(), [], true);
    const orpheline = lire(entrees, CLE_EVALUATIONS)[2];
    expect(orpheline?.res).toEqual({ libre0: { n: {} } });
    expect(orpheline?.eleveIds).toEqual([]);
    expect(bilan).toEqual({ eleves: 1 });
  });

  it("nettoie aussi le brouillon et les copies gardées pour retirer l'exemple", () => {
    const copie = JSON.stringify({ avant: donnees(), apres: donnees() });
    const { entrees } = purgerDonneesEleves(
      donnees({ [CLE_BROUILLON]: JSON.stringify(EVAL_ANCIENNE), [CLE_INSTANTANE_EXEMPLE]: copie }),
      ["pA"],
      false,
    );
    expect(entrees[CLE_BROUILLON]).not.toContain("Ancien");
    expect(entrees[CLE_INSTANTANE_EXEMPLE]).not.toContain("Ancien");
    expect(entrees[CLE_INSTANTANE_EXEMPLE]).toContain("Récent");
  });

  it("ne change rien sans promotion choisie ni orphelin demandé", () => {
    const { entrees, bilan } = purgerDonneesEleves(donnees(), [], false);
    expect(entrees).toEqual(donnees());
    expect(bilan).toEqual({ eleves: 0 });
  });
});

describe("effacerEleve sans recherche par nom", () => {
  it("ne retire pas un homonyme d'une liste saisie à la main", () => {
    const homonyme = {
      [CLE_EVALUATIONS]: JSON.stringify([{ id: "e", eleves: "Ancien Élève", res: { libre0: { n: {} } } }]),
    };
    const { entrees } = effacerEleve(
      homonyme,
      { cle: "sAncien", nom: "Ancien Élève", identifiants: ["sAncien"], promotions: [] },
      { parNom: false },
    );
    expect(entrees[CLE_EVALUATIONS]).toBe(homonyme[CLE_EVALUATIONS]);
  });
});
