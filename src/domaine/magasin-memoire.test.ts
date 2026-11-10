// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from "vitest";
import { MagasinMemoire, type Entrees } from "./magasin-memoire";

function creerMagasin(entreesInitiales: Entrees = {}) {
  const surChangement = vi.fn<(entrees: Entrees) => void>();
  return { magasin: new MagasinMemoire(entreesInitiales, surChangement), surChangement };
}

describe("MagasinMemoire", () => {
  it("rend null pour une clé absente", () => {
    expect(creerMagasin().magasin.getItem("inconnue")).toBeNull();
  });

  it("rend les valeurs fournies au départ", () => {
    expect(creerMagasin({ a: "1" }).magasin.getItem("a")).toBe("1");
  });

  it("distingue une valeur vide d'une clé absente", () => {
    expect(creerMagasin({ vide: "" }).magasin.getItem("vide")).toBe("");
  });

  it("enregistre une valeur et prévient avec toutes les entrées", () => {
    const { magasin, surChangement } = creerMagasin({ a: "1" });
    magasin.setItem("b", "2");
    expect(magasin.getItem("b")).toBe("2");
    expect(surChangement).toHaveBeenCalledExactlyOnceWith({ a: "1", b: "2" });
  });

  it("ne prévient pas quand la valeur écrite est identique", () => {
    const { magasin, surChangement } = creerMagasin({ a: "1" });
    magasin.setItem("a", "1");
    expect(surChangement).not.toHaveBeenCalled();
  });

  it("supprime une clé et prévient", () => {
    const { magasin, surChangement } = creerMagasin({ a: "1" });
    magasin.removeItem("a");
    expect(magasin.getItem("a")).toBeNull();
    expect(surChangement).toHaveBeenCalledExactlyOnceWith({});
  });

  it("ne prévient pas quand la clé à supprimer n'existe pas", () => {
    const { magasin, surChangement } = creerMagasin();
    magasin.removeItem("absente");
    expect(surChangement).not.toHaveBeenCalled();
  });

  it("accepte des clés qui portent le nom de propriétés natives", () => {
    const { magasin } = creerMagasin();
    expect(magasin.getItem("constructor")).toBeNull();
    magasin.setItem("__proto__", "x");
    expect(magasin.getItem("__proto__")).toBe("x");
  });

  it("rend une copie : la modifier ne change pas le magasin", () => {
    const { magasin } = creerMagasin({ a: "1" });
    const copie = magasin.entrees() as Record<string, string>;
    copie.a = "modifiée";
    expect(magasin.getItem("a")).toBe("1");
  });
});
