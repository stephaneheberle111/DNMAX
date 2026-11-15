// SPDX-License-Identifier: CECILL-2.1
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * La licence est déclarée à plusieurs endroits (manifestes, en-tête de chaque
 * fichier, texte livré) : un changement oublié quelque part donnerait deux
 * licences contradictoires. Lecture seule du dépôt.
 */

const RACINE = join(import.meta.dirname, "..");
const IDENTIFIANT = "CECILL-2.1";

function lire(chemin: string): string {
  return readFileSync(join(RACINE, chemin), "utf8");
}

function fichiersSources(dossier: string, extensions: readonly string[]): string[] {
  return readdirSync(join(RACINE, dossier), { recursive: true, encoding: "utf8" })
    .filter((chemin) => extensions.some((extension) => chemin.endsWith(extension)))
    .map((chemin) => join(dossier, chemin));
}

describe("licence du projet", () => {
  it("est la même dans package.json, Cargo.toml et tauri.conf.json", () => {
    const paquet = JSON.parse(lire("package.json")) as { license: string };
    const tauri = JSON.parse(lire("src-tauri/tauri.conf.json")) as { bundle: { license: string } };
    expect(paquet.license).toBe(IDENTIFIANT);
    expect(lire("src-tauri/Cargo.toml")).toContain(`license = "${IDENTIFIANT}"`);
    expect(tauri.bundle.license).toBe(IDENTIFIANT);
  });

  it("est annoncée en tête de chaque fichier source", () => {
    const sources = [
      ...fichiersSources("src", [".ts", ".css"]),
      ...fichiersSources("outils", [".ts"]),
      ...fichiersSources("src-tauri/src", [".rs"]),
    ];
    const sansEnTete = sources.filter((chemin) => !lire(chemin).slice(0, 200).includes(`SPDX-License-Identifier: ${IDENTIFIANT}`));
    expect(sources.length).toBeGreaterThan(50);
    expect(sansEnTete).toEqual([]);
  });

  it("est livrée en texte intégral : la CeCILL version 2.1 en français", () => {
    const texte = lire("LICENSE");
    expect(texte).toContain("CONTRAT DE LICENCE DE LOGICIEL LIBRE CeCILL");
    expect(texte).toContain("Version 2.1 du 2013-06-21");
    expect(texte).toContain("Article 13 - LOI APPLICABLE ET COMPETENCE TERRITORIALE");
  });
});
