// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { SIGNES, assemblerIcns, assemblerIco, niveauDetail, svgIcone } from "./icones";

describe("niveauDetail", () => {
  it("dessine le signe fin à partir de 88 px", () => {
    expect(niveauDetail(88)).toBe("fin");
    expect(niveauDetail(1024)).toBe("fin");
  });

  it("dessine le signe moyen de 40 à 87 px", () => {
    expect(niveauDetail(40)).toBe("moyen");
    expect(niveauDetail(87)).toBe("moyen");
  });

  it("dessine le signe simple sous 40 px", () => {
    expect(niveauDetail(39)).toBe("simple");
    expect(niveauDetail(16)).toBe("simple");
  });
});

describe("svgIcone", () => {
  it("pose le signe du niveau de la taille sur le pavé pétrole", () => {
    const svg = svgIcone(32);
    expect(svg).toContain('fill="#10555F"');
    expect(svg).toContain(SIGNES.simple.plein);
    expect(svg).not.toContain(SIGNES.fin.plein);
  });
});

describe("assemblerIco", () => {
  it("annonce chaque image et écrit 0 pour 256 px", () => {
    const fichier = assemblerIco([
      { taille: 16, png: new Uint8Array([1, 2]) },
      { taille: 256, png: new Uint8Array([3]) },
    ]);
    const vue = new DataView(fichier.buffer);
    expect(vue.getUint16(4, true)).toBe(2);
    expect(fichier[6]).toBe(16);
    expect(fichier[22]).toBe(0);
    expect(vue.getUint32(22 + 12, true)).toBe(6 + 32 + 2);
    expect([...fichier.slice(-3)]).toEqual([1, 2, 3]);
  });
});

describe("assemblerIcns", () => {
  it("écrit l'en-tête et la longueur totale", () => {
    const fichier = assemblerIcns([{ taille: 128, png: new Uint8Array([9, 9]) }]);
    expect(new TextDecoder().decode(fichier.slice(0, 4))).toBe("icns");
    expect(new DataView(fichier.buffer).getUint32(4)).toBe(fichier.length);
    expect(new TextDecoder().decode(fichier.slice(8, 12))).toBe("ic07");
  });

  it("refuse une taille sans type connu", () => {
    expect(() => assemblerIcns([{ taille: 48, png: new Uint8Array() }])).toThrow(/48/);
  });
});
