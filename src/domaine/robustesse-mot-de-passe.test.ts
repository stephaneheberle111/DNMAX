// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { defautsRobustesse, expliquerDefauts, motsInterditsDe } from "./robustesse-mot-de-passe";

const contexte = ["Camille", "Durand", "Lycée Jean-Moulin"];

describe("defautsRobustesse", () => {
  it("accepte une phrase de passe longue à trois types de caractères", () => {
    expect(defautsRobustesse("Le chat dort 3 fois", contexte)).toEqual([]);
  });

  it("refuse un mot de passe trop court ou d'un ou deux types de caractères", () => {
    expect(defautsRobustesse("Ab1!", contexte)).toContain("trop-court");
    expect(defautsRobustesse("toutenminuscules", contexte)).toEqual(["types"]);
  });

  it("refuse les suites et répétitions, à l'endroit comme à l'envers", () => {
    expect(defautsRobustesse("Xx!aaaa7Bcdq", contexte)).toContain("suite");
    expect(defautsRobustesse("Mon4321Code!", contexte)).toContain("suite");
    expect(defautsRobustesse("Zorro!Azer9q", contexte)).toContain("suite");
  });

  it("refuse le nom de l'application, de l'enseignant ou de l'établissement, sans tenir compte des accents", () => {
    expect(defautsRobustesse("MonDnmax!2026", contexte)).toContain("mot-evident");
    expect(defautsRobustesse("DN-MADE!x9Kp", contexte)).toContain("mot-evident");
    expect(defautsRobustesse("Durand!x9Kpq", contexte)).toContain("mot-evident");
    expect(defautsRobustesse("LYCEE!x9Kpqz", contexte)).toContain("mot-evident");
  });

  it("ignore les mots de moins de trois lettres du contexte", () => {
    expect(defautsRobustesse("Le lac bleu 7!", ["Lé", "de"])).toEqual([]);
  });

  it("refuse un mot de passe courant", () => {
    expect(defautsRobustesse("MotDePasse123", [])).toContain("courant");
  });
});

describe("expliquerDefauts", () => {
  it("dit ce qui manque, et rien quand le mot de passe convient", () => {
    expect(expliquerDefauts(["types"])).toBe("Il faut : trois types de caractères parmi minuscules, majuscules, chiffres et symboles.");
    expect(expliquerDefauts([])).toBe("");
  });
});

describe("motsInterditsDe", () => {
  it("lit le nom de l'enseignant et celui de l'établissement, et ignore des données illisibles", () => {
    expect(
      motsInterditsDe({
        "dnmax.identite": JSON.stringify({ prenom: "Camille", nomFamille: "Durand", nom: "Camille Durand" }),
        "dnmade.data": JSON.stringify({ etab: { nom: "Lycée Jean-Moulin" } }),
      }),
    ).toEqual(["Camille", "Durand", "Camille Durand", "Lycée Jean-Moulin"]);
    expect(motsInterditsDe({ "dnmax.identite": "{abîmé" })).toEqual([]);
  });
});
