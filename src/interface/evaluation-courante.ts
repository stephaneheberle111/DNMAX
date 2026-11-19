// SPDX-License-Identifier: CECILL-2.1
/**
 * Aides de l'évaluation en cours telles que l'interface les appelle :
 * prénom et nom des personnes, liste des étudiants d'une promotion,
 * étudiants d'une évaluation, lignes de la grille, bilan de la saisie,
 * promotions et semestre retenus, compétences et EC du semestre.
 *
 * Repris du fichier historique (décision 38) ; les règles elles-mêmes sont
 * dans `domaine/`.
 */
import { classesNettoyees, ecsRetenus, lignesDe, normaliserEvaluation } from "../domaine/evaluation";
import { completerPersonne as completer, composerNom as composer, lignesNoms as lignes, nouvellePersonne as nouvelle, separerPrenomNom as separer, type Personne } from "../domaine/personnes";
import { rafraichirListe } from "../domaine/promotions";
import { bilanSaisie } from "../domaine/saisie-resultats";
import { ecNum } from "./aides-communes";
import { newId } from "./donnees";
import { ecsDeLUe } from "./editeur-etape1";
import { etat, type Objet } from "./etat";

/** Ligne de la grille sous la forme qu'attend l'affichage : les objets mêmes de l'évaluation. */
export type LigneGrille = { k: "op"; o: Objet; its: Objet[] } | { k: "one"; it: Objet };

/** Étudiant d'une évaluation, avec sa promotion. */
interface EtudiantDePromotion {
  id: string;
  nom: string;
  promo: Objet;
}

let tirage: () => number = () => 0;

function evaluation(): Objet {
  return etat.evaluation;
}

function competencesAffichees(): Objet[] {
  return etat.referentiel.competences as Objet[];
}

export function migF(brut: Objet): Objet {
  return Object.assign(brut, normaliserEvaluation(brut));
}

export function separerPrenomNom(saisie: unknown): { prenom: string; nomFam: string } {
  return separer(saisie);
}

export function composerNom(prenom: unknown, nomFam: unknown): string {
  return composer(prenom, nomFam);
}

export function nouvellePersonne(id: string, ligne: string): Personne {
  return nouvelle(id, ligne);
}

export function completerPersonne<T extends Record<string, unknown>>(personne: T): T & { prenom: string; nomFam: string } {
  return completer(personne);
}

export function lignesNoms(saisie: unknown): string[] {
  return lignes(saisie);
}

/**
 * Remplace la liste des étudiants d'une promotion par les lignes de `texte`
 * (ou la recompose si `texte` est absent) : un étudiant déjà présent garde
 * son identifiant, un nouveau en reçoit un.
 */
export function syncListe(promotion: Objet, texte?: string | null): Objet {
  const anciens = ((promotion.liste || []) as Objet[]).slice();
  const noms = texte == null ? ((promotion.liste || []) as Objet[]).map((etudiant) => etudiant.nom) : lignesNoms(texte);
  promotion.liste = noms.map((ligne) => {
    const { prenom, nomFam } = separerPrenomNom(ligne);
    const nom = composerNom(prenom, nomFam);
    const rang = anciens.findIndex((etudiant) => etudiant.nom === nom);
    return rang >= 0 ? completerPersonne(anciens.splice(rang, 1)[0] as Objet) : nouvellePersonne(newId("s"), ligne as string);
  });
  promotion.eleves = (promotion.liste as Objet[]).map((etudiant) => etudiant.nom).join("\n");
  return promotion;
}

/** Liste des étudiants d'une promotion, remise à jour. */
export function migPromo(promotion: Objet): Objet {
  return rafraichirListe(promotion);
}

/** Étudiants des promotions choisies (ou de l'ancienne promotion liée), sans doublon. */
export function promoElevesOf(cible: Objet): EtudiantDePromotion[] {
  const promotions = etat.promotions;
  let choisies = ((cible.classes || []) as unknown[]).map((nom) => promotions.find((promotion) => promotion.nom === nom)).filter(Boolean) as Objet[];
  if (!choisies.length) {
    const liee = promotions.find((promotion) => promotion.id === cible.promoId);
    if (liee) choisies = [liee];
  }
  const vus = new Set<unknown>();
  const etudiants: EtudiantDePromotion[] = [];
  choisies.forEach((promotion) => {
    (migPromo(promotion).liste as Objet[]).forEach((etudiant) => {
      if (!vus.has(etudiant.id)) {
        vus.add(etudiant.id);
        etudiants.push({ id: etudiant.id as string, nom: etudiant.nom as string, promo: promotion });
      }
    });
  });
  return etudiants;
}

/**
 * Étudiants d'une évaluation (l'évaluation en cours par défaut) : ceux de ses
 * promotions, sinon ceux saisis à la main ; réduits à ceux qu'elle vise si
 * l'un d'eux au moins existe encore.
 */
export function studentsOf(cible?: Objet): { id: string; nom: string }[] {
  const evaluee = cible || evaluation();
  let etudiants = promoElevesOf(evaluee).map((etudiant) => ({ id: etudiant.id, nom: etudiant.nom }));
  if (!etudiants.length)
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
    etudiants = String(evaluee.eleves || "")
      .split(/\r?\n/)
      .map((nom) => nom.trim())
      .filter(Boolean)
      .map((nom, rang) => ({ id: "libre" + String(rang), nom }));
  const ids = (Array.isArray(evaluee.eleveIds) ? evaluee.eleveIds : evaluee.eleveId ? [evaluee.eleveId] : []) as unknown[];
  if (ids.length) {
    const retenus = etudiants.filter((etudiant) => ids.includes(etudiant.id));
    if (retenus.length) return retenus;
  }
  return etudiants;
}

/** Lignes de la grille ; ce sont les objets mêmes de l'évaluation, que la saisie de la formulation modifie. */
export function lignesOf(cible: Objet): LigneGrille[] {
  const parCode = new Map(((cible.items || []) as Objet[]).map((item) => [item.code, item]));
  const parId = new Map(((cible.ops || []) as Objet[]).map((regroupement) => [regroupement.id, regroupement]));
  return lignesDe(cible).map((ligne) =>
    ligne.regroupement
      ? { k: "op", o: parId.get(ligne.regroupement.id) as Objet, its: ligne.competences.map((competence) => parCode.get(competence.code) as Objet) }
      : { k: "one", it: parCode.get(ligne.competence.code) as Objet },
  );
}

export function ligKey(ligne: LigneGrille): string {
  return ligne.k === "op" ? "op:" + String(ligne.o.id) : "one:" + String(ligne.it.code);
}

/** Code et libellé d'une ligne de la grille. */
export function ligTitre(ligne: LigneGrille): { code: string; lib: string; op: boolean } {
  if (ligne.k === "op")
    return {
      code: ligne.its.map((item) => item.code).join(" + "),
      lib: (ligne.o.libelle as string) || "(compétence opérationnelle à formuler)",
      op: true,
    };
  const competence = competencesAffichees().find((candidate) => candidate.code === ligne.it.code) || {};
  return { code: ligne.it.code as string, lib: (ligne.it.libelle as string) || (competence.libelle as string) || "", op: false };
}

/** Nombre d'étudiants et de lignes, et bilan de la saisie, d'une évaluation (l'évaluation en cours par défaut). */
export function evalStats(cible?: Objet): Objet {
  const evaluee = cible || evaluation();
  const etudiants = studentsOf(evaluee);
  const cles = lignesOf(evaluee).map(ligKey);
  return {
    els: etudiants.length,
    lignes: cles.length,
    ...bilanSaisie(
      evaluee.res,
      etudiants.map((etudiant) => etudiant.id),
      cles,
    ),
  };
}

export function setClasses(classes?: readonly unknown[] | null): void {
  Object.assign(evaluation(), classesNettoyees(classes || []));
}

/** Identifiant court tiré au hasard (évaluations, regroupements). */
export function uid(): string {
  return tirage().toString(36).slice(2, 9);
}

export function setSemestre(semestre: string): void {
  evaluation().semestre = semestre;
  syncItemEcs();
}

/** EC d'une compétence au semestre donné. */
export function ecsOf(competence: Objet, semestre: unknown): Objet[] {
  return ((competence.ecs || []) as Objet[]).filter((ec) => ec.sem === semestre);
}

/** Compétences du référentiel affiché qui ont au moins un EC au semestre. */
export function compsFor(semestre: unknown): Objet[] {
  return competencesAffichees().filter((competence) => ecsOf(competence, semestre).length > 0);
}

/** EC retenus pour une compétence : une UE retenue vaut tous ses EC du semestre. */
export function itemEcs(competence: Objet, semestre: unknown): string[] {
  const courante = evaluation();
  return ecsRetenus(
    ecsOf(competence, semestre).map((ec) => ec.ec as string),
    [...(courante.ecCodes as string[]), ...((courante.ues || []) as unknown[]).flatMap((ue) => ecsDeLUe(ue, semestre) as string[])],
  );
}

export function syncItemEcs(): void {
  const courante = evaluation();
  (courante.items as Objet[]).forEach((item) => {
    const competence = competencesAffichees().find((candidate) => candidate.code === item.code);
    item.ecs = competence ? itemEcs(competence, courante.semestre) : [];
  });
}

/** EC du semestre, sans doublon, dans l'ordre de leur numéro. */
export function ecsOfSem(semestre: unknown): Objet[] {
  const parCode = new Map<unknown, Objet>();
  competencesAffichees().forEach((competence) => {
    ecsOf(competence, semestre).forEach((ec) => {
      if (!parCode.has(ec.ec)) parCode.set(ec.ec, { ec: ec.ec, nom: ec.nom, ue: ec.ue, couleur: ec.couleur });
    });
  });
  return [...parCode.values()].sort((premier, second) => ecNum(premier.ec) - ecNum(second.ec));
}

/** Donne au module le hasard dont il tire les identifiants. */
export function brancherEvaluationCourante(hasard: () => number): void {
  tirage = hasard;
}
