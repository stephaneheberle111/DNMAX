// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Nouveautés d'une version, tirées du journal des modifications (CHANGELOG.md) :
 * montrées à l'enseignant dans l'annonce d'une mise à jour, puis au premier
 * lancement de la version installée. Calculs seuls, sans accès au document.
 */

/** Rubriques du journal, dans l'ordre où l'enseignant les lit. */
export const RUBRIQUES = ["Ajouté", "Modifié", "Corrigé", "Sécurité"] as const;
export type Rubrique = (typeof RUBRIQUES)[number];

/** Intitulé montré à l'enseignant pour chaque rubrique du journal. */
export const INTITULES_RUBRIQUES: Readonly<Record<Rubrique, string>> = {
  Ajouté: "Nouvelles fonctions",
  Modifié: "Améliorations",
  Corrigé: "Corrections",
  Sécurité: "Sécurité",
};

/** Entrées d'une rubrique ; seules les rubriques non vides sont rendues. */
export interface GroupeNouveautes {
  readonly rubrique: Rubrique;
  readonly entrees: readonly string[];
}

const TITRE_VERSION = /^##\s+(\d+\.\d+\.\d+)\b/;
const TITRE_RUBRIQUE = /^###\s+(.+?)\s*$/;

function estRubrique(texte: string): texte is Rubrique {
  return (RUBRIQUES as readonly string[]).includes(texte);
}

/** Texte d'une entrée débarrassé de la mise en forme Markdown (gras, code, liens). */
function texteBrut(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compare deux numéros de version « a.b.c » ; négatif si `a` précède `b`. */
export function comparerVersions(a: string, b: string): number {
  const morceaux = (version: string): number[] => version.split(".").map((partie) => Number.parseInt(partie, 10) || 0);
  const [gauche, droite] = [morceaux(a), morceaux(b)];
  for (let rang = 0; rang < Math.max(gauche.length, droite.length); rang += 1) {
    const ecart = (gauche[rang] ?? 0) - (droite[rang] ?? 0);
    if (ecart !== 0) return ecart;
  }
  return 0;
}

/**
 * Lit des rubriques « ### Ajouté » suivies d'entrées « - … » (une entrée peut
 * continuer sur les lignes suivantes). Une rubrique inconnue est ignorée.
 */
export function lireRubriques(markdown: string): GroupeNouveautes[] {
  const groupes = new Map<Rubrique, string[]>();
  let courante: string[] | null = null;
  let entree: string[] | null = null;
  const clore = (): void => {
    if (entree !== null && courante !== null) {
      const texte = texteBrut(entree.join(" "));
      if (texte !== "") courante.push(texte);
    }
    entree = null;
  };
  for (const ligne of markdown.split(/\r?\n/)) {
    const rubrique = TITRE_RUBRIQUE.exec(ligne);
    if (rubrique !== null || ligne.startsWith("#")) {
      clore();
      const nom = rubrique?.[1] ?? "";
      if (estRubrique(nom)) {
        courante = groupes.get(nom) ?? [];
        groupes.set(nom, courante);
      } else {
        courante = null;
      }
      continue;
    }
    if (/^\s*[-*]\s+/.test(ligne)) {
      clore();
      entree = [ligne.replace(/^\s*[-*]\s+/, "")];
    } else if (ligne.trim() === "") {
      clore();
    } else if (entree !== null) {
      entree.push(ligne);
    }
  }
  clore();
  return RUBRIQUES.flatMap((rubrique) => {
    const entrees = groupes.get(rubrique) ?? [];
    return entrees.length > 0 ? [{ rubrique, entrees }] : [];
  });
}

/** Texte Markdown de la section d'une version (sans son titre), ou chaîne vide si elle est absente. */
export function sectionVersion(journal: string, version: string): string {
  const lignes = journal.split(/\r?\n/);
  const debut = lignes.findIndex((ligne) => TITRE_VERSION.exec(ligne)?.[1] === version);
  if (debut < 0) return "";
  const fin = lignes.findIndex((ligne, rang) => rang > debut && /^##\s/.test(ligne));
  return lignes
    .slice(debut + 1, fin < 0 ? undefined : fin)
    .join("\n")
    .trim();
}

/**
 * Nouveautés de toutes les versions publiées après `depuis` (exclue) et jusqu'à
 * `jusqua` (incluse), regroupées par rubrique, la plus récente en tête de chaque
 * rubrique : l'enseignant qui saute des versions voit tout ce qui a changé.
 * Sans `depuis`, seule la version `jusqua` est prise.
 */
export function nouveautesEntre(journal: string, depuis: string | null, jusqua: string): GroupeNouveautes[] {
  const versions = [...journal.matchAll(/^##\s+(\d+\.\d+\.\d+)\b/gm)]
    .map((correspondance) => correspondance[1] ?? "")
    .filter((version) =>
      depuis === null
        ? version === jusqua
        : comparerVersions(version, depuis) > 0 && comparerVersions(version, jusqua) <= 0,
    );
  return lireRubriques(versions.map((version) => sectionVersion(journal, version)).join("\n"));
}

/**
 * Dit s'il faut montrer les nouveautés au lancement, et depuis quelle version.
 *
 * @param versionVue dernière version dont l'enseignant a vu les nouveautés, ou `null` si aucune n'est notée
 * @param installationExistante vrai si des données existaient avant ce lancement (pas une première installation)
 * @returns `null` s'il n'y a rien à montrer ; sinon la version après laquelle prendre les nouveautés (`null` : la version courante seule)
 */
export function nouveautesAMontrer(
  versionVue: string | null,
  versionCourante: string,
  installationExistante: boolean,
): { depuis: string | null } | null {
  if (versionCourante === "") return null;
  if (versionVue === null) {
    // Première installation : rien n'a changé pour l'enseignant. Mise à jour depuis une
    // version qui ne notait pas encore ce qui a été vu : on montre la version installée.
    return installationExistante ? { depuis: null } : null;
  }
  return comparerVersions(versionCourante, versionVue) > 0 ? { depuis: versionVue } : null;
}
