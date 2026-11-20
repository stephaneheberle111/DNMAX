// SPDX-License-Identifier: CECILL-2.1
import { existsSync, readFileSync, statSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  COULEURS_INSTALLEUR,
  ECHELLES_INSTALLEUR,
  POLICES_INSTALLEUR,
  coteALEchelle,
  encoderBmp,
  imagesInstalleur,
  svgBoutonInstalleur,
  svgLogotypeInstalleur,
  woffVersSfnt,
} from "./habillage-installeur";

const DOSSIER = "src-tauri/windows";
const HABILLAGE = readFileSync(`${DOSSIER}/habillage-installeur.nsh`, "utf8");
const MODELE = readFileSync(`${DOSSIER}/installeur.nsi`, "utf8");

describe("encoderBmp", () => {
  it("range les lignes de bas en haut, en bleu, vert, rouge, complétées à quatre octets", () => {
    // Deux pixels sur une ligne puis deux sur la suivante : rouge, vert / bleu, blanc.
    const rvba = Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
    const bmp = encoderBmp(2, 2, rvba);
    const vue = new DataView(bmp.buffer);
    expect(String.fromCharCode(bmp[0] ?? 0, bmp[1] ?? 0)).toBe("BM");
    expect(vue.getUint32(2, true)).toBe(bmp.length);
    expect(bmp.length).toBe(54 + 2 * 8);
    expect(vue.getInt32(18, true)).toBe(2);
    expect(vue.getInt32(22, true)).toBe(2);
    expect(vue.getUint16(28, true)).toBe(24);
    expect(Array.from(bmp.subarray(54, 62))).toEqual([255, 0, 0, 255, 255, 255, 0, 0]);
    expect(Array.from(bmp.subarray(62, 70))).toEqual([0, 0, 255, 0, 255, 0, 0, 0]);
  });

  it("n'ajoute aucun octet quand la ligne tombe déjà sur un multiple de quatre", () => {
    expect(encoderBmp(4, 1, new Uint8Array(16)).length).toBe(54 + 12);
  });

  it("refuse des pixels qui ne correspondent pas à la taille annoncée", () => {
    expect(() => encoderBmp(2, 2, new Uint8Array(15))).toThrow(/Pixels attendus/);
  });

  it("refuse une taille nulle", () => {
    expect(() => encoderBmp(0, 2, new Uint8Array(0))).toThrow(/Taille d'image invalide/);
  });
});

/** Police WOFF minimale : les tables données, compressées quand elles y gagnent. */
function fabriquerWoff(tables: readonly { etiquette: string; donnees: Uint8Array }[]): Uint8Array {
  const morceaux = tables.map((table) => {
    const compresse = new Uint8Array(deflateSync(table.donnees));
    return { ...table, stocke: compresse.length < table.donnees.length ? compresse : table.donnees };
  });
  const entete = 44 + 20 * tables.length;
  const woff = new Uint8Array(entete + morceaux.reduce((somme, morceau) => somme + morceau.stocke.length, 0));
  const vue = new DataView(woff.buffer);
  vue.setUint32(0, 0x774f4646);
  vue.setUint32(4, 0x00010000);
  vue.setUint16(12, tables.length);
  let position = entete;
  morceaux.forEach((morceau, rang) => {
    const entree = 44 + 20 * rang;
    for (let indice = 0; indice < 4; indice += 1) {
      vue.setUint8(entree + indice, morceau.etiquette.charCodeAt(indice));
    }
    vue.setUint32(entree + 4, position);
    vue.setUint32(entree + 8, morceau.stocke.length);
    vue.setUint32(entree + 12, morceau.donnees.length);
    vue.setUint32(entree + 16, 0xcafe0000 + rang);
    woff.set(morceau.stocke, position);
    position += morceau.stocke.length;
  });
  return woff;
}

describe("woffVersSfnt", () => {
  const longue = new Uint8Array(200).fill(7);
  const courte = Uint8Array.from([1, 2, 3, 4, 5]);

  it("rend les tables décompressées, triées par étiquette et alignées sur quatre octets", () => {
    const sfnt = woffVersSfnt(fabriquerWoff([{ etiquette: "name", donnees: longue }, { etiquette: "cmap", donnees: courte }]));
    const vue = new DataView(sfnt.buffer);
    expect(vue.getUint32(0)).toBe(0x00010000);
    expect(vue.getUint16(4)).toBe(2);
    expect(String.fromCharCode(...sfnt.subarray(12, 16))).toBe("cmap");
    expect(String.fromCharCode(...sfnt.subarray(28, 32))).toBe("name");
    expect(vue.getUint32(16)).toBe(0xcafe0001);
    const debutCmap = vue.getUint32(20);
    const debutName = vue.getUint32(36);
    expect(debutCmap).toBe(12 + 2 * 16);
    expect(Array.from(sfnt.subarray(debutCmap, debutCmap + 5))).toEqual([1, 2, 3, 4, 5]);
    expect(debutName).toBe(debutCmap + 8);
    expect(vue.getUint32(40)).toBe(200);
    expect(Array.from(sfnt.subarray(debutName, debutName + 200))).toEqual(Array.from(longue));
  });

  it("refuse un fichier qui n'est pas un WOFF", () => {
    expect(() => woffVersSfnt(new Uint8Array(64))).toThrow(/n'est pas une police WOFF/);
  });

  it("refuse un fichier vide", () => {
    expect(() => woffVersSfnt(new Uint8Array(0))).toThrow(/n'est pas une police WOFF/);
  });

  it("refuse un WOFF coupé au milieu d'une table", () => {
    const woff = fabriquerWoff([{ etiquette: "cmap", donnees: courte }]);
    expect(() => woffVersSfnt(woff.subarray(0, woff.length - 2))).toThrow(/tronquée/);
  });
});

describe("dessins de l'installeur", () => {
  it("entoure le logotype d'une marge de fond uni, pour des bords d'image nets", () => {
    const svg = svgLogotypeInstalleur(233, 47);
    expect(svg).toContain('viewBox="6 6 436 88"');
    expect(svg).toContain(`<rect x="6" y="6" width="436" height="88" fill="${COULEURS_INSTALLEUR.fond}"/>`);
  });

  it("arrondit les coins du bouton en proportion de l'échelle", () => {
    expect(svgBoutonInstalleur(190, 40, 100)).toContain('rx="7"');
    expect(svgBoutonInstalleur(380, 80, 200)).toContain('rx="14"');
  });

  it("arrondit une cote au pixel inférieur, comme l'installeur", () => {
    expect(coteALEchelle(233, 100)).toBe(233);
    expect(coteALEchelle(47, 125)).toBe(58);
    expect(coteALEchelle(47, 175)).toBe(82);
  });
});

describe("fichiers de l'installeur", () => {
  it("couvre dans habillage-installeur.nsh les mêmes échelles que le générateur", () => {
    const echelles = [...HABILLAGE.matchAll(/!insertmacro HabillageExtraireImages (\d+)/g)].map((trouve) => Number(trouve[1]));
    expect(echelles.sort((a, b) => a - b)).toEqual([...ECHELLES_INSTALLEUR]);
  });

  it("fournit chaque image à chaque échelle, à la taille que l'installeur attend", () => {
    for (const echelle of ECHELLES_INSTALLEUR) {
      for (const image of imagesInstalleur(echelle)) {
        const bmp = readFileSync(`${DOSSIER}/habillage/${image.nom}-${String(echelle)}.bmp`);
        expect(bmp.readInt32LE(18)).toBe(coteALEchelle(image.largeur, echelle));
        expect(bmp.readInt32LE(22)).toBe(coteALEchelle(image.hauteur, echelle));
      }
    }
  });

  it("donne au grand logotype, dans l'installeur, les cotes de son image", () => {
    const grand = imagesInstalleur(100).find((image) => image.nom === "logotype-grand");
    expect(HABILLAGE).toContain(`!define HABILLAGE_LOGOTYPE_LARGEUR ${String(grand?.largeur)}`);
    expect(HABILLAGE).toContain(`!define HABILLAGE_LOGOTYPE_HAUTEUR ${String(grand?.hauteur)}`);
  });

  it("fournit les polices que l'installeur charge", () => {
    for (const police of POLICES_INSTALLEUR) {
      const fichier = `${police.nom}.ttf`;
      expect(HABILLAGE).toContain(`"${fichier}"`);
      expect(existsSync(`${DOSSIER}/habillage/${fichier}`)).toBe(true);
      expect(statSync(`${DOSSIER}/habillage/${fichier}`).size).toBeGreaterThan(1000);
    }
  });

  it("garde le modèle de l'installeur à la version de Tauri dont il dérive", () => {
    // Le modèle est une copie retouchée de celui de Tauri : à chaque montée de
    // version, le comparer au nouveau modèle d'origine avant de changer ce numéro.
    const paquet = JSON.parse(readFileSync("package.json", "utf8")) as { devDependencies: Record<string, string> };
    const version = paquet.devDependencies["@tauri-apps/cli"];
    expect(MODELE).toContain(`version tauri-cli ${String(version)},`);
  });

  it("branche le modèle, les crochets et l'icône dans la configuration de Tauri", () => {
    const configuration = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
      bundle: { windows: { nsis: Record<string, unknown> } };
    };
    const nsis = configuration.bundle.windows.nsis;
    expect(nsis.template).toBe("windows/installeur.nsi");
    expect(nsis.installerHooks).toBe("windows/crochets-installeur.nsh");
    expect(existsSync(`src-tauri/${String(nsis.installerIcon)}`)).toBe(true);
    expect(existsSync(`src-tauri/${String(nsis.uninstallerIcon)}`)).toBe(true);
  });
});
