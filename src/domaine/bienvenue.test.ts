// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  CLE_BIENVENUE,
  anneesEntreePromotionsEnCours,
  bienvenueFaite,
  debutAnneeScolaire,
  diplomeDeVersion,
  doitProposerBienvenue,
  installerPremierEtablissement,
  type Installation,
} from "./bienvenue";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS } from "./echange/modele";

function identifiants(): () => string {
  let rang = 0;
  return () => {
    rang += 1;
    return `p${String(rang)}`;
  };
}

const DONNEES = JSON.stringify({
  diplomes: [{ id: "d1", nom: "DN MADE", mention: "Objet" }],
  versions: { d1: [{ id: "v1", date: "2026-11-15" }] },
  etab: { nom: "", uai: "0000000A" },
});

function installation(modification: Partial<Installation> = {}): Installation {
  return { nomEtablissement: "Lycée des Arts", diplomeId: "d1", debutAnnee: 2026, genererIdentifiant: identifiants(), ...modification };
}

describe("debutAnneeScolaire", () => {
  it("compte l'année scolaire à partir de septembre", () => {
    expect(debutAnneeScolaire(new Date(2026, 8, 1))).toBe(2026);
  });

  it("rattache août à l'année scolaire commencée l'année civile précédente", () => {
    expect(debutAnneeScolaire(new Date(2026, 7, 31, 23, 59))).toBe(2025);
  });
});

describe("anneesEntreePromotionsEnCours", () => {
  it("donne trois années d'entrée pour un diplôme de trois ans, de la 1re à la 3e année", () => {
    expect(anneesEntreePromotionsEnCours(2026, 3)).toEqual([2026, 2025, 2024]);
  });

  it("prend trois ans pour une durée absente ou invalide", () => {
    expect(anneesEntreePromotionsEnCours(2026, Number.NaN)).toEqual([2026, 2025, 2024]);
    expect(anneesEntreePromotionsEnCours(2026, 0)).toEqual([2026, 2025, 2024]);
  });
});

describe("doitProposerBienvenue", () => {
  it("propose la bienvenue sur une installation vide", () => {
    expect(doitProposerBienvenue({}, false)).toBe(true);
  });

  it("ne la propose plus une fois faite", () => {
    expect(doitProposerBienvenue({ [CLE_BIENVENUE]: JSON.stringify({ faite: true }) }, false)).toBe(false);
  });

  it("ne la propose pas à une installation qui a déjà un référentiel ou des évaluations", () => {
    expect(doitProposerBienvenue({}, true)).toBe(false);
    expect(doitProposerBienvenue({ [CLE_EVALUATIONS]: JSON.stringify([{ id: "e1" }]) }, false)).toBe(false);
  });

  it("tient une note illisible pour « pas encore faite »", () => {
    expect(bienvenueFaite({ [CLE_BIENVENUE]: "{illisible" })).toBe(false);
  });
});

describe("diplomeDeVersion", () => {
  it("retrouve le diplôme qui porte une version", () => {
    expect(diplomeDeVersion({ [CLE_DONNEES]: DONNEES }, "v1")).toBe("d1");
  });

  it("rend null pour une version inconnue ou des données absentes", () => {
    expect(diplomeDeVersion({ [CLE_DONNEES]: DONNEES }, "v9")).toBeNull();
    expect(diplomeDeVersion({}, "v1")).toBeNull();
  });
});

describe("installerPremierEtablissement", () => {
  it("crée les trois promotions en cours du diplôme choisi, sans étudiants", () => {
    const resultat = installerPremierEtablissement({ [CLE_DONNEES]: DONNEES }, installation());
    expect(JSON.parse(resultat[CLE_PROMOTIONS] ?? "[]")).toEqual([
      { id: "p1", debut: 2026, diplomeId: "d1", eleves: "", liste: [] },
      { id: "p2", debut: 2025, diplomeId: "d1", eleves: "", liste: [] },
      { id: "p3", debut: 2024, diplomeId: "d1", eleves: "", liste: [] },
    ]);
  });

  it("inscrit le nom de l'établissement sans perdre ses autres champs", () => {
    const resultat = installerPremierEtablissement({ [CLE_DONNEES]: DONNEES }, installation());
    const donnees = JSON.parse(resultat[CLE_DONNEES] ?? "{}") as { etab?: unknown };
    expect(donnees.etab).toEqual({ nom: "Lycée des Arts", uai: "0000000A" });
  });

  it("note la bienvenue comme faite", () => {
    expect(bienvenueFaite(installerPremierEtablissement({}, installation({ diplomeId: null })))).toBe(true);
  });

  it("ne crée aucune promotion sans diplôme choisi", () => {
    expect(installerPremierEtablissement({ [CLE_DONNEES]: DONNEES }, installation({ diplomeId: null }))[CLE_PROMOTIONS]).toBeUndefined();
  });

  it("ne remplace pas un nom déjà saisi par un nom vide", () => {
    const avecNom = JSON.stringify({ etab: { nom: "Lycée Ancien" } });
    const resultat = installerPremierEtablissement({ [CLE_DONNEES]: avecNom }, installation({ nomEtablissement: "   " }));
    expect(resultat[CLE_DONNEES]).toBe(avecNom);
  });

  it("ne recrée pas une promotion déjà déclarée, rejouée deux fois", () => {
    const une = installerPremierEtablissement({ [CLE_DONNEES]: DONNEES }, installation());
    const deux = installerPremierEtablissement(une, installation({ genererIdentifiant: () => "autre" }));
    expect(JSON.parse(deux[CLE_PROMOTIONS] ?? "[]")).toHaveLength(3);
  });

  it("suit la durée du diplôme quand elle est renseignée", () => {
    const deuxAns = JSON.stringify({ diplomes: [{ id: "d1", duree: 2 }] });
    const resultat = installerPremierEtablissement({ [CLE_DONNEES]: deuxAns }, installation());
    expect(JSON.parse(resultat[CLE_PROMOTIONS] ?? "[]")).toHaveLength(2);
  });
});
