// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { calculerEmpreinte, ecrireJsonCanonique } from "./empreinte";

describe("ecrireJsonCanonique", () => {
  it("trie les clés des objets, à tous les niveaux", () => {
    expect(ecrireJsonCanonique({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("conserve l'ordre des tableaux", () => {
    expect(ecrireJsonCanonique([2, 1])).toBe("[2,1]");
  });

  it("ignore les clés à valeur undefined", () => {
    expect(ecrireJsonCanonique({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("écrit null, les textes accentués et les valeurs vides", () => {
    expect(ecrireJsonCanonique(null)).toBe("null");
    expect(ecrireJsonCanonique("é\"")).toBe('"é\\""');
    expect(ecrireJsonCanonique({})).toBe("{}");
    expect(ecrireJsonCanonique([])).toBe("[]");
  });
});

describe("calculerEmpreinte", () => {
  it("donne l'empreinte SHA-256 connue d'un objet vide", async () => {
    expect(await calculerEmpreinte({})).toBe("44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a");
  });

  it("ne dépend pas de l'ordre des clés", async () => {
    expect(await calculerEmpreinte({ a: 1, b: [1, 2] })).toBe(await calculerEmpreinte({ b: [1, 2], a: 1 }));
  });

  it("change dès qu'une valeur change", async () => {
    expect(await calculerEmpreinte({ code: "C4.1" })).not.toBe(await calculerEmpreinte({ code: "C4.2" }));
  });

  it("dépend de l'ordre des tableaux", async () => {
    expect(await calculerEmpreinte([1, 2])).not.toBe(await calculerEmpreinte([2, 1]));
  });
});
