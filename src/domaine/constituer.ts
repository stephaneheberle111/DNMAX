// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Constituer, étapes 1 à 3 : nommer, créer, retenir et retirer
 * les UE, les EC, les blocs et les compétences d'un référentiel. Règles
 * reprises telles quelles de l'ancienne interface ; les éléments sont
 * modifiés sur place, comme elle les tient.
 */

export type Sorte = "ues" | "ecs" | "blocs" | "competences";
type Element = Record<string, unknown>;

/** Les six semestres, dans l'ordre. */
export const SEMESTRES = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

/** Comme `String(x||"")` dans l'interface, pour du texte ou un nombre. */
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

/** Années d'un diplôme en trois ans : le code d'un EC change de l'une à l'autre. */
export const ANNEES = [1, 2, 3] as const;

/** Numéro de rangement d'un code (EC 11.2 : 1102) ; à la fin (9999) sans chiffre. */
export function numeroCode(code: unknown): number {
  const trouve = /(\d+)\.?(\d+)?/.exec(texte(code));
  return trouve === null ? 9999 : Number(trouve[1]) * 100 + Number(trouve[2] ?? 0);
}

function tableCodes(ec: Element): Record<string, unknown> {
  return typeof ec.codes === "object" && ec.codes !== null ? (ec.codes as Record<string, unknown>) : {};
}

/** Codes d'un EC, de la 1re à la 3e année, sans les années vides. */
export function codesEc(ec: Element): string[] {
  const codes = tableCodes(ec);
  return ANNEES.map((annee) => texte(codes[annee])).filter((code) => code !== "");
}

/** Rang d'un EC : celui de son premier code, à la fin sans code. */
export function ordreEc(ec: Element): number {
  const codes = codesEc(ec);
  return codes.length > 0 ? numeroCode(codes[0]) : 9999;
}

/** EC de l'étape 2, rangés par code, réduits à ceux dont les codes ou l'intitulé contiennent le filtre. */
export function ecsAffiches(ecs: readonly Element[], filtre: string): Element[] {
  const cherche = sansAccents(filtre.trim());
  return ecs
    .slice()
    .sort((a, b) => ordreEc(a) - ordreEc(b))
    .filter((ec) => cherche === "" || sansAccents([codesEc(ec).join(" "), texteJoint(ec.nom)].join(" ")).includes(cherche));
}

/** Comme `Array.join` dans l'interface : une valeur absente s'écrit vide. */
function texteJoint(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" || typeof valeur === "boolean" ? String(valeur) : "";
}

/** Écrit le code d'un EC pour une année, ou l'efface si la saisie est vide. */
export function changerCodeEc(ec: Element, annee: string, saisie: string): void {
  if (typeof ec.codes !== "object" || ec.codes === null) ec.codes = {};
  const codes = ec.codes as Record<string, unknown>;
  const code = saisie.trim();
  if (code === "") Reflect.deleteProperty(codes, annee);
  else codes[annee] = code;
}

/** Comme `a+" "+b` dans l'interface : une valeur absente s'écrit « undefined ». */
function concatene(...valeurs: unknown[]): string {
  return valeurs.map((valeur) => (typeof valeur === "string" ? valeur : typeof valeur === "number" || valeur === undefined || valeur === null ? String(valeur) : "")).join(" ");
}

/** Blocs rangés par numéro ; un numéro illisible compte pour zéro. */
export function blocsRanges(blocs: readonly Element[]): Element[] {
  const numero = (bloc: Element): number => Number.parseInt(texte(bloc.num), 10) || 0;
  return blocs.slice().sort((a, b) => numero(a) - numero(b));
}

/** Compétences d'un bloc, rangées par code. */
export function competencesDuBloc(competences: readonly Element[], numero: unknown): Element[] {
  return competences.filter((competence) => String(competence.bloc) === String(numero)).sort((a, b) => numeroCode(a.code) - numeroCode(b.code));
}

/** Compétences dont le bloc n'est pas dans ce référentiel. */
export function competencesSansBloc(competences: readonly Element[], blocs: readonly Element[]): Element[] {
  return competences.filter((competence) => !blocs.some((bloc) => String(bloc.num) === String(competence.bloc)));
}

/** Une compétence répond au filtre (déjà mis sous forme de comparaison) par son code ou son intitulé. */
export function competenceCorrespond(competence: Element, filtre: string): boolean {
  return filtre === "" || sansAccents(concatene(competence.code, competence.libelle)).includes(filtre);
}

/** Un bloc répond au filtre par son numéro ou son intitulé : toutes ses compétences sont alors montrées. */
export function blocCorrespond(bloc: Element, filtre: string): boolean {
  return filtre !== "" && sansAccents(concatene(bloc.num, bloc.nom)).includes(filtre);
}

/** Hauteur du champ d'un intitulé : deux à cinq lignes, une ligne pour 72 caractères. */
export function lignesIntitule(intitule: unknown): number {
  return Math.min(5, Math.max(2, Math.ceil(texte(intitule).length / 72)));
}

/** Année de formation d'un semestre (S1 et S2 : 1). */
export function anneeDuSemestre(semestre: string): number {
  return Math.floor(Math.max(0, SEMESTRES.indexOf(semestre as (typeof SEMESTRES)[number])) / 2) + 1;
}

/** Nom d'un EC : son intitulé, sinon ses codes, sinon « — ». */
export function nomEc(ec: Element): string {
  const nom = texte(ec.nom).trim();
  if (nom !== "") return nom;
  const codes = codesEc(ec);
  return codes.length > 0 ? codes.join(" · ") : "—";
}

/** Un rattachement d'une compétence à un EC, lu à l'étape 3 (il se règle à l'étape 4). */
export interface PastilleRattachement {
  readonly couleur: string;
  readonly titre: string;
  readonly texte: string;
}

/**
 * Rattachements d'une compétence lus à l'étape 3 : les cinq premiers EC qui
 * la portent à au moins un semestre, nommés par leurs codes à ces semestres
 * (« EC 11.1 · 11.2 ») ou, sans code, par leur nom ; et le nombre des autres.
 */
export function rattachementsLus(competence: Element, ecs: readonly Element[]): { pastilles: PastilleRattachement[]; enPlus: number } {
  const liens = (Array.isArray(competence.ecs) ? (competence.ecs as Element[]) : [])
    .map((lien) => ({ lien, ec: ecs.find((candidat) => candidat.id === lien.id) }))
    .filter((paire): paire is { lien: Element; ec: Element } => paire.ec !== undefined && Array.isArray(paire.lien.sems) && paire.lien.sems.length > 0);
  const pastilles = liens.slice(0, 5).map(({ lien, ec }) => {
    const semestres = lien.sems as string[];
    const table = typeof ec.codes === "object" && ec.codes !== null ? (ec.codes as Record<string, unknown>) : {};
    const codes = [...new Set(semestres.map((semestre) => texte(table[anneeDuSemestre(semestre)])).filter((code) => code !== ""))];
    return {
      couleur: texte(ec.couleur) || "#9aa2ae",
      titre: `${nomEc(ec)} · ${semestres.join(" ")}`,
      texte: codes.length > 0 ? codes.map((code, rang) => (rang === 0 ? code : code.replace(/^EC\s*/i, ""))).join(" · ") : nomEc(ec),
    };
  });
  return { pastilles, enPlus: Math.max(0, liens.length - 5) };
}

/** Code d'un EC au semestre donné (celui de son année), ou chaîne vide. */
export function codeAuSemestre(ec: Element, semestre: string): string {
  const table = typeof ec.codes === "object" && ec.codes !== null ? (ec.codes as Record<string, unknown>) : {};
  return texte(table[anneeDuSemestre(semestre)]);
}

/** État du référentiel d'une mention au regard de sa validation par l'enseignant. */
export type EtatValidation = "jamais" | "a-verifier" | "a-jour" | "modifie";

/**
 * Jamais validé ; validé mais pas attesté par l'enseignant (reçu, livré) ;
 * attesté et à jour ; ou modifié depuis la version attestée.
 */
export function etatValidation(versionActive: Element | null, aJour: boolean): EtatValidation {
  if (versionActive === null) return "jamais";
  if (texte(versionActive.attestation) === "") return "a-verifier";
  return aJour ? "a-jour" : "modifie";
}

/** Compétences rattachées à au moins un EC à un semestre (étape 4). */
export function competencesPlanifiees(competences: readonly Element[]): number {
  return competences.filter((competence) =>
    (Array.isArray(competence.ecs) ? (competence.ecs as Element[]) : []).some((lien) => Array.isArray(lien.sems) && lien.sems.length > 0),
  ).length;
}

/** Noms de diplôme, chacun une fois (casse et accents ignorés), tels qu'écrits la première fois, sans espaces autour. */
export function nomsDiplomes(diplomes: readonly Element[]): string[] {
  const noms: string[] = [];
  for (const diplome of diplomes) {
    const nom = texte(diplome.nom).trim();
    if (!noms.some((connu) => sansAccents(connu) === sansAccents(nom))) noms.push(nom);
  }
  return noms;
}

/** Mentions du diplôme de la mention active (même nom, casse et accents ignorés). */
export function mentionsDuDiplome(diplomes: readonly Element[], actif: unknown): Element[] {
  const courant = diplomes.find((diplome) => diplome.id === actif) ?? {};
  return diplomes.filter((diplome) => sansAccents(texte(diplome.nom)) === sansAccents(texte(courant.nom)));
}

/**
 * Supprime une version du référentiel d'une mention ; si c'était la version
 * en vigueur, la mention n'en a plus. Un rang absent ne change rien.
 */
export function supprimerVersion(donnees: { versions?: Record<string, Element[]>; valide?: Record<string, unknown> }, diplome: string, rang: number): void {
  const versions = donnees.versions?.[diplome];
  if (versions === undefined) return;
  const [retiree] = versions.splice(rang, 1);
  if (retiree !== undefined && donnees.valide !== undefined && donnees.valide[diplome] === retiree.id) {
    const valide = { ...donnees.valide };
    Reflect.deleteProperty(valide, diplome);
    donnees.valide = valide;
  }
}
