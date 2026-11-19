// SPDX-License-Identifier: CECILL-2.1

/**
 * Schéma de ce qu'un fichier d'échange peut faire entrer dans les données.
 *
 * Chaque objet reçu est reconstruit champ par champ à partir d'une liste
 * blanche : un champ inconnu est écarté sans bruit, un champ du mauvais type
 * aussi, un texte ou une liste démesurés sont coupés. Rien de ce qui n'est pas
 * décrit ici n'atteint le coffre.
 *
 * Conséquence à connaître avant d'ajouter un champ à une évaluation ou à un
 * référentiel : tant qu'il n'est pas déclaré ici, il ne voyage pas. Les tests
 * d'aller-retour (`schema-recu.test.ts`) le rappellent.
 *
 * Les identifiants, les clés réservées et les couleurs sont déjà tenus en
 * amont, sur le fichier entier (`contenu-recu`).
 */
import { estIdentifiantSur } from "./contenu-recu";
import type { PromotionEchangee } from "./donnees-eleves";
import { estObjet, type Evaluation, type ObjetJson } from "./modele";

/** Longueurs maximales des textes, en caractères : très au-dessus de tout usage réel. */
export const LONGUEURS = {
  /** Code d'UE, d'EC, de compétence, de semestre, numéro de bloc. */
  code: 60,
  /** Nom, intitulé, livrable, promotion, enseignant. */
  nom: 500,
  /** Libellé de compétence, formulation d'une ligne. */
  libelle: 4000,
  /** Consignes données aux étudiants. */
  consignes: 20_000,
} as const;

/** Nombre maximal d'éléments d'une liste. */
export const TAILLES = {
  /** Semestres, niveaux, EC d'une ligne. */
  courte: 60,
  /** Livrables, promotions, enseignants, UE, EC d'une évaluation. */
  moyenne: 300,
  /** Lignes d'une évaluation, éléments d'un référentiel. */
  longue: 2000,
} as const;

/** Bornes d'un contenu repris tel quel (contenu lisible d'un référentiel, résultats d'étudiants). */
const BORNES_JSON = { profondeur: 12, texte: 20_000, liste: 5000, cles: 5000, cle: 200, noeuds: 400_000 } as const;

function texte(valeur: unknown, longueur: number): string | undefined {
  return typeof valeur === "string" ? valeur.slice(0, longueur) : undefined;
}

function textes(valeur: unknown, longueur: number, taille: number): string[] | undefined {
  if (!Array.isArray(valeur)) {
    return undefined;
  }
  return valeur
    .filter((element): element is string => typeof element === "string")
    .slice(0, taille)
    .map((element) => element.slice(0, longueur));
}

function booleen(valeur: unknown): boolean | undefined {
  return typeof valeur === "boolean" ? valeur : undefined;
}

/** Un code ou un numéro, que les données anciennes écrivent parfois comme un nombre. */
function texteOuNombre(valeur: unknown, longueur: number): string | number | undefined {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : texte(valeur, longueur);
}

function identifiant(valeur: unknown): string | undefined {
  return typeof valeur === "string" && estIdentifiantSur(valeur) ? valeur : undefined;
}

/** Un renvoi à un autre élément : un identifiant, ou le texte vide quand il n'y en a pas. */
function renvoi(valeur: unknown): string | undefined {
  return valeur === "" ? "" : identifiant(valeur);
}

function objets<Type>(valeur: unknown, taille: number, lire: (element: ObjetJson) => Type | null): Type[] | undefined {
  if (!Array.isArray(valeur)) {
    return undefined;
  }
  return valeur
    .filter(estObjet)
    .slice(0, taille)
    .map(lire)
    .filter((element): element is Type => element !== null);
}

/** Ne garde que les champs lus : un champ absent, inconnu ou du mauvais type n'apparaît pas. */
function sansAbsents(champs: Record<string, unknown>): ObjetJson {
  return Object.fromEntries(Object.entries(champs).filter(([, valeur]) => valeur !== undefined));
}

/**
 * Indique si une valeur JSON reste dans des bornes raisonnables : profondeur,
 * longueur des textes et des clés, taille des listes, nombre total de valeurs.
 *
 * Sert aux contenus qui doivent être repris à l'identique (leur empreinte en
 * dépend, ou leur forme appartient à l'interface) : on ne peut pas les
 * reconstruire champ par champ, on refuse au moins qu'ils soient démesurés.
 */
export function estJsonBorne(valeur: unknown): boolean {
  let noeuds = 0;
  const visiter = (courant: unknown, profondeur: number): boolean => {
    noeuds += 1;
    if (noeuds > BORNES_JSON.noeuds || profondeur > BORNES_JSON.profondeur) {
      return false;
    }
    if (typeof courant === "string") {
      return courant.length <= BORNES_JSON.texte;
    }
    if (typeof courant === "number") {
      return Number.isFinite(courant);
    }
    if (courant === null || typeof courant === "boolean") {
      return true;
    }
    if (Array.isArray(courant)) {
      return courant.length <= BORNES_JSON.liste && courant.every((element) => visiter(element, profondeur + 1));
    }
    if (estObjet(courant)) {
      const cles = Object.keys(courant);
      return (
        cles.length <= BORNES_JSON.cles &&
        cles.every((cle) => cle.length <= BORNES_JSON.cle && visiter(courant[cle], profondeur + 1))
      );
    }
    return false;
  };
  return visiter(valeur, 0);
}

function lireRegroupement(valeur: ObjetJson): ObjetJson | null {
  const id = identifiant(valeur.id);
  if (id === undefined) {
    return null;
  }
  return sansAbsents({
    id,
    libelle: texte(valeur.libelle, LONGUEURS.libelle),
    livrables: textes(valeur.livrables, LONGUEURS.nom, TAILLES.moyenne),
  });
}

function lireLigne(valeur: ObjetJson): ObjetJson | null {
  const code = texte(valeur.code, LONGUEURS.code);
  if (code === undefined || code === "") {
    return null;
  }
  return sansAbsents({
    code,
    ecs: textes(valeur.ecs, LONGUEURS.code, TAILLES.courte),
    op: renvoi(valeur.op),
    libelle: texte(valeur.libelle, LONGUEURS.libelle),
    livrables: textes(valeur.livrables, LONGUEURS.nom, TAILLES.moyenne),
  });
}

function lireOptions(valeur: unknown): ObjetJson | undefined {
  return estObjet(valeur) ? sansAbsents({ crit: booleen(valeur.crit), obs: booleen(valeur.obs) }) : undefined;
}

/** `annulee` : vrai, ou la date de l'annulation selon les versions. */
function lireAnnulation(valeur: unknown): boolean | string | undefined {
  return booleen(valeur) ?? texte(valeur, LONGUEURS.code);
}

/**
 * Reconstruit le modèle d'une évaluation reçue : ce qui se partage entre
 * enseignants, et rien d'autre. Les champs d'étudiants et les champs locaux
 * (`CHAMPS_LOCAUX`) n'y figurent pas : ils ne peuvent donc pas entrer par là.
 *
 * @returns `null` sans identifiant valide
 */
export function lireModeleRecu(valeur: unknown): Evaluation | null {
  if (!estObjet(valeur)) {
    return null;
  }
  const id = identifiant(valeur.id);
  if (id === undefined) {
    return null;
  }
  const modele = sansAbsents({
    titre: texte(valeur.titre, LONGUEURS.nom),
    consignes: texte(valeur.consignes, LONGUEURS.consignes),
    livrables: textes(valeur.livrables, LONGUEURS.nom, TAILLES.moyenne),
    semestre: texte(valeur.semestre, LONGUEURS.code),
    semManuel: booleen(valeur.semManuel),
    classes: textes(valeur.classes, LONGUEURS.nom, TAILLES.moyenne),
    classe: texte(valeur.classe, LONGUEURS.libelle),
    prof: texte(valeur.prof, LONGUEURS.libelle),
    profs: textes(valeur.profs, LONGUEURS.nom, TAILLES.moyenne),
    ues: textes(valeur.ues, LONGUEURS.nom, TAILLES.moyenne),
    ecCodes: textes(valeur.ecCodes, LONGUEURS.code, TAILLES.moyenne),
    compCode: texte(valeur.compCode, LONGUEURS.code),
    ops: objets(valeur.ops, TAILLES.longue, lireRegroupement),
    items: objets(valeur.items, TAILLES.longue, lireLigne),
    preset: texte(valeur.preset, LONGUEURS.code),
    niveaux: textes(valeur.niveaux, LONGUEURS.nom, TAILLES.courte),
    opts: lireOptions(valeur.opts),
    distribPrev: texte(valeur.distribPrev, LONGUEURS.code),
    renduPrev: texte(valeur.renduPrev, LONGUEURS.code),
    annulee: lireAnnulation(valeur.annulee),
  });
  return { ...modele, id };
}

/** Les quatre sortes d'éléments d'un référentiel. */
type Sorte = "ues" | "ecs" | "blocs" | "competences";

/** Codes d'un EC par année : `{ "1": "EC 1.2", "2": "EC 9.2" }`. */
function lireCodesParAnnee(valeur: unknown): ObjetJson | undefined {
  if (!estObjet(valeur)) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(valeur)
      .filter(([annee, code]) => /^\d{1,2}$/.test(annee) && typeof code === "string")
      .map(([annee, code]) => [annee, (code as string).slice(0, LONGUEURS.code)]),
  );
}

/** Lien d'une compétence vers un EC : l'EC et les semestres où elle y est travaillée (`null` : tous). */
function lireLienEc(valeur: ObjetJson): ObjetJson | null {
  const id = identifiant(valeur.id);
  if (id === undefined) {
    return null;
  }
  return sansAbsents({ id, sems: valeur.sems === null ? null : textes(valeur.sems, LONGUEURS.code, TAILLES.courte) });
}

/**
 * Reconstruit un élément de la structure d'un référentiel (qui est rattaché à
 * quoi, sur quels semestres) ; `null` sans identifiant valide.
 */
export function lireElementStructure(sorte: Sorte, valeur: unknown): (ObjetJson & { id: string }) | null {
  if (!estObjet(valeur)) {
    return null;
  }
  const id = identifiant(valeur.id);
  if (id === undefined) {
    return null;
  }
  const champs: Record<Sorte, () => Record<string, unknown>> = {
    ues: () => ({ sems: textes(valeur.sems, LONGUEURS.code, TAILLES.courte) }),
    ecs: () => ({
      ueId: renvoi(valeur.ueId),
      sems: textes(valeur.sems, LONGUEURS.code, TAILLES.courte),
      ects: texteOuNombre(valeur.ects, LONGUEURS.code),
      codes: lireCodesParAnnee(valeur.codes),
    }),
    blocs: () => ({}),
    competences: () => ({
      bloc: texteOuNombre(valeur.bloc, LONGUEURS.code),
      ecs: objets(valeur.ecs, TAILLES.moyenne, lireLienEc),
      ecIds: Array.isArray(valeur.ecIds) ? valeur.ecIds.filter((ec): ec is string => identifiant(ec) !== undefined).slice(0, TAILLES.moyenne) : undefined,
    }),
  };
  return { ...sansAbsents(champs[sorte]()), id };
}

/**
 * Reconstruit un élément du dictionnaire de libellés (noms, codes, couleurs) ;
 * `null` sans identifiant valide. La couleur a déjà été contrôlée en amont.
 */
export function lireElementDictionnaire(sorte: Sorte, valeur: unknown): (ObjetJson & { id: string }) | null {
  if (!estObjet(valeur)) {
    return null;
  }
  const id = identifiant(valeur.id);
  if (id === undefined) {
    return null;
  }
  const couleur = texte(valeur.couleur, LONGUEURS.code);
  const champs: Record<Sorte, () => Record<string, unknown>> = {
    ues: () => ({ nom: texte(valeur.nom, LONGUEURS.nom), code: texte(valeur.code, LONGUEURS.code), couleur }),
    ecs: () => ({ nom: texte(valeur.nom, LONGUEURS.nom), couleur }),
    blocs: () => ({ num: texteOuNombre(valeur.num, LONGUEURS.code), nom: texte(valeur.nom, LONGUEURS.nom) }),
    competences: () => ({ code: texte(valeur.code, LONGUEURS.code), libelle: texte(valeur.libelle, LONGUEURS.libelle) }),
  };
  return { ...sansAbsents(champs[sorte]()), id };
}

/** Année d'entrée plausible d'une promotion. */
const ANNEES_ADMISES = { premiere: 1990, derniere: 2200 } as const;

/** Ramène une promotion reçue, déjà lue, à des tailles raisonnables ; les étudiants sans identifiant valide sont écartés. */
export function bornerPromotion(promotion: PromotionEchangee): PromotionEchangee {
  const debut = promotion.debut;
  return {
    id: promotion.id,
    nom: promotion.nom.slice(0, LONGUEURS.nom),
    diplome: promotion.diplome.slice(0, LONGUEURS.nom),
    mention: promotion.mention.slice(0, LONGUEURS.nom),
    debut: debut !== null && Number.isInteger(debut) && debut >= ANNEES_ADMISES.premiere && debut <= ANNEES_ADMISES.derniere ? debut : null,
    eleves: promotion.eleves
      .filter((eleve) => estIdentifiantSur(eleve.id))
      .slice(0, TAILLES.longue)
      .map((eleve) => ({ id: eleve.id, nom: eleve.nom.slice(0, LONGUEURS.nom) })),
  };
}
