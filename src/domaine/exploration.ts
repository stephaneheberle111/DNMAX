// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Explorer, vue « Recherche » : quelles compétences répondent
 * à la recherche et aux filtres, et comment les regrouper. Règles reprises
 * telles quelles de l'ancienne interface. La carte radiale et la chaîne,
 * elles, sont dessinées par `interface/radiale-dessin` et
 * `interface/chaine-dessin`.
 */
import { anneeDuSemestre, codeAuSemestre, numeroCode, sansAccents, SEMESTRES } from "./constituer";

type Element = Record<string, unknown>;

/** Un EC qui porte une compétence à un semestre, tel que le référentiel projeté le décrit. */
export interface EcPorteur {
  readonly ec: string;
  readonly id: string;
  readonly nom?: string;
  readonly ue?: string;
  readonly sem: string;
  readonly dn?: string;
  readonly couleur?: string;
}

/** Une compétence et un EC qui la porte à un semestre. */
export interface Paire {
  readonly c: Element;
  readonly ec: string;
  readonly ecId: string;
  readonly nom: string;
  readonly couleur: string | undefined;
  readonly ue: string;
  readonly sem: string;
  readonly dn: string | undefined;
  readonly annee: number;
}

/** Forme de comparaison sans séparateurs : lettres, chiffres et points seulement (« EC 11.2 » : « ec11.2 »). */
export function sansSeparateurs(texte: unknown): string {
  return sansAccents(texte).replace(/[^a-z0-9.]/g, "");
}

function porteurs(competence: Element): EcPorteur[] {
  return Array.isArray(competence.ecs) ? (competence.ecs as EcPorteur[]) : [];
}

/**
 * Paires compétence × EC qui répondent à la recherche et aux filtres. Une
 * compétence trouvée par son code, son intitulé ou le nom de son bloc garde
 * tous ses EC ; sinon, seuls les EC trouvés par leur code, leur nom ou leur
 * UE restent. Un code se trouve aussi écrit sans espace (« ec11.2 »).
 *
 * @param filtre filtre posé depuis la carte : bloc, compétence, UE ou EC
 */
export function pairesRecherche(
  competences: readonly Element[],
  filtre: { readonly kind: string; readonly value: string },
  recherche: { readonly q: string; readonly sems: readonly string[]; readonly annee: string },
  nomBloc: (numero: unknown) => string,
): Paire[] {
  const cherche = sansAccents(recherche.q.trim());
  const compacte = sansSeparateurs(recherche.q);
  const trouve = (texte: string): boolean => {
    const forme = sansAccents(texte);
    return forme.includes(cherche) || (compacte.length > 1 && sansSeparateurs(forme).includes(compacte));
  };
  const etiquette = (porteur: EcPorteur): string => `${porteur.ec} ${porteur.nom ?? ""} ${porteur.ue ?? ""}`;
  const paires: Paire[] = [];
  for (const competence of competences) {
    if (filtre.kind === "bloc" && String(competence.bloc) !== filtre.value) continue;
    if (filtre.kind === "comp" && competence.code !== filtre.value) continue;
    const parElleMeme = cherche === "" || trouve([competence.code, competence.libelle, nomBloc(competence.bloc)].map(joint).join(" "));
    const ecs = porteurs(competence);
    if (!parElleMeme && !ecs.some((porteur) => trouve(etiquette(porteur)))) continue;
    for (const porteur of ecs) {
      if (filtre.kind === "ue" && porteur.ue !== filtre.value) continue;
      if (filtre.kind === "ec" && porteur.id !== filtre.value) continue;
      if (!parElleMeme && !trouve(etiquette(porteur))) continue;
      if (recherche.sems.length > 0 && !recherche.sems.includes(porteur.sem)) continue;
      if (recherche.annee !== "*" && String(anneeDuSemestre(porteur.sem)) !== recherche.annee) continue;
      paires.push({
        c: competence,
        ec: porteur.ec,
        ecId: porteur.id,
        nom: porteur.nom ?? "",
        couleur: porteur.couleur,
        ue: porteur.ue ?? "",
        sem: porteur.sem,
        dn: porteur.dn,
        annee: anneeDuSemestre(porteur.sem),
      });
    }
  }
  return paires;
}

/** Comme `Array.join` : une valeur absente s'écrit vide. */
function joint(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" || typeof valeur === "boolean" ? String(valeur) : "";
}

/** Ce que le regroupement demande au référentiel affiché. */
export interface OutilsRegroupement {
  nomBloc(numero: unknown): string;
  /** Rang d'une UE, d'après le premier EC qui la porte. */
  rangUe(ue: string): number;
  couleurUe(ue: string): string;
  couleurEc(code: string): string;
  sousTitreAnnee(paire: Paire): string;
  sousTitreSemestre(paire: Paire): string;
  /** Intitulé du diplôme, sous-titre du groupe unique. */
  readonly diplome: string;
}

/** Une compétence d'un groupe, ses semestres et ses EC dans ce groupe. */
export interface CompetenceGroupe {
  readonly c: Element;
  readonly sems: Set<string>;
  readonly ecs: Set<string>;
}

export interface GroupeRecherche {
  readonly libelle: string;
  readonly sousTitre: string;
  readonly rang: number;
  /** Couleur du rail (UE, EC), ou `null` pour la teinte des blocs. */
  readonly couleur: string | null;
  readonly competences: Map<unknown, CompetenceGroupe>;
}

/** Paires regroupées selon le mode choisi (bloc, UE, EC, année, semestre, ou tout ensemble), rangées. */
export function regrouperPaires(paires: readonly Paire[], mode: string, outils: OutilsRegroupement): GroupeRecherche[] {
  const groupes = new Map<string, GroupeRecherche>();
  const ajouter = (cle: string, libelle: string, sousTitre: string, rang: number, paire: Paire, couleur?: string): void => {
    let groupe = groupes.get(cle);
    if (groupe === undefined) {
      groupe = { libelle, sousTitre, rang, couleur: couleur === undefined || couleur === "" ? null : couleur, competences: new Map() };
      groupes.set(cle, groupe);
    }
    const element = groupe.competences.get(paire.c.code) ?? { c: paire.c, sems: new Set<string>(), ecs: new Set<string>() };
    element.sems.add(paire.sem);
    element.ecs.add(paire.ec);
    groupe.competences.set(paire.c.code, element);
  };
  for (const paire of paires) {
    const bloc = joint(paire.c.bloc);
    if (mode === "bloc") ajouter(`b${bloc}`, `Bloc ${bloc}`, outils.nomBloc(paire.c.bloc), Number(paire.c.bloc), paire);
    else if (mode === "ue") ajouter(`u${paire.ue}`, paire.ue, "Unité d'enseignement", outils.rangUe(paire.ue), paire, outils.couleurUe(paire.ue));
    else if (mode === "ec") ajouter(`e${paire.ec}`, paire.ec, `${paire.nom} · ${paire.ue}`, numeroCode(paire.ec), paire, paire.couleur || outils.couleurEc(paire.ec));
    else if (mode === "annee") ajouter(`a${String(paire.annee)}`, `Année ${String(paire.annee)}`, outils.sousTitreAnnee(paire), paire.annee, paire);
    else if (mode === "semestre") ajouter(`s${paire.sem}`, paire.sem, outils.sousTitreSemestre(paire), SEMESTRES.indexOf(paire.sem as (typeof SEMESTRES)[number]), paire);
    else ajouter("all", "Toutes les compétences", outils.diplome, 0, paire);
  }
  return [...groupes.values()].sort((a, b) => a.rang - b.rang);
}

/** Compétences d'un groupe, rangées par bloc puis par code. */
export function competencesDuGroupe(groupe: GroupeRecherche): CompetenceGroupe[] {
  return [...groupe.competences.values()].sort((a, b) => Number(a.c.bloc) - Number(b.c.bloc) || numeroCode(a.c.code) - numeroCode(b.c.code));
}

/** Le texte découpé autour de la première occurrence de la recherche (déjà sous forme de comparaison), à marquer. */
export function surligner(texte: unknown, cherche: string): { texte: string; marque: boolean }[] {
  const brut = texte === null || texte === undefined ? "" : joint(texte);
  if (cherche === "") return [{ texte: brut, marque: false }];
  const position = sansAccents(brut).indexOf(cherche);
  if (position < 0) return [{ texte: brut, marque: false }];
  return [
    { texte: brut.slice(0, position), marque: false },
    { texte: brut.slice(position, position + cherche.length), marque: true },
    { texte: brut.slice(position + cherche.length), marque: false },
  ];
}

/** Semestres retenus après un clic : « Tous » vide la sélection, sinon le semestre s'ajoute ou se retire, dans l'ordre. */
export function basculerSemestreRecherche(choisis: readonly string[], semestre: string): string[] {
  if (semestre === "*") return [];
  const rang = (sem: string): number => SEMESTRES.indexOf(sem as (typeof SEMESTRES)[number]);
  return choisis.includes(semestre) ? choisis.filter((sem) => sem !== semestre) : [...choisis, semestre].sort((a, b) => rang(a) - rang(b));
}

/** Une case du tableau EC × semestres : des semestres consécutifs au même code, ou une case vide. */
export interface CaseEc {
  readonly semestres: string[];
  readonly code: string;
}

/** Cases d'un EC dans le tableau EC × semestres : une par suite de semestres où son code ne change pas. */
export function casesEc(ec: Element): CaseEc[] {
  const ouverts = Array.isArray(ec.sems) ? (ec.sems as string[]) : [];
  const cases: CaseEc[] = [];
  let rang = 0;
  while (rang < SEMESTRES.length) {
    const semestre = SEMESTRES[rang] ?? "";
    if (!ouverts.includes(semestre)) {
      cases.push({ semestres: [], code: "" });
      rang += 1;
      continue;
    }
    const code = codeAuSemestre(ec, semestre);
    let fin = rang + 1;
    while (fin < SEMESTRES.length && ouverts.includes(SEMESTRES[fin] ?? "") && codeAuSemestre(ec, SEMESTRES[fin] ?? "") === code) fin += 1;
    cases.push({ semestres: SEMESTRES.slice(rang, fin), code });
    rang = fin;
  }
  return cases;
}

/** Compétences du tableau compétences × semestres, réduites au filtre de la carte, rangées par bloc puis par code. */
export function competencesTableau(competences: readonly Element[], filtre: { readonly kind: string; readonly value: string }): Element[] {
  let retenues = competences.slice();
  if (filtre.kind === "bloc") retenues = retenues.filter((competence) => String(competence.bloc) === filtre.value);
  else if (filtre.kind === "comp") retenues = retenues.filter((competence) => competence.code === filtre.value);
  else if (filtre.kind === "ec") retenues = retenues.filter((competence) => porteurs(competence).some((porteur) => porteur.id === filtre.value));
  else if (filtre.kind === "ue") retenues = retenues.filter((competence) => porteurs(competence).some((porteur) => porteur.ue === filtre.value));
  return retenues.sort((a, b) => Number(a.bloc) - Number(b.bloc) || numeroCode(a.code) - numeroCode(b.code));
}

/** Compétences regroupées par bloc, dans l'ordre où les blocs apparaissent. */
export function blocsTableau(competences: readonly Element[]): { num: string; competences: Element[] }[] {
  const blocs: { num: string; competences: Element[] }[] = [];
  for (const competence of competences) {
    const num = String(competence.bloc);
    let bloc = blocs.find((candidat) => candidat.num === num);
    if (bloc === undefined) {
      bloc = { num, competences: [] };
      blocs.push(bloc);
    }
    bloc.competences.push(competence);
  }
  return blocs;
}

/** Codes des EC qui portent la compétence à ce semestre, sans doublon. */
export function ecsAuSemestre(competence: Element, semestre: string): string[] {
  return [...new Set(porteurs(competence).filter((porteur) => porteur.sem === semestre).map((porteur) => porteur.ec))];
}

/** « Bloc 3 · Concevoir » ; sans nom propre, « Bloc 3 ». */
export function titreBloc(numero: string, nom: string): string {
  return `Bloc ${numero}${nom !== "" && nom !== `Bloc ${numero}` ? ` · ${nom}` : ""}`;
}

/**
 * Compétences réduites aux EC retenus (la répartition de service d'un
 * enseignant) : chaque compétence ne garde que les EC retenus qui la portent,
 * et celles qui n'en gardent aucun disparaissent. Sans ensemble, rien ne change.
 */
export function restreindreAuxEcs(competences: readonly Element[], ecs: ReadonlySet<string> | null): Element[] {
  if (ecs === null) return competences.slice();
  return competences
    .map((competence) => ({ ...competence, ecs: porteurs(competence).filter((porteur) => ecs.has(porteur.id)) }))
    .filter((competence) => competence.ecs.length > 0);
}
