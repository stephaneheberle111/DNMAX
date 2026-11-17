// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Constituer, étapes 1 à 3 : nommer, créer, retenir et retirer
 * les UE, les EC, les blocs et les compétences d'un référentiel. Règles
 * reprises telles quelles de l'interface historique ; les éléments sont
 * modifiés sur place, comme elle les tient.
 */

export type Sorte = "ues" | "ecs" | "blocs" | "competences";
type Element = Record<string, unknown>;

/** Les six semestres, dans l'ordre. */
export const SEMESTRES = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

/** Comme `String(x||"")` dans l'interface historique, pour du texte ou un nombre. */
function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" && valeur !== 0 && !Number.isNaN(valeur) ? String(valeur) : "";
}

/** Forme de comparaison d'un texte : minuscules, sans accents. */
export function sansAccents(valeur: unknown): string {
  const brut = valeur === null || valeur === undefined ? "" : typeof valeur === "string" ? valeur : texte(valeur);
  return brut
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Libellé d'un élément dans la liste d'ajout. */
export function libelleElement(sorte: Sorte, element: Element): string {
  if (sorte === "ues") {
    const code = texte(element.code);
    return (code === "" ? "" : `${code} · `) + (texte(element.nom) || "UE sans nom");
  }
  if (sorte === "ecs") return texte(element.nom) || "EC sans intitulé";
  if (sorte === "blocs") {
    const nom = texte(element.nom);
    return `Bloc ${String(element.num)}${nom === "" ? "" : ` · ${nom}`}`;
  }
  return `${texte(element.code) || "C"} · ${texte(element.libelle).slice(0, 70)}`;
}

/** Éléments connus (autre mention, version antérieure) qui ne sont pas dans ce référentiel. */
export function candidatsAjout(dansLeReferentiel: readonly Element[], connus: readonly Element[]): Element[] {
  const retenus = new Set(dansLeReferentiel.map((element) => element.id));
  return connus.filter((element) => !retenus.has(element.id));
}

/**
 * Élément neuf d'une étape, avec ses valeurs de départ : une UE numérotée à
 * la suite, un EC rattaché à la première UE, un bloc numéroté après le plus
 * grand, une compétence codée d'après son bloc (« C » sans bloc).
 *
 * @param vue la vue du référentiel actif (UE, blocs et compétences retenus)
 * @param bloc numéro du bloc d'une nouvelle compétence, ou chaîne vide
 */
export function elementNeuf(sorte: Sorte, vue: { ues: readonly Element[]; blocs: readonly Element[]; competences: readonly Element[] }, bloc: string, id: string): Element {
  if (sorte === "ues") return { id, code: `UE ${String(vue.ues.length + 1)}`, nom: "Nouvelle UE", couleur: "#9aa2ae", sems: [...SEMESTRES] };
  if (sorte === "ecs") return { id, nom: "Nouvel enseignement", couleur: "#9aa2ae", ects: "", ueId: texte(vue.ues[0]?.id), sems: [], codes: {} };
  if (sorte === "blocs") {
    const plusGrand = vue.blocs.reduce((maximum, element) => Math.max(maximum, Number.parseInt(texte(element.num), 10) || 0), 0);
    return { id, num: String(plusGrand + 1), nom: "" };
  }
  const rang = vue.competences.filter((competence) => bloc !== "" && String(competence.bloc) === bloc).length + 1;
  return { id, code: bloc === "" ? "C" : `C${bloc}.${String(rang)}`, bloc, libelle: "", ecs: [], ecIds: [] };
}

/**
 * Codes portés deux fois dans un référentiel : signalés, pas interdits (un
 * code se corrige en deux temps). Casse, accents et espaces autour ignorés ;
 * un code vide n'est jamais signalé.
 */
export function codesEnDouble(elements: readonly Element[], cle: string): (element: Element) => boolean {
  const comptes = new Map<string, number>();
  for (const element of elements) {
    const code = sansAccents(texte(element[cle]).trim());
    if (code !== "") comptes.set(code, (comptes.get(code) ?? 0) + 1);
  }
  return (element) => (comptes.get(sansAccents(texte(element[cle]).trim())) ?? 0) > 1;
}

/** Ouvre ou ferme un semestre, en gardant les semestres dans l'ordre. */
export function basculerSemestre(element: Element, semestre: string): void {
  const actuels = Array.isArray(element.sems) ? (element.sems as string[]) : [];
  element.sems = actuels.includes(semestre)
    ? actuels.filter((candidat) => candidat !== semestre)
    : [...actuels, semestre].sort((a, b) => SEMESTRES.indexOf(a as (typeof SEMESTRES)[number]) - SEMESTRES.indexOf(b as (typeof SEMESTRES)[number]));
}

/**
 * Retire un élément du référentiel d'une mention (il reste connu, proposé à
 * l'ajout) : les EC d'une UE retirée n'ont plus d'UE, et les compétences
 * perdent leur rattachement à un EC retiré.
 */
export function retirerDuReferentiel(referentiel: Record<Sorte, Element[]>, sorte: Sorte, id: string): void {
  referentiel[sorte] = referentiel[sorte].filter((element) => element.id !== id);
  if (sorte === "ues") {
    for (const ec of referentiel.ecs) if (ec.ueId === id) ec.ueId = "";
  }
  if (sorte === "ecs") {
    for (const competence of referentiel.competences) {
      competence.ecs = (Array.isArray(competence.ecs) ? (competence.ecs as Element[]) : []).filter((lien) => lien.id !== id);
    }
  }
}
