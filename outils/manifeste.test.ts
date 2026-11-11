// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { composerManifeste, type FichierConstruit } from "./manifeste";

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
    expect(composerManifeste("1.2.3", "", DATE, ADRESSE, fichiers).platforms["darwin-aarch64"]?.url).toBe(
      `${ADRESSE}/DN%20MAX.app.tar.gz`,
    );
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
