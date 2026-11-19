// SPDX-License-Identifier: CECILL-2.1
/**
 * Contenu de « Charger un exemple » : un établissement fictif (enseignants,
 * mentions, étudiants) et des évaluations générées avec leurs résultats.
 * Tout est tiré d'une suite pseudo-aléatoire à graine fixe : le même jour,
 * l'exemple est toujours le même. L'ordre des tirages fait partie du
 * comportement (le changer change l'exemple). Les noms sont inventés.
 */
import { aimanterPourcentage, niveauDuPourcentage } from "./saisie-resultats";

const JOUR = 86_400_000;

/** Étudiants de la promotion de 2e année de l'exemple. */
export const ETUDIANTS_DEUXIEME_ANNEE: readonly string[] = [
  "Camille Ferrand", "Yasmine Haddad", "Noé Baptiste", "Linh Tran", "Timothée Vasseur",
  "Aïssatou Konaté", "Sacha Delaunay", "Rayan Mansouri", "Inès Carvalho", "Gaspard Rouvier",
  "Mariam Traoré", "Elif Yilmaz", "Soline Marchais", "Enzo Ferreira",
];
/** Étudiants de la promotion de 1re année de l'exemple. */
export const ETUDIANTS_PREMIERE_ANNEE: readonly string[] = [
  "Alix Gendreau", "Bilal Amrani", "Chloé Nkoulou", "Diego Ramos", "Esra Demir",
  "Fatoumata Sow", "Gabriel Kowalski", "Hugo Maréchal", "Idriss Benhamou", "Jade Nguyen",
  "Kenza Belkacem", "Lucie Pham",
];
const APPRECIATIONS = [
  "Travail régulier, le carnet suit vraiment le projet. Les planches gagneraient à hiérarchiser davantage les informations.",
  "Beaucoup d'intentions, des recherches foisonnantes ; reste à trancher et à tenir une piste jusqu'au bout.",
  "Les maquettes ont fait progresser l'assemblage. Soigner l'oral : annoncer le principe avant de détailler.",
  "Rendu complet et soigné. La démonstration technique est convaincante, le corpus de références mériterait d'être élargi.",
  "Quelques fragilités dans la mise en œuvre, mais le projet a trouvé sa cohérence au fil des séances.",
];
const OBSERVATIONS = ["Progrès net depuis la dernière séance.", "À reprendre : la mise à l'échelle.", "Très bonne tenue du carnet.", "Argumentation encore hésitante à l'oral."];
const APPRECIATIONS_COURTES = ["Bon engagement, à poursuivre.", "Travail sérieux, manque encore d'audace.", "Progrès nets depuis le dernier rendu.", "Attention à la régularité du carnet.", "Oral clair et argumenté."];
const PRENOMS = ["Adèle", "Aïcha", "Alix", "Amadou", "Ambre", "Anaïs", "Arthur", "Awa", "Baptiste", "Bilal", "Camille", "Capucine", "Chloé", "Clément", "Djibril", "Elias", "Elif", "Emma", "Fatou", "Gabin", "Hugo", "Ibrahim", "Inès", "Iris", "Jules", "Kenza", "Kim", "Léa", "Léon", "Lina", "Lou", "Lucas", "Maël", "Malik", "Manon", "Mehdi", "Mei", "Nina", "Noah", "Nour", "Oscar", "Rayan", "Rose", "Salomé", "Samir", "Sofia", "Théo", "Thomas", "Yanis", "Yasmine", "Zeynep", "Zoé"];
const NOMS = ["Arnaud", "Benhamou", "Bonnet", "Carvalho", "Chevalier", "Cissé", "Da Silva", "Diallo", "Dumas", "Durand", "Fabre", "Ferreira", "Garnier", "Girard", "Haddad", "Kaya", "Keita", "Kowalski", "Lambert", "Le Gall", "Lefèvre", "Mansouri", "Martin", "Mercier", "Moreau", "Morel", "N'Diaye", "Nguyen", "Perrin", "Pham", "Renaud", "Rossi", "Roux", "Saïdi", "Santos", "Traoré", "Tran", "Vidal", "Yilmaz", "Zhang"];

/** Enseignants des trois évaluations détaillées, avec leur discipline. */
export const ENSEIGNANTS_DETAILLES: readonly (readonly [string, string])[] = [
  ["Sophie Hébert", "Atelier de création"],
  ["Marc Lenoir", "Technologies et matériaux"],
  ["Amina Benali", "Humanités"],
];
/** Enseignants du jeu étendu ; le premier est « moi » s'il n'est pas déjà défini. */
export const ENSEIGNANTS_EXEMPLE: readonly string[] = ["Sophie Hébert", "Marc Lenoir", "Amina Benali", "Claire Nguyen", "Julien Marchetti", "Lucie Okafor"];
/** Mentions ajoutées à côté de celle du référentiel : nom, code et thème des évaluations. */
export const MENTIONS_EXEMPLE: readonly (readonly [string, string, string])[] = [
  ["Espace", "DNE", "l'aménagement d'espace"],
  ["Graphisme", "DNG", "l'identité visuelle"],
  ["Matériaux", "DNM", "la matière textile"],
];
/** Thème des évaluations de la mention du référentiel. */
export const THEME_MENTION_REFERENTIEL = "le mobilier";
/** Livrables proposés quand l'établissement n'en a aucun. */
export const LIVRABLES_PAR_DEFAUT: readonly string[] = ["Carnet de projet", "Planches de projet", "Oral de présentation de projet"];
const TYPES: readonly (readonly [string, string])[] = [
  ["Rendu de projet", "Carnet de projet"],
  ["Workshop", "Planches de projet"],
  ["Fiche de lecture", "Fiche de lecture"],
  ["Oral de présentation", "Oral de présentation de projet"],
  ["Carnet d'expérimentation", "Catalogue d'expérimentation"],
  ["Revue de projet", "Maquettes de recherches"],
  ["Dossier de recherche", "Devoir réflexif"],
  ["Exposition de fin de semestre", "Carnet d'exposition"],
];

/** Une suite pseudo-aléatoire dans [0, 1[. */
export type Hasard = () => number;

/** Suite des trois évaluations détaillées (congruence linéaire). */
export function suiteDetaillee(graine: number): Hasard {
  let etat = graine || 7;
  return () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
}

/** Suite du jeu étendu (générateur de Park et Miller). */
export function suiteEtendue(graine: number): Hasard {
  let etat = graine;
  return () => {
    etat = (etat * 16807) % 2147483647;
    return (etat - 1) / 2147483646;
  };
}

/** Graine du jeu étendu. */
export const GRAINE_ETENDUE = 20251;

/** Un élément de la liste, tiré au hasard (un tirage). */
export function tirer<T>(hasard: Hasard, liste: readonly T[]): T {
  return liste[Math.floor(hasard() * liste.length)] as T;
}

/** Copie mélangée de la liste (un tirage par élément après le premier). */
export function melanger<T>(hasard: Hasard, liste: readonly T[]): T[] {
  const copie = liste.slice();
  for (let rang = copie.length - 1; rang > 0; rang--) {
    const autre = Math.floor(hasard() * (rang + 1));
    [copie[rang], copie[autre]] = [copie[autre] as T, copie[rang] as T];
  }
  return copie;
}

/** Vrai si le nom a pu être tiré par l'exemple (prénom et nom de ses listes). */
export function estNomExemple(nom: unknown): boolean {
  const mots = String(nom).split(" ");
  return PRENOMS.includes(mots[0] ?? "") && NOMS.includes(mots.slice(1).join(" "));
}

/**
 * Noms distincts pour une promotion du jeu étendu : autant que d'étudiants
 * déjà là, sinon 12 à 16.
 */
export function nomsDePromotion(hasard: Hasard, dejaLa: number): string[] {
  const effectif = dejaLa || 12 + Math.floor(hasard() * 5);
  const vus = new Set<string>();
  const noms: string[] = [];
  while (noms.length < effectif) {
    const nom = `${tirer(hasard, PRENOMS)} ${tirer(hasard, NOMS)}`;
    if (!vus.has(nom)) {
      vus.add(nom);
      noms.push(nom);
    }
  }
  return noms;
}

/** Enseignants d'un EC (rang dans la liste des EC) : un, parfois deux. */
export function enseignantsDeLEc(hasard: Hasard, rang: number, enseignants: readonly string[]): string[] {
  const nombre = enseignants.length;
  if (hasard() < 0.2) return [enseignants[rang % nombre] ?? "", enseignants[(rang + 2) % nombre] ?? ""];
  return [enseignants[(rang + Math.floor(hasard() * 3)) % nombre] ?? ""];
}

/** Nombre de semestres déjà ouverts pour une promotion entrée il y a `anciennete` années (sortie si `anciennete` vaut la durée). */
export function semestresOuverts(anciennete: number, duree: number, rangSemestre: number): number {
  return anciennete < duree ? anciennete * 2 + rangSemestre : duree * 2;
}

/** Résultats d'un étudiant dans une évaluation de l'exemple. */
export interface ResultatExemple {
  n: Record<string, number>;
  p?: Record<string, number>;
  obs: Record<string, string>;
  appr: string;
  rest?: string;
}

/**
 * Résultats des trois évaluations détaillées : un niveau par ligne,
 * quelques observations et appréciations.
 *
 * @param inacheves nombre d'étudiants de fin de liste laissés inachevés :
 *   un sur deux non commencé, les autres saisis à moitié
 */
export function resultatsDetailles(etudiants: readonly string[], cles: readonly string[], nombreNiveaux: number, graine: number, inacheves: number): Record<string, ResultatExemple> {
  const hasard = suiteDetaillee(graine);
  const resultats: Record<string, ResultatExemple> = {};
  etudiants.forEach((etudiant, rang) => {
    const reste = etudiants.length - 1 - rang;
    if (inacheves && reste < inacheves && reste % 2 === 0) return;
    const partiel = inacheves > 0 && reste < inacheves;
    const resultat: ResultatExemple = { n: {}, obs: {}, appr: "" };
    cles.forEach((cle, position) => {
      if (partiel && position >= Math.max(1, Math.floor(cles.length / 2))) return;
      const base = 1 + Math.floor(hasard() * (nombreNiveaux - 1) + hasard() * 0.8);
      resultat.n[cle] = Math.max(0, Math.min(nombreNiveaux - 1, base));
    });
    if (!partiel && hasard() < 0.45) resultat.obs[cles[Math.floor(hasard() * cles.length)] ?? ""] = tirer(hasard, OBSERVATIONS);
    if (!partiel && hasard() < 0.5) resultat.appr = tirer(hasard, APPRECIATIONS);
    resultats[etudiant] = resultat;
  });
  return resultats;
}

/** Ligne d'une évaluation de l'exemple. */
export interface LigneExemple {
  code: string;
  ecs: string[];
  op: string;
  libelle: string;
  livrables: string[];
}

/** Ce que l'exemple sait d'une compétence du référentiel. */
export interface CompetenceExemple {
  readonly code: string;
  readonly ecs?: readonly { readonly sem?: string; readonly ec?: string }[];
}

/** Évaluation produite par l'exemple, au format enregistré par l'application. */
export type EvaluationExemple = Record<string, unknown> & { titre: string; items: LigneExemple[] };

/** Ce dont les trois évaluations détaillées ont besoin. */
export interface ContexteDetaille {
  competence(code: string): CompetenceExemple | undefined;
  /** EC retenus pour une compétence au semestre. */
  ecsRetenus(competence: CompetenceExemple, semestre: string): string[];
  nouvelIdentifiant(): string;
  /** Instant présent, en millisecondes. */
  readonly maintenant: number;
  /** Niveaux du jeu « maîtrise ». */
  readonly niveaux: readonly string[];
}

function jourIso(instant: number): string {
  return new Date(instant).toISOString().slice(0, 10);
}

function ligneDetaillee(contexte: ContexteDetaille, semestre: string, code: string, libelle: string, livrables: string[]): LigneExemple | null {
  const competence = contexte.competence(code);
  return competence === undefined ? null : { code, ecs: contexte.ecsRetenus(competence, semestre), op: "", libelle, livrables };
}

function sansAbsentes(lignes: (LigneExemple | null)[]): LigneExemple[] {
  return lignes.filter((ligne): ligne is LigneExemple => ligne !== null);
}

/** Évaluation de 2e année, au S3 : six lignes, deux regroupées par opération. */
export function evaluationMobilier(contexte: ContexteDetaille): EvaluationExemple {
  const carnet = "Carnet de projet";
  const maquettes = "Maquettes de recherches";
  const planches = "Planches de projet";
  const corpus = { id: contexte.nouvelIdentifiant(), libelle: "Constituer un corpus de références et en tirer des principes formels réutilisables", livrables: [carnet] };
  const assemblages = { id: contexte.nouvelIdentifiant(), libelle: "Éprouver les assemblages par la maquette et en dégager un principe technique viable", livrables: [maquettes] };
  const ligne = (code: string, libelle: string, livrables: string[]): LigneExemple | null => ligneDetaillee(contexte, "S3", code, libelle, livrables);
  const items = sansAbsentes([
    ligne("C4.1", "", [carnet]),
    ligne("C4.3", "", [carnet]),
    ligne("C10.3", "", [maquettes]),
    ligne("C11.2", "", [maquettes]),
    ligne("C10.6", "Présenter le principe d'assemblage sur deux planches lisibles à un mètre", [planches]),
    ligne("C2.1", "", [carnet]),
  ]);
  for (const item of items) {
    if (item.code === "C4.1" || item.code === "C4.3") item.op = corpus.id;
    if (item.code === "C10.3" || item.code === "C11.2") item.op = assemblages.id;
  }
  return {
    id: contexte.nouvelIdentifiant(), promoId: "", titre: "Évaluation intermédiaire — Mobilier modulaire en frêne",
    livrables: [carnet, maquettes, planches], semestre: "S3", classe: "DN MADE 2 Objet",
    date: jourIso(contexte.maintenant), prof: "Sophie Hébert",
    ues: ["UE ATELIERS DE CREATION"], ecCodes: ["EC 11.1", "EC 11.2"], compCode: "C10.6",
    consignes: "Rendu intermédiaire du projet : carnet de projet tenu depuis le lancement, trois maquettes de recherche au 1/5 sur l'assemblage, deux planches A2 présentant le principe retenu. Oral de cinq minutes devant le groupe.",
    ops: [corpus, assemblages], preset: "maitrise", niveaux: contexte.niveaux.slice(),
    opts: { crit: true, obs: true }, eleves: "", items,
  };
}

/** Évaluation de 1re année, au S1 : une fiche de lecture sur trois compétences. */
export function evaluationLecture(contexte: ContexteDetaille): EvaluationExemple {
  const items = sansAbsentes(
    ["C4.2", "C4.4", "C2.1"].map((code) => {
      const competence = contexte.competence(code);
      if (competence === undefined) return null;
      const ecs = (competence.ecs ?? []).filter((ec) => ec.sem === "S1").map((ec) => ec.ec ?? "");
      return { code, ecs, op: "", libelle: "", livrables: ["Fiche de lecture"] };
    }),
  );
  return {
    id: contexte.nouvelIdentifiant(), promoId: "", titre: "Fiche de lecture — Objets du quotidien",
    livrables: ["Fiche de lecture"], semestre: "S1", classe: "DN MADE 1 Objet",
    date: jourIso(contexte.maintenant - JOUR * 21), prof: "Sophie Hébert",
    ues: ["UE HUMANITES et CULTURE"], ecCodes: ["EC 1.1"], compCode: "C4.2",
    consignes: "Lecture d'un chapitre au choix dans la bibliographie, restitution en une page : thèse de l'auteur·rice, notions clés, lien avec le projet d'atelier en cours.",
    ops: [], preset: "maitrise", niveaux: contexte.niveaux.slice(),
    opts: { crit: true, obs: true }, eleves: "", items,
  };
}

/** Évaluation de 2e année, au S4 : soutenance orale et planches. */
export function evaluationSoutenance(contexte: ContexteDetaille): EvaluationExemple {
  const oral = "Oral de présentation de projet";
  const planches = "Planches de projet";
  const ligne = (code: string, libelle: string, livrables: string[]): LigneExemple | null => ligneDetaillee(contexte, "S4", code, libelle, livrables);
  const items = sansAbsentes([
    ligne("C10.6", "Exposer le projet en cinq minutes, intentions puis démonstration", [oral]),
    ligne("C2.2", "", [oral]),
    ligne("C11.5", "Tenir le calendrier annoncé et rendre les pièces attendues", [planches]),
  ]);
  return {
    id: contexte.nouvelIdentifiant(), promoId: "", titre: "Soutenance intermédiaire — oral et planches",
    livrables: [oral, planches], semestre: "S4", classe: "DN MADE 2 Objet",
    date: jourIso(contexte.maintenant - JOUR * 6), prof: "Marc Lenoir",
    ues: ["UE ATELIERS DE CREATION"], ecCodes: [], compCode: "",
    consignes: "Oral de cinq minutes devant le groupe, deux planches A2 affichées. Questions du jury pendant cinq minutes.",
    ops: [], preset: "maitrise", niveaux: contexte.niveaux.slice(),
    opts: { crit: true, obs: true }, eleves: "", items,
  };
}

/** Ce dont le jeu étendu a besoin pour un semestre d'une promotion. */
export interface SemestreExemple {
  readonly hasard: Hasard;
  /** Rang du semestre (0 pour S1). */
  readonly rang: number;
  readonly semestre: string;
  /** Compétences rattachées au semestre. */
  readonly competences: readonly CompetenceExemple[];
  ecsRetenus(competence: CompetenceExemple, semestre: string): string[];
  /** Livrables de l'établissement (ou ceux par défaut). */
  readonly livrables: readonly string[];
  readonly theme: string;
  readonly promotion: { readonly id: string; readonly nom: string };
  /** Année civile de la rentrée de la promotion. */
  readonly debut: number;
  readonly etudiants: readonly string[];
  readonly maintenant: number;
  nouvelIdentifiant(): string;
  readonly preset: string;
  readonly niveaux: readonly string[];
}

const MOIS_PREMIER_SEMESTRE = [9, 10, 11, 12, 0];
const MOIS_SECOND_SEMESTRE = [1, 2, 3, 4, 5];

/**
 * Deux ou trois évaluations d'un semestre écoulé (ou du mois à venir), avec
 * leur suivi, leurs résultats et leur restitution. Une partie est notée
 * « évaluée à la main » (hors DNMAX), sans résultats ; les évaluations
 * récentes sont en partie saisies.
 */
export function evaluationsDuSemestre(contexte: SemestreExemple): EvaluationExemple[] {
  const { hasard, rang, semestre, maintenant } = contexte;
  const evaluations: EvaluationExemple[] = [];
  const nombre = 2 + Math.floor(hasard() * 2);
  const annee = contexte.debut + Math.floor(rang / 2);
  const premier = rang % 2 === 0;
  for (let position = 0; position < nombre; position++) {
    const [type, livrableType] = tirer(hasard, TYPES);
    const livrable = contexte.livrables.includes(livrableType) ? livrableType : tirer(hasard, contexte.livrables);
    const choisies = melanger(hasard, contexte.competences).slice(0, 3 + Math.floor(hasard() * 4));
    const items: LigneExemple[] = choisies.map((competence) => ({ code: competence.code, ecs: contexte.ecsRetenus(competence, semestre), op: "", libelle: "", livrables: [livrable] }));
    const mois = (premier ? MOIS_PREMIER_SEMESTRE : MOIS_SECOND_SEMESTRE)[Math.min(4, Math.floor(((position + 0.5) * 5) / nombre))] ?? 0;
    const date = new Date(mois >= 8 ? annee : annee + 1, mois, 3 + Math.floor(hasard() * 24));
    const instant = date.getTime();
    const avenir = instant > maintenant;
    if (avenir && instant - maintenant > JOUR * 40) continue;
    const recente = maintenant - instant < JOUR * 20;
    const aLaMain = !avenir && hasard() < 0.28;
    const auPlusHier = (valeur: number): number => Math.min(valeur, maintenant - JOUR);
    const suivi: Record<string, string> = { saisie: jourIso(auPlusHier(instant - JOUR * (14 + Math.floor(hasard() * 10)))) };
    const distribution = instant - JOUR * (9 + Math.floor(hasard() * 4));
    if (!avenir || distribution < maintenant) {
      suivi.distrib = jourIso(distribution);
      suivi.butoir = jourIso(instant);
    }
    if (aLaMain && !recente) {
      suivi.evalue = jourIso(instant + JOUR * (2 + Math.floor(hasard() * 5)));
      suivi.mode = "main";
    } else if (aLaMain) suivi.mode = "main";
    const resultats: Record<string, ResultatExemple> = {};
    if (!avenir && !aLaMain) {
      for (const etudiant of contexte.etudiants) {
        const resultat: ResultatExemple = { n: {}, p: {}, obs: {}, appr: "" };
        const base = 18 + rang * 11 + (hasard() * 30 - 15);
        for (const item of items) {
          if (recente && hasard() < 0.35) continue;
          const pourcentage = aimanterPourcentage(Math.max(0, Math.min(100, base + hasard() * 40 - 12)), 4);
          (resultat.p ?? {})[`one:${item.code}`] = pourcentage;
          resultat.n[`one:${item.code}`] = niveauDuPourcentage(pourcentage, 4);
        }
        if (hasard() < 0.25) resultat.appr = tirer(hasard, APPRECIATIONS_COURTES);
        resultats[etudiant] = resultat;
      }
    }
    const id = contexte.nouvelIdentifiant();
    const enseignant = tirer(hasard, ENSEIGNANTS_EXEMPLE);
    const restitution = new Date(instant + JOUR * (7 + Math.floor(hasard() * 10)));
    const restit: Record<string, string> = {};
    if (!(avenir || recente || restitution.getTime() > maintenant || (aLaMain && suivi.evalue === undefined))) {
      const jour = restitution.toISOString().slice(0, 10);
      for (const resultat of Object.values(resultats)) if (hasard() < 0.92) resultat.rest = jour;
      restit[contexte.promotion.nom] = jour;
    }
    evaluations.push({
      id, demo: true, promoId: contexte.promotion.id, classes: [contexte.promotion.nom], classe: contexte.promotion.nom,
      titre: `${type} — ${contexte.theme} (${semestre})`, livrables: [livrable], semestre, date: date.toISOString().slice(0, 10), prof: enseignant,
      ues: [], ecCodes: [], compCode: "", consignes: `${type} portant sur ${contexte.theme}.`, ops: [], preset: contexte.preset, niveaux: contexte.niveaux.slice(),
      opts: { crit: true, obs: true }, eleves: "", items, res: resultats, suivi, restit,
    });
  }
  return evaluations;
}
