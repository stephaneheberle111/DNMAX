// SPDX-License-Identifier: CECILL-2.1
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LETTRE_D, LETTRE_N } from "../src/identite-pieces";
import { assemblerIcns, assemblerIco, niveauDetail, svgIcone, svgIconeSansFond } from "./icones";

const FUT_DU_D = LETTRE_D.pieces[0]?.d ?? "";
const DEMI_DISQUE_DU_D = LETTRE_D.pieces[1]?.d ?? "";
const OBLIQUE_DU_N = LETTRE_N.pieces[1]?.d ?? "";

describe("niveauDetail", () => {
  it("dessine D + N à partir de 64 px", () => {
    expect(niveauDetail(64)).toBe("dn");
    expect(niveauDetail(1024)).toBe("dn");
  });

  it("dessine le D seul sous 64 px", () => {
    expect(niveauDetail(63)).toBe("d");
    expect(niveauDetail(16)).toBe("d");
  });
});

describe("svgIcone", () => {
  it("pose le D seul, blanc et ambre clair, sur le pavé pétrole arrondi en petit", () => {
    const svg = svgIcone(32);
    expect(svg).toContain('<rect x="0.5" y="0.5" width="99" height="99" rx="22" fill="#10555F"/>');
    expect(svg).toContain(`<path d="${FUT_DU_D}" fill="#FFFFFF"/>`);
    expect(svg).toContain(`<path d="${DEMI_DISQUE_DU_D}" fill="#E9B978"/>`);
    expect(svg).not.toContain(OBLIQUE_DU_N);
  });

  it("ajoute le N à partir de 64 px, à la place de la planche", () => {
    const svg = svgIcone(64);
    expect(svg).toContain('<rect width="100" height="100" rx="22" fill="#10555F"/>');
    expect(svg).toContain('<g transform="translate(6 25) scale(0.5)">');
    expect(svg).toContain(`<path d="${OBLIQUE_DU_N}" fill="#E9B978"/>`);
  });
});

describe("svgIconeSansFond", () => {
  it("dessine le D pétrole et ambre, sans pavé, pour une barre des tâches claire", () => {
    const svg = svgIconeSansFond(64, "clair");
    expect(svg).not.toContain("<rect");
    expect(svg).toContain('viewBox="-6 0 100 100"');
    expect(svg).toContain(`<path d="${FUT_DU_D}" fill="#10555F"/>`);
    expect(svg).toContain(`<path d="${DEMI_DISQUE_DU_D}" fill="#C27A2C"/>`);
  });

  it("dessine le D blanc et ambre clair pour une barre des tâches sombre", () => {
    const svg = svgIconeSansFond(64, "sombre");
    expect(svg).toContain(`<path d="${FUT_DU_D}" fill="#FFFFFF"/>`);
    expect(svg).toContain(`<path d="${DEMI_DISQUE_DU_D}" fill="#E9B978"/>`);
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

describe("icônes servies par l'interface et le site", () => {
  it("le favicon de l'application est l'icône au D seul", () => {
    expect(readFileSync("public/favicon.svg", "utf8").trim()).toBe(svgIcone(32));
  });

  it("l'icône de « À propos » est l'icône D + N", () => {
    expect(readFileSync("public/icone.svg", "utf8").trim()).toBe(svgIcone(128));
  });

  it("le favicon du site est le même que celui de l'application", () => {
    const enLigne = `data:image/svg+xml,${svgIcone(32).replaceAll('"', "'").replaceAll("#", "%23")}`;
    expect(readFileSync("site/index.html", "utf8")).toContain(`<link rel="icon" href="${enLigne}">`);
  });
});

describe("fichiers d'icônes de src-tauri/icons", () => {
  /** Largeur et hauteur lues dans l'en-tête IHDR d'un PNG. */
  const dimensions = (chemin: string): [number, number] => {
    const octets = readFileSync(chemin);
    return [octets.readUInt32BE(16), octets.readUInt32BE(20)];
  };

  it("ont les tailles que Tauri attend", () => {
    expect(dimensions("src-tauri/icons/32x32.png")).toEqual([32, 32]);
    expect(dimensions("src-tauri/icons/128x128.png")).toEqual([128, 128]);
    expect(dimensions("src-tauri/icons/128x128@2x.png")).toEqual([256, 256]);
    expect(dimensions("src-tauri/icons/icon.png")).toEqual([512, 512]);
    expect(dimensions("src-tauri/icons/barre-taches-clair.png")).toEqual([64, 64]);
    expect(dimensions("src-tauri/icons/barre-taches-sombre.png")).toEqual([64, 64]);
  });
});
