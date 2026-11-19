// SPDX-License-Identifier: CECILL-2.1
/**
 * Règles de la carte heuristique (chaîne), sans accès à l'état ni à la page :
 * ordre des cinq colonnes (validation, déplacement d'une colonne) et
 * « chemins réels » semestre, compétence, EC, UE, diplôme, d'où se déduisent
 * les cases de chaque colonne et les liens entre deux colonnes voisines,
 * quel que soit l'ordre choisi.
 */

/** Les cinq sortes de colonnes, dans l'ordre par défaut : du semestre au diplôme. */
export const SORTES_CHAINE = ["sem", "comp", "ec", "ue", "dip"] as const;

export type SorteChaine = (typeof SORTES_CHAINE)[number];

/** Vrai si `valeur` est l'une des cinq sortes de colonnes. */
export function estSorteChaine(valeur: unknown): valeur is SorteChaine {
  return typeof valeur === "string" && (SORTES_CHAINE as readonly string[]).includes(valeur);
}

/** Ordre des colonnes lu (préférences) : retenu s'il donne les cinq sortes, chacune une fois ; sinon l'ordre par défaut. */
export function ordreChaineValide(valeur: unknown): SorteChaine[] {
  if (!Array.isArray(valeur) || valeur.length !== SORTES_CHAINE.length) return [...SORTES_CHAINE];
  if (!valeur.every(estSorteChaine) || new Set(valeur).size !== SORTES_CHAINE.length) return [...SORTES_CHAINE];
  return [...valeur];
}

/** Vrai si `ordre` est l'ordre par défaut. */
export function estOrdreParDefaut(ordre: readonly string[]): boolean {
  return ordre.length === SORTES_CHAINE.length && ordre.every((sorte, rang) => sorte === SORTES_CHAINE[rang]);
}

/**
 * Ordre obtenu en plaçant la colonne `sorte` au rang `rang` (0 à 4, ramené
 * dans ces bornes), les autres gardant leur ordre. Une sorte absente de
 * l'ordre le rend inchangé.
 */
export function placerColonne(ordre: readonly SorteChaine[], sorte: SorteChaine, rang: number): SorteChaine[] {
  if (!ordre.includes(sorte)) return [...ordre];
  const reste = ordre.filter((autre) => autre !== sorte);
  const cible = Math.max(0, Math.min(reste.length, Math.round(rang)));
  return [...reste.slice(0, cible), sorte, ...reste.slice(cible)];
}

/** Un chemin réel : la compétence est rattachée à l'EC au semestre ; l'UE est celle de l'EC (`null` si l'EC n'en a pas). */
export interface CheminChaine {
  readonly sem: string;
  readonly comp: string;
  readonly ec: string;
  readonly ue: string | null;
  readonly dip: string;
}

/** Rattachement d'une compétence, tel que le porte le référentiel (`competence.ecs`). */
interface Rattachement {
  readonly id?: unknown;
  readonly sems?: unknown;
}

/** Ce qu'il faut pour construire les chemins : compétences, éléments retenus de chaque colonne, UE d'un EC, diplôme. */
export interface SourceChemins {
  readonly competences: readonly { readonly id?: unknown; readonly ecs?: unknown }[];
  /** Identifiants retenus (filtre des tuiles, « Seulement ma répartition ») de chaque colonne. */
  readonly retenus: { readonly sem: ReadonlySet<unknown>; readonly comp: ReadonlySet<unknown>; readonly ec: ReadonlySet<unknown>; readonly ue: ReadonlySet<unknown> };
  /** UE de l'EC, ou une valeur vide s'il n'en a pas. */
  ueDe(ec: string): unknown;
  readonly diplome: string;
}

/**
 * Chemins réels : un par rattachement d'une compétence à un EC à un
 * semestre, quand la compétence, l'EC et le semestre sont retenus. Une UE
 * non retenue ou absente laisse un trou (`ue` à `null`) sans couper le chemin.
 */
export function cheminsReels(source: SourceChemins): CheminChaine[] {
  const chemins: CheminChaine[] = [];
  for (const competence of source.competences) {
    if (!source.retenus.comp.has(competence.id)) continue;
    const rattachements = Array.isArray(competence.ecs) ? (competence.ecs as Rattachement[]) : [];
    for (const lien of rattachements) {
      if (!source.retenus.ec.has(lien.id)) continue;
      const ec = String(lien.id);
      const ue = source.ueDe(ec);
      const semestres = Array.isArray(lien.sems) ? (lien.sems as unknown[]) : [];
      for (const semestre of semestres) {
        if (!source.retenus.sem.has(semestre)) continue;
        chemins.push({ sem: String(semestre), comp: String(competence.id), ec, ue: source.retenus.ue.has(ue) ? String(ue) : null, dip: source.diplome });
      }
    }
  }
  return chemins;
}

/** Ce qui se lit des chemins qui passent par le pivot : identifiants présents par colonne, et liens entre colonnes voisines. */
export interface Passages {
  /** Identifiants présents, par sorte. */
  readonly presents: Readonly<Record<SorteChaine, ReadonlySet<string>>>;
  /** Vrai si un même chemin passe par `gauche` (colonne de rang `rang`) et `droite` (colonne suivante). */
  relie(rang: number, gauche: string, droite: string): boolean;
}

/**
 * Chemins qui passent par le pivot (`sorte`, `id`) ; pour le diplôme, tous.
 * Deux cases de colonnes voisines (dans `ordre`) sont reliées si un même
 * chemin passe par les deux ; un trou ne relie rien.
 */
export function passagesParLePivot(chemins: readonly CheminChaine[], ordre: readonly SorteChaine[], sorte: SorteChaine, id: unknown): Passages {
  const presents: Record<SorteChaine, Set<string>> = { sem: new Set(), comp: new Set(), ec: new Set(), ue: new Set(), dip: new Set() };
  const liens = new Set<string>();
  for (const chemin of chemins) {
    if (sorte !== "dip" && chemin[sorte] !== id) continue;
    for (const autre of SORTES_CHAINE) {
      const valeur = chemin[autre];
      if (valeur !== null) presents[autre].add(valeur);
    }
    for (let rang = 0; rang < ordre.length - 1; rang++) {
      const gauche = chemin[ordre[rang] as SorteChaine];
      const droite = chemin[ordre[rang + 1] as SorteChaine];
      if (gauche !== null && droite !== null) liens.add(JSON.stringify([rang, gauche, droite]));
    }
  }
  return { presents, relie: (rang, gauche, droite) => liens.has(JSON.stringify([rang, gauche, droite])) };
}
