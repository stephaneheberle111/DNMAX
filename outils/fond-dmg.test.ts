// SPDX-License-Identifier: CECILL-2.1
import { readFileSync } from "node:fs";
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { DENSITE_DMG, FENETRE_DMG, PLACES_DMG, inscrireDensitePng, pageFondDmg } from "./fond-dmg";

/** PNG réduit à sa signature, son en-tête et un bloc de fin : assez pour y inscrire une densité. */
function pngMinimal(): Uint8Array {
  const png = new Uint8Array(8 + 25 + 12);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const vue = new DataView(png.buffer);
  vue.setUint32(8, 13);
  png.set([0x49, 0x48, 0x44, 0x52], 12);
  png.set([0x49, 0x45, 0x4e, 0x44], 37);
  return png;
}

describe("inscrireDensitePng", () => {
  it("ajoute juste après l'en-tête la densité, en pixels par mètre, avec sa somme de contrôle", () => {
    const png = pngMinimal();
    const sortie = inscrireDensitePng(png, 2);
    const vue = new DataView(sortie.buffer);
    expect(sortie.length).toBe(png.length + 21);
    expect(Array.from(sortie.subarray(0, 33))).toEqual(Array.from(png.subarray(0, 33)));
    expect(vue.getUint32(33)).toBe(9);
    expect(String.fromCharCode(...sortie.subarray(37, 41))).toBe("pHYs");
    // 2 pixels par point, 72 points par pouce : 144 pixels par pouce, soit 5669 par mètre.
    expect(vue.getUint32(41)).toBe(5669);
    expect(vue.getUint32(45)).toBe(5669);
    expect(vue.getUint8(49)).toBe(1);
    expect(vue.getUint32(50)).toBe(crc32(sortie.subarray(37, 50)));
    expect(String.fromCharCode(...sortie.subarray(58, 62))).toBe("IEND");
  });

  it("refuse un fichier qui n'est pas un PNG", () => {
    expect(() => inscrireDensitePng(new Uint8Array(64), 2)).toThrow(/n'est pas une image PNG/);
    expect(() => inscrireDensitePng(new Uint8Array(0), 2)).toThrow(/n'est pas une image PNG/);
  });

  it("refuse d'inscrire une seconde densité", () => {
    expect(() => inscrireDensitePng(inscrireDensitePng(pngMinimal(), 2), 2)).toThrow(/déjà une densité/);
  });

  it("refuse une densité nulle", () => {
    expect(() => inscrireDensitePng(pngMinimal(), 0)).toThrow(/Densité invalide/);
  });
});

describe("pageFondDmg", () => {
  it("place la flèche à mi-chemin des deux icônes, à leur hauteur", () => {
    expect(pageFondDmg("")).toContain(".fleche{position:absolute;left:290px;top:198px}");
  });

  it("donne à la page la taille de la fenêtre", () => {
    expect(pageFondDmg("")).toContain("body{width:660px;height:400px;");
  });
});

describe("fenêtre du .dmg", () => {
  const configuration = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
    bundle: { macOS: { dmg: { background: string; windowSize: unknown; appPosition: unknown; applicationFolderPosition: unknown } } };
  };
  const dmg = configuration.bundle.macOS.dmg;

  it("ouvre la fenêtre à la taille du dessin, les icônes aux places qu'il leur laisse", () => {
    expect(dmg.windowSize).toEqual({ width: FENETRE_DMG.largeur, height: FENETRE_DMG.hauteur });
    expect(dmg.appPosition).toEqual(PLACES_DMG.application);
    expect(dmg.applicationFolderPosition).toEqual(PLACES_DMG.dossierApplications);
  });

  it("fournit le fond à deux pixels par point", () => {
    const png = readFileSync(`src-tauri/${dmg.background}`);
    expect(png.readUInt32BE(16)).toBe(FENETRE_DMG.largeur * DENSITE_DMG);
    expect(png.readUInt32BE(20)).toBe(FENETRE_DMG.hauteur * DENSITE_DMG);
    expect(png.subarray(37, 41).toString("latin1")).toBe("pHYs");
  });
});
