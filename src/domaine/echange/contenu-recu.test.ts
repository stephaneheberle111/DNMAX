// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { assainirContenuRecu, estDateIso, estIdentifiantSur } from "./contenu-recu";

describe("estIdentifiantSur", () => {
  it("accepte les identifiants que l'application produit", () => {
    for (const identifiant of ["u0", "e12", "cmb3k9x2ab", "eval1", "d1a2b3c4d5e6", "t-1_2.3"]) {
      expect(estIdentifiantSur(identifiant)).toBe(true);
    }
  });

  it("refuse le balisage, les espaces, le vide, le trop long et les noms réservés", () => {
    for (const identifiant of ['x"><b>', "a b", "", "a".repeat(65), "__proto__", "constructor", "prototype", "é1", "-a"]) {
      expect(estIdentifiantSur(identifiant)).toBe(false);
    }
  });
});

describe("estDateIso", () => {
  it("accepte une date produite par toISOString", () => {
    expect(estDateIso("2026-02-01T00:00:00.000Z")).toBe(true);
  });

  it("refuse un texte libre et une date impossible", () => {
    expect(estDateIso("9999 toujours")).toBe(false);
    expect(estDateIso("2026-13-45T00:00:00.000Z")).toBe(false);
    expect(estDateIso("")).toBe(false);
  });
});

describe("assainirContenuRecu", () => {
  it("accepte un contenu ordinaire sans le modifier", () => {
    const contenu = { id: "u1", ueId: "", ecIds: ["e1", "e2"], couleur: "#79A9D3", nom: "Atelier <création>" };
    const copie = structuredClone(contenu);
    expect(assainirContenuRecu(contenu)).toBe(true);
    expect(contenu).toEqual(copie);
  });

  it("refuse un identifiant douteux, où qu'il soit", () => {
    expect(assainirContenuRecu({ listes: [{ id: "ok" }, { ueId: 'u1" onload="x' }] })).toBe(false);
    expect(assainirContenuRecu({ ecIds: ["e1", "<e2>"] })).toBe(false);
  });

  it("refuse une clé réservée du langage", () => {
    expect(assainirContenuRecu(JSON.parse('{"res":{"__proto__":{}}}'))).toBe(false);
    expect(assainirContenuRecu({ a: [{ constructor: 1 }] })).toBe(false);
  });

  it("retire une couleur qui n'est pas une couleur hexadécimale", () => {
    const contenu = { ues: [{ id: "u1", couleur: "red;position:fixed;inset:0" }, { id: "u2", couleur: "#abc" }] };
    expect(assainirContenuRecu(contenu)).toBe(true);
    expect(contenu.ues[0]).toEqual({ id: "u1" });
    expect(contenu.ues[1]?.couleur).toBe("#abc");
  });

  it("refuse un contenu imbriqué trop profondément", () => {
    let contenu: unknown = {};
    for (let niveau = 0; niveau < 200; niveau++) contenu = { a: contenu };
    expect(assainirContenuRecu(contenu)).toBe(false);
  });
});
