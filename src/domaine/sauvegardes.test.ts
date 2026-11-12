// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { decrireSauvegarde, ecrireTaille, estListeSauvegardes, type Sauvegarde } from "./sauvegardes";

const QUOTIDIENNE: Sauvegarde = { nom: "coffre-2026-03-09.dnmax", nature: "quotidienne", horodatage: "2026-03-09", taille: 2048 };
const MISE_DE_COTE: Sauvegarde = {
  nom: "avant-restauration-2026-03-09-140507.dnmax",
  nature: "avant-restauration",
  horodatage: "2026-03-09T14:05:07Z",
  taille: 2048,
};

describe("estListeSauvegardes", () => {
  it("accepte une liste vide", () => {
    expect(estListeSauvegardes([])).toBe(true);
  });

  it("accepte des sauvegardes bien formées", () => {
    expect(estListeSauvegardes([MISE_DE_COTE, QUOTIDIENNE])).toBe(true);
  });

  it("refuse une réponse qui n'est pas une liste", () => {
    expect(estListeSauvegardes({ nom: "coffre-2026-03-09.dnmax" })).toBe(false);
    expect(estListeSauvegardes(null)).toBe(false);
  });

  it("refuse une nature inconnue ou un horodatage qui ne lui correspond pas", () => {
    expect(estListeSauvegardes([{ ...QUOTIDIENNE, nature: "manuelle" }])).toBe(false);
    expect(estListeSauvegardes([{ ...QUOTIDIENNE, horodatage: "2026-03-09T14:05:07Z" }])).toBe(false);
    expect(estListeSauvegardes([{ ...MISE_DE_COTE, horodatage: "2026-03-09" }])).toBe(false);
  });

  it("refuse une taille négative, fractionnaire ou absente", () => {
    expect(estListeSauvegardes([{ ...QUOTIDIENNE, taille: -1 }])).toBe(false);
    expect(estListeSauvegardes([{ ...QUOTIDIENNE, taille: 1.5 }])).toBe(false);
    expect(estListeSauvegardes([{ nom: "a", nature: "quotidienne", horodatage: "2026-03-09" }])).toBe(false);
  });

  it("refuse un nom vide", () => {
    expect(estListeSauvegardes([{ ...QUOTIDIENNE, nom: "" }])).toBe(false);
  });
});

describe("decrireSauvegarde", () => {
  it("écrit le jour d'une sauvegarde quotidienne sans le décaler", () => {
    expect(decrireSauvegarde(QUOTIDIENNE, "Pacific/Pago_Pago")).toBe("Sauvegarde du lundi 9 mars 2026");
  });

  it("écrit l'heure locale d'une copie mise de côté", () => {
    expect(decrireSauvegarde(MISE_DE_COTE, "Europe/Paris")).toBe(
      "État mis de côté avant la restauration du lundi 9 mars 2026 à 15:05",
    );
  });

  it("change de jour quand le fuseau le demande", () => {
    const tardive: Sauvegarde = { ...MISE_DE_COTE, horodatage: "2026-03-09T23:30:00Z" };
    expect(decrireSauvegarde(tardive, "Europe/Paris")).toContain("mardi 10 mars 2026 à 00:30");
  });
});

describe("ecrireTaille", () => {
  it("écrit zéro et un octet", () => {
    expect(ecrireTaille(0)).toBe("0 octet");
    expect(ecrireTaille(1)).toBe("1 octet");
  });

  it("passe en Ko à 1024 octets", () => {
    expect(ecrireTaille(1023)).toBe("1023 octets");
    expect(ecrireTaille(1024)).toBe("1 Ko");
  });

  it("écrit les Mo avec une décimale et une virgule", () => {
    expect(ecrireTaille(1572864)).toBe("1,5 Mo");
  });
});
