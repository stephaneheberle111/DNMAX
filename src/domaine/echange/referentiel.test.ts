// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { calculerEmpreinte } from "../empreinte";
import { DONNEES, PROMOTIONS, REFERENTIEL_A, REFERENTIEL_B, creerEvaluation } from "./jeu-essai";
import { PARTIES_REFERENTIEL, lireDonneesEtablissement, lirePromotions } from "./modele";
import { comparerBase, decrireBase, normaliserNom } from "./referentiel";

const donnees = lireDonneesEtablissement(JSON.stringify(DONNEES));
const promotions = lirePromotions(JSON.stringify(PROMOTIONS));

async function empreinteDe(referentiel: Record<string, unknown>): Promise<string> {
  return calculerEmpreinte(PARTIES_REFERENTIEL.map((partie) => referentiel[partie]));
}

describe("decrireBase", () => {
  it("retient la version en vigueur quand ni l'évaluation ni la promotion n'en fixent", async () => {
    expect(await decrireBase(creerEvaluation(), promotions, donnees)).toEqual({
      diplome: "DN MADE",
      mention: "Objet",
      empreinte: await empreinteDe(REFERENTIEL_A),
      dateVersion: "2025-09-01",
    });
  });

  it("retient le référentiel de travail quand aucune version n'est validée", async () => {
    const sansVersion = lireDonneesEtablissement(JSON.stringify({ ...DONNEES, versions: {}, valide: {} }));
    const base = await decrireBase(creerEvaluation(), promotions, sansVersion);
    expect(base?.empreinte).toBe(await empreinteDe(REFERENTIEL_B));
    expect(base?.dateVersion).toBe("");
  });

  it("retrouve la promotion par le nom de classe quand l'identifiant ne correspond pas", async () => {
    expect(await decrireBase(creerEvaluation({ promoId: "" }), promotions, donnees)).not.toBeNull();
  });

  it("rend null pour une évaluation sans promotion connue", async () => {
    expect(await decrireBase(creerEvaluation({ promoId: "", classes: [] }), promotions, donnees)).toBeNull();
  });
});

describe("comparerBase", () => {
  const base = { diplome: "DN MADE", mention: "Objet", dateVersion: "2025-09-01" };

  it("reconnaît une version validée de même contenu", async () => {
    const empreinte = await empreinteDe(REFERENTIEL_A);
    expect(await comparerBase({ ...base, empreinte }, donnees)).toEqual({ etat: "identique", versionId: "v1" });
  });

  it("reconnaît le référentiel de travail de même contenu", async () => {
    const empreinte = await empreinteDe(REFERENTIEL_B);
    expect(await comparerBase({ ...base, empreinte }, donnees)).toEqual({ etat: "identique", versionId: "" });
  });

  it("signale un référentiel différent", async () => {
    expect(await comparerBase({ ...base, empreinte: "0".repeat(64) }, donnees)).toEqual({ etat: "different" });
  });

  it("retrouve le diplôme malgré la casse, les accents et les espaces", async () => {
    const empreinte = await empreinteDe(REFERENTIEL_A);
    const ecritAutrement = { ...base, diplome: "  dn  made ", mention: "OBJÉT", empreinte };
    expect((await comparerBase(ecritAutrement, donnees)).etat).toBe("identique");
  });

  it("signale un diplôme absent", async () => {
    expect(await comparerBase({ ...base, mention: "Graphisme", empreinte: "x" }, donnees)).toEqual({
      etat: "diplome-absent",
    });
  });

  it("signale une base inconnue", async () => {
    expect(await comparerBase(null, donnees)).toEqual({ etat: "inconnue" });
  });
});

describe("normaliserNom", () => {
  it("rend un texte vide pour un nom vide ou blanc", () => {
    expect(normaliserNom("   ")).toBe("");
  });
});
