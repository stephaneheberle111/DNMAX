// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { formaterSaisieCode, lireSaisieCode } from "./code-direct";

describe("lireSaisieCode", () => {
  it("rend les 8 chiffres d'un code saisi d'un seul tenant", () => {
    expect(lireSaisieCode("48217395")).toEqual({ code: "48217395" });
  });

  it("ignore les espaces, y compris insécables, entre les groupes", () => {
    expect(lireSaisieCode(" 4821 7395 ")).toEqual({ code: "48217395" });
    expect(lireSaisieCode("4821\u00a07395")).toEqual({ code: "48217395" });
    expect(lireSaisieCode("48 21 73 95")).toEqual({ code: "48217395" });
  });

  it("ignore les tirets et les points", () => {
    expect(lireSaisieCode("4821-7395")).toEqual({ code: "48217395" });
    expect(lireSaisieCode("48.21.73.95")).toEqual({ code: "48217395" });
  });

  it("garde les zéros de tête", () => {
    expect(lireSaisieCode("0000 0042")).toEqual({ code: "00000042" });
  });

  it("signale une saisie vide, ou faite seulement d'espaces", () => {
    expect(lireSaisieCode("")).toEqual({ erreur: "vide" });
    expect(lireSaisieCode("   ")).toEqual({ erreur: "vide" });
  });

  it("signale un code trop court ou trop long", () => {
    expect(lireSaisieCode("4821 739")).toEqual({ erreur: "trop-court" });
    expect(lireSaisieCode("4821 73950")).toEqual({ erreur: "trop-long" });
  });

  it("refuse les lettres et les chiffres d'autres écritures", () => {
    expect(lireSaisieCode("4821 739O")).toEqual({ erreur: "caractere-interdit" });
    expect(lireSaisieCode("٤٨٢١٧٣٩٥")).toEqual({ erreur: "caractere-interdit" });
  });
});

describe("formaterSaisieCode", () => {
  it("groupe les chiffres par quatre", () => {
    expect(formaterSaisieCode("48217395")).toBe("4821 7395");
  });

  it("met en forme une saisie en cours", () => {
    expect(formaterSaisieCode("482")).toBe("482");
    expect(formaterSaisieCode("48217")).toBe("4821 7");
  });

  it("retire ce qui n'est pas un chiffre et coupe à huit chiffres", () => {
    expect(formaterSaisieCode("48-21 73a95 12")).toBe("4821 7395");
  });

  it("rend une saisie vide telle quelle", () => {
    expect(formaterSaisieCode("")).toBe("");
  });
});
