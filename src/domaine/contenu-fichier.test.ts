// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { convertirEnOctets } from "./contenu-fichier";

describe("convertirEnOctets", () => {
  it("encode un texte en UTF-8", async () => {
    expect(Array.from(await convertirEnOctets("é"))).toEqual([0xc3, 0xa9]);
  });

  it("rend un tableau vide pour un texte vide", async () => {
    expect((await convertirEnOctets("")).length).toBe(0);
  });

  it("rend les octets d'un Blob", async () => {
    expect(Array.from(await convertirEnOctets(new Blob([new Uint8Array([1, 2, 3])])))).toEqual([1, 2, 3]);
  });

  it("rend les octets d'un ArrayBuffer", async () => {
    expect(Array.from(await convertirEnOctets(new Uint8Array([4, 5]).buffer))).toEqual([4, 5]);
  });

  it("rend un Uint8Array tel quel", async () => {
    const octets = new Uint8Array([6]);
    expect(await convertirEnOctets(octets)).toBe(octets);
  });
});
