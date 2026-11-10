// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { CATALOGUE, DONNEES, EMPREINTE_TRAVAIL, EMPREINTE_VERSION, PROMOTIONS, creerEvaluation } from "./jeu-essai";
import { lireDonneesEtablissement, lirePromotions } from "./modele";
import {
  calculerEmpreinteReferentiel,
  comparerBase,
  decrireBase,
  normaliserNom,
  retirerHorsContenu,
} from "./referentiel";

const donnees = lireDonneesEtablissement(JSON.stringify(DONNEES));
const promotions = lirePromotions(JSON.stringify(PROMOTIONS));

describe("retirerHorsContenu", () => {
  it("retire identifiants et couleurs à tous les niveaux, et garde le reste", () => {
    const contenu = {
      meta: { blocTint: "#fff", diplome: "DN MADE mention Objet", diplomeNom: "DN MADE", mention: "Objet", niveaux: [] },
      ues: [{ id: "u0", nom: "UE A", couleur: "#000" }],
    };
    expect(retirerHorsContenu(contenu)).toEqual({ meta: { niveaux: [] }, ues: [{ nom: "UE A" }] });
  });

  it("laisse intactes les valeurs simples", () => {
    expect(retirerHorsContenu("texte")).toBe("texte");
    expect(retirerHorsContenu(null)).toBeNull();
  });
});

describe("calculerEmpreinteReferentiel", () => {
  const referentiel = { competences: [{ id: "c0", code: "C1.1", libelle: "Analyser", couleur: "#111" }] };

  it("donne la même empreinte à deux référentiels de même contenu saisis séparément", async () => {
    const saisiAilleurs = { competences: [{ id: "c42", code: "C1.1", libelle: "Analyser", couleur: "#999" }] };
    expect(await calculerEmpreinteReferentiel(saisiAilleurs)).toBe(await calculerEmpreinteReferentiel(referentiel));
  });

  it("change quand un libellé change", async () => {
    const autreLibelle = { competences: [{ id: "c0", code: "C1.1", libelle: "Analyser un contexte" }] };
    expect(await calculerEmpreinteReferentiel(autreLibelle)).not.toBe(await calculerEmpreinteReferentiel(referentiel));
  });

  it("change quand une compétence est ajoutée", async () => {
    const plusUne = { competences: [...referentiel.competences, { id: "c1", code: "C1.2", libelle: "Autre" }] };
    expect(await calculerEmpreinteReferentiel(plusUne)).not.toBe(await calculerEmpreinteReferentiel(referentiel));
  });
});

describe("decrireBase", () => {
  it("retient la version en vigueur quand ni l'évaluation ni la promotion n'en fixent", () => {
    expect(decrireBase(creerEvaluation(), promotions, donnees, CATALOGUE)).toEqual({
      diplome: "DN MADE",
      mention: "Objet",
      empreinte: EMPREINTE_VERSION,
      dateVersion: "2025-09-01",
    });
  });

  it("retient le référentiel de travail quand aucune version n'est validée", () => {
    const sansVersion = lireDonneesEtablissement(JSON.stringify({ ...DONNEES, versions: {}, valide: {} }));
    expect(decrireBase(creerEvaluation(), promotions, sansVersion, CATALOGUE)?.empreinte).toBe(EMPREINTE_TRAVAIL);
  });

  it("ignore une version figée par l'évaluation mais disparue depuis", () => {
    expect(decrireBase(creerEvaluation({ refV: "supprimee" }), promotions, donnees, CATALOGUE)?.empreinte).toBe(
      EMPREINTE_VERSION,
    );
  });

  it("retrouve la promotion par le nom de classe quand l'identifiant ne correspond pas", () => {
    expect(decrireBase(creerEvaluation({ promoId: "" }), promotions, donnees, CATALOGUE)).not.toBeNull();
  });

  it("rend null pour une évaluation sans promotion connue", () => {
    expect(decrireBase(creerEvaluation({ promoId: "", classes: [] }), promotions, donnees, CATALOGUE)).toBeNull();
  });

  it("rend null quand le référentiel manque au catalogue", () => {
    expect(decrireBase(creerEvaluation(), promotions, donnees, [])).toBeNull();
  });
});

describe("comparerBase", () => {
  const base = { diplome: "DN MADE", mention: "Objet", dateVersion: "2025-09-01" };

  it("reconnaît une version validée de même contenu", () => {
    expect(comparerBase({ ...base, empreinte: EMPREINTE_VERSION }, CATALOGUE)).toEqual({
      etat: "identique",
      versionId: "v1",
    });
  });

  it("reconnaît le référentiel de travail de même contenu", () => {
    expect(comparerBase({ ...base, empreinte: EMPREINTE_TRAVAIL }, CATALOGUE)).toEqual({
      etat: "identique",
      versionId: "",
    });
  });

  it("préfère la version validée au référentiel de travail quand les deux ont le même contenu", () => {
    const memeContenu = CATALOGUE.map((referentiel) => ({ ...referentiel, empreinte: EMPREINTE_VERSION }));
    expect(comparerBase({ ...base, empreinte: EMPREINTE_VERSION }, memeContenu)).toEqual({
      etat: "identique",
      versionId: "v1",
    });
  });

  it("signale un référentiel différent", () => {
    expect(comparerBase({ ...base, empreinte: "0".repeat(64) }, CATALOGUE)).toEqual({ etat: "different" });
  });

  it("retrouve le diplôme malgré la casse, les accents et les espaces", () => {
    const ecritAutrement = { ...base, diplome: "  dn  made ", mention: "OBJÉT", empreinte: EMPREINTE_VERSION };
    expect(comparerBase(ecritAutrement, CATALOGUE).etat).toBe("identique");
  });

  it("signale un diplôme absent", () => {
    expect(comparerBase({ ...base, mention: "Graphisme", empreinte: "x" }, CATALOGUE)).toEqual({
      etat: "diplome-absent",
    });
  });

  it("signale une base inconnue", () => {
    expect(comparerBase(null, CATALOGUE)).toEqual({ etat: "inconnue" });
  });
});

describe("normaliserNom", () => {
  it("rend un texte vide pour un nom vide ou blanc", () => {
    expect(normaliserNom("   ")).toBe("");
  });
});
