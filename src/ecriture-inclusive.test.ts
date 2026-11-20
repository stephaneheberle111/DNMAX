// SPDX-License-Identifier: CECILL-2.1
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Tout ce que l'application et le site donnent à lire est en écriture
 * inclusive (décision 28) : « étudiant·e », « étudiant·es », « enseignant·e »,
 * « enseignant·es ». Ce test rattrape « étudiant » ou « étudiants » oublié dans
 * un texte neuf ; « enseignant », sans accent, se confond avec des noms de
 * variables et reste à la charge de la relecture (docs/revue-coherence.md).
 * Les commentaires du code, eux, ne sont pas concernés.
 */
const RACINE = new URL("../", import.meta.url);

/** « étudiant » ou « étudiants » sans point médian : le mot porte un accent, il ne peut pas être un nom de variable. */
const ETUDIANT_NON_INCLUSIF = /[Éé]tudiants?(?![\p{L}·])/u;
/**
 * Lignes admises : le nom donné par d'anciennes versions aux étudiants
 * anonymisés, encore présent dans des données, et le jeu d'essai des tests.
 */
const EXCEPTIONS: readonly RegExp[] = [/NOMS_ANONYMES_ANCIENS/, /^domaine\/echange\/jeu-essai\.ts:/];

function sansCommentaires(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function fichiersTs(dossier: URL): URL[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const adresse = new URL(entree.name + (entree.isDirectory() ? "/" : ""), dossier);
    if (entree.isDirectory()) return fichiersTs(adresse);
    return entree.name.endsWith(".ts") && !entree.name.endsWith(".test.ts") ? [adresse] : [];
  });
}

/** Lignes fautives d'un texte, numérotées. */
function fautes(texte: string, formes: readonly RegExp[]): string[] {
  return texte
    .split("\n")
    .map((ligne, rang) => ({ ligne, rang: rang + 1 }))
    .filter(({ ligne }) => formes.some((forme) => forme.test(ligne)))
    .map(({ ligne, rang }) => `${String(rang)}: ${ligne.trim().slice(0, 120)}`);
}

describe("écriture inclusive", () => {
  it("reconnaît les formes à corriger et laisse passer les formes inclusives", () => {
    expect(fautes("Aucun étudiant.\nLes étudiant·es.\nUn·e étudiant·e\nVos Étudiants", [ETUDIANT_NON_INCLUSIF])).toEqual(["1: Aucun étudiant.", "4: Vos Étudiants"]);
  });

  it.each(["index.html", "site/index.html"])("%s n'emploie que des formes inclusives dans ses textes", (fichier) => {
    const page = readFileSync(new URL(fichier, RACINE), "utf8").replace(/<style[\s\S]*?<\/style>/g, "");
    // Hors balises : ce qui est lu, pas les identifiants ni les classes.
    const textes = sansCommentaires(page.replace(/<!--[\s\S]*?-->/g, "")).replace(/<(?!\/?script)[^>]*>/g, " ");
    expect(fautes(textes, [ETUDIANT_NON_INCLUSIF])).toEqual([]);
  });

  it("les textes de l'application n'écrivent ni « étudiant » ni « étudiants » sans point médian", () => {
    const trouvees = fichiersTs(new URL("src/", RACINE)).flatMap((fichier) =>
      fautes(sansCommentaires(readFileSync(fichier, "utf8")), [ETUDIANT_NON_INCLUSIF]).map((faute) => `${fichier.pathname.split("/src/")[1] ?? ""}:${faute}`),
    );
    expect(trouvees.filter((faute) => !EXCEPTIONS.some((exception) => exception.test(faute)))).toEqual([]);
  });
});
