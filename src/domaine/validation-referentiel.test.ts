// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { lireDonneesEtablissementDe } from "./echange/modele";
import {
  diplomeAReferentielValide,
  promotionAReferentielValide,
  versionAttestee,
  versionSuivie,
} from "./validation-referentiel";

/** d0 : v2 attestée et en vigueur, v1 ancienne non attestée. d1 : version reçue en vigueur, non attestée. */
const DONNEES = lireDonneesEtablissementDe({
  diplomes: [
    { id: "d0", nom: "DN MADE", mention: "Objet" },
    { id: "d1", nom: "DN MADE", mention: "Espace" },
    { id: "d2", nom: "DN MADE", mention: "Graphisme" },
  ],
  versions: {
    d0: [
      { id: "v2", date: "2026-09-01", attestation: "2026-09-02" },
      { id: "v1", date: "2025-09-01" },
    ],
    d1: [{ id: "r1", date: "2026-01-10", note: "Reçu de Noé Baptiste" }],
  },
  valide: { d0: "v2", d1: "r1" },
});

describe("versionAttestee", () => {
  it("est vraie pour une version attestée par l'enseignant", () => {
    expect(versionAttestee(DONNEES, "d0", "v2")).toBe(true);
  });

  it("est fausse pour une version sans attestation", () => {
    expect(versionAttestee(DONNEES, "d0", "v1")).toBe(false);
  });

  it("est fausse pour une version inconnue ou désignée par un texte vide", () => {
    expect(versionAttestee(DONNEES, "d0", "v9")).toBe(false);
    expect(versionAttestee(DONNEES, "d0", "")).toBe(false);
    expect(versionAttestee(DONNEES, "inconnu", "v2")).toBe(false);
  });
});

describe("diplomeAReferentielValide", () => {
  it("est vrai quand la version en vigueur est attestée", () => {
    expect(diplomeAReferentielValide(DONNEES, "d0")).toBe(true);
  });

  it("est faux quand la version en vigueur a été reçue sans être attestée ici", () => {
    expect(diplomeAReferentielValide(DONNEES, "d1")).toBe(false);
  });

  it("est faux pour un diplôme qui n'a qu'un référentiel de travail", () => {
    expect(diplomeAReferentielValide(DONNEES, "d2")).toBe(false);
  });
});

describe("versionSuivie", () => {
  it("prend la version appliquée à la promotion quand elle existe", () => {
    expect(versionSuivie(DONNEES, { diplomeId: "d0", versionId: "v1" })).toBe("v1");
  });

  it("retombe sur la version en vigueur quand la version appliquée a disparu", () => {
    expect(versionSuivie(DONNEES, { diplomeId: "d0", versionId: "supprimee" })).toBe("v2");
  });

  it("rend un texte vide quand le diplôme n'a aucune version", () => {
    expect(versionSuivie(DONNEES, { diplomeId: "d2", versionId: "" })).toBe("");
  });
});

describe("promotionAReferentielValide", () => {
  it("autorise une promotion qui suit la version en vigueur attestée", () => {
    expect(promotionAReferentielValide(DONNEES, { diplomeId: "d0", versionId: "" })).toBe(true);
  });

  it("bloque une promotion restée sur une ancienne version non attestée", () => {
    expect(promotionAReferentielValide(DONNEES, { diplomeId: "d0", versionId: "v1" })).toBe(false);
  });

  it("bloque une promotion dont le diplôme n'a pas de référentiel validé", () => {
    expect(promotionAReferentielValide(DONNEES, { diplomeId: "d1", versionId: "" })).toBe(false);
    expect(promotionAReferentielValide(DONNEES, { diplomeId: "d2", versionId: "" })).toBe(false);
  });

  it("bloque une promotion rattachée à aucun diplôme connu", () => {
    expect(promotionAReferentielValide(DONNEES, { diplomeId: "", versionId: "" })).toBe(false);
  });

  it("tient pour non validées des données illisibles", () => {
    const vides = lireDonneesEtablissementDe("pas des données");
    expect(promotionAReferentielValide(vides, { diplomeId: "d0", versionId: "" })).toBe(false);
  });
});
