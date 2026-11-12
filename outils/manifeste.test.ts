// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { completerManifeste, composerManifeste, lireManifeste, lireSystemes, type FichierConstruit } from "./manifeste";

const DATE = new Date("2026-03-09T10:00:00.000Z");
const ADRESSE = "https://exemple.invalid/releases/download/v1.2.3";
const FICHIERS: FichierConstruit[] = [
  { nom: "DNMAX_1.2.3_x64-setup.exe" },
  { nom: "DNMAX_1.2.3_x64-setup.exe.sig", signature: "signature-windows\n" },
  { nom: "DNMAX_1.2.3_amd64.AppImage" },
  { nom: "DNMAX_1.2.3_amd64.AppImage.sig", signature: "signature-linux" },
  { nom: "DNMAX.app.tar.gz" },
  { nom: "DNMAX.app.tar.gz.sig", signature: "signature-mac" },
  { nom: "DNMAX_1.2.3_amd64.deb" },
];

describe("composerManifeste", () => {
  it("décrit chaque plateforme, le fichier macOS servant aux deux familles de Mac", () => {
    const manifeste = composerManifeste("1.2.3", "Corrections.", DATE, ADRESSE, FICHIERS);
    expect(manifeste).toEqual({
      version: "1.2.3",
      notes: "Corrections.",
      pub_date: "2026-03-09T10:00:00.000Z",
      platforms: {
        "windows-x86_64": { signature: "signature-windows", url: `${ADRESSE}/DNMAX_1.2.3_x64-setup.exe` },
        "linux-x86_64": { signature: "signature-linux", url: `${ADRESSE}/DNMAX_1.2.3_amd64.AppImage` },
        "darwin-aarch64": { signature: "signature-mac", url: `${ADRESSE}/DNMAX.app.tar.gz` },
        "darwin-x86_64": { signature: "signature-mac", url: `${ADRESSE}/DNMAX.app.tar.gz` },
      },
    });
  });

  it("encode les caractères spéciaux du nom de fichier dans l'adresse", () => {
    const fichiers = FICHIERS.map((fichier) => ({ ...fichier, nom: fichier.nom.replace("DNMAX.app", "DN MAX.app") }));
    expect(composerManifeste("1.2.3", "", DATE, ADRESSE, fichiers).platforms["darwin-aarch64"]?.url).toBe(`${ADRESSE}/DN%20MAX.app.tar.gz`);
  });

  it("refuse de publier quand le fichier d'une plateforme manque", () => {
    const sansLinux = FICHIERS.filter((fichier) => !fichier.nom.includes("AppImage"));
    expect(() => composerManifeste("1.2.3", "", DATE, ADRESSE, sansLinux)).toThrow(/linux-x86_64/);
  });

  it("refuse de publier quand une signature manque ou est vide", () => {
    const sansSignature = FICHIERS.filter((fichier) => fichier.nom !== "DNMAX.app.tar.gz.sig");
    expect(() => composerManifeste("1.2.3", "", DATE, ADRESSE, sansSignature)).toThrow(/darwin/);
    const signatureVide = FICHIERS.map((fichier) => (fichier.signature === undefined ? fichier : { ...fichier, signature: "  " }));
    expect(() => composerManifeste("1.2.3", "", DATE, ADRESSE, signatureVide)).toThrow(/windows/);
  });

  it("refuse une version mal formée", () => {
    expect(() => composerManifeste("v1.2.3", "", DATE, ADRESSE, FICHIERS)).toThrow(/mal formée/);
    expect(() => composerManifeste("", "", DATE, ADRESSE, FICHIERS)).toThrow(/mal formée/);
  });
});

describe("version sans les Mac", () => {
  const SANS_MAC = FICHIERS.filter((fichier) => !fichier.nom.includes(".app.tar.gz"));

  it("compose un manifeste sans plateforme Mac quand macOS n'est pas attendu", () => {
    const manifeste = composerManifeste("1.2.3", "", DATE, ADRESSE, SANS_MAC, ["windows", "linux"]);
    expect(Object.keys(manifeste.platforms)).toEqual(["windows-x86_64", "linux-x86_64"]);
  });

  it("refuse toujours un manifeste complet sans les fichiers Mac", () => {
    expect(() => composerManifeste("1.2.3", "", DATE, ADRESSE, SANS_MAC)).toThrow(/darwin/);
  });

  it("complète un manifeste publié avec les Mac en gardant sa date et ses notes", () => {
    const publie = composerManifeste("1.2.3", "Notes.", DATE, ADRESSE, SANS_MAC, ["windows", "linux"]);
    const mac = composerManifeste("1.2.3", "", new Date("2026-03-10T08:00:00.000Z"), ADRESSE, FICHIERS, ["macos"]);
    const complet = completerManifeste(publie, mac);
    expect(complet.pub_date).toBe("2026-03-09T10:00:00.000Z");
    expect(complet.notes).toBe("Notes.");
    expect(Object.keys(complet.platforms).sort()).toEqual(["darwin-aarch64", "darwin-x86_64", "linux-x86_64", "windows-x86_64"]);
  });

  it("refuse de compléter un manifeste d'une autre version", () => {
    const publie = composerManifeste("1.2.3", "", DATE, ADRESSE, SANS_MAC, ["windows", "linux"]);
    const mac = composerManifeste("1.2.4", "", DATE, ADRESSE, FICHIERS, ["macos"]);
    expect(() => completerManifeste(publie, mac)).toThrow(/versions différentes/);
  });
});

describe("lireSystemes", () => {
  it("lit une liste dans l'ordre des systèmes connus", () => {
    expect(lireSystemes(" linux, windows ")).toEqual(["windows", "linux"]);
  });

  it("refuse un système inconnu ou une liste vide", () => {
    expect(() => lireSystemes("windows,amiga")).toThrow(/amiga/);
    expect(() => lireSystemes(" , ")).toThrow();
  });
});

describe("lireManifeste", () => {
  it("relit un manifeste écrit par composerManifeste", () => {
    const manifeste = composerManifeste("1.2.3", "", DATE, ADRESSE, FICHIERS);
    expect(lireManifeste(JSON.stringify(manifeste))).toEqual(manifeste);
  });

  it("rend null pour un texte illisible ou mal formé", () => {
    expect(lireManifeste("pas du json")).toBeNull();
    expect(lireManifeste('{"version":"1.2.3"}')).toBeNull();
    expect(lireManifeste('{"version":"1.2.3","notes":"","pub_date":"x","platforms":{"linux-x86_64":{"url":3}}}')).toBeNull();
  });
});
