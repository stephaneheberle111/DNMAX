// SPDX-License-Identifier: CECILL-2.1
/**
 * Versions et validation du référentiel, telles que l'interface les tient :
 * versions datées de chaque mention, version suivie par une promotion ou par
 * l'évaluation en cours, validation (avec la question des promotions qui
 * passent à la nouvelle version), retour à une version, changement de la
 * mention affichée.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom, que le fichier
 * historique appelle encore ; les règles sont dans `domaine/versions-referentiel`.
 */
import { absorber, materialiser, projeterReferentiel, projeterVersion, referentielDe, SORTES, type Referentiel } from "../domaine/modele-donnees";
import {
  diplomeBloquant,
  mentionDeLEvaluation,
  nombreEtudiants,
  promotionDeLEvaluation,
  promotionsDeLEvaluation,
  referentielIdentique,
  usageDeLaVersion,
  versionDeLaPromotion,
  versionDeLEvaluation,
} from "../domaine/versions-referentiel";
import { etat, type Objet } from "./etat";
import { anneeDeFormation, anneeScolaire, dureePromotion, enregistrerPromotions, nomCourt, normaliserPromotion, promotionALAnnee } from "./promotions-calendrier";

/** Ce que le module appelle encore dans le fichier historique. */
interface FonctionsHistoriques {
  newId(prefixe: string): string;
  persistData(): void;
  toast(message: string): void;
  paintRef(): void;
  paintForm(): void;
  paintPick(): void;
  paintLignes(): void;
}

/** Ce que le module reçoit de l'application. */
export interface Branchements {
  /** Enregistre une entrée du stockage (les évaluations). */
  ecrireStockage(cle: string, valeur: string): void;
  /** Le référentiel de la promotion est-il validé ? (règle de `domaine/validation-referentiel`) */
  promotionValide(donnees: Objet, promotion: Objet): boolean;
  /** Le référentiel en vigueur du diplôme est-il validé ? */
  diplomeValide(donnees: Objet, diplome: string): boolean;
  /** L'heure, passée en paramètre pour les essais. */
  maintenant(): Date;
}

/** Fenêtre où vivent les fonctions publiées et celles du fichier historique. */
type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};
let branchements: Branchements = {
  ecrireStockage: () => undefined,
  promotionValide: () => false,
  diplomeValide: () => false,
  maintenant: () => new Date(),
};

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function donnees(): Objet {
  return etat.donnees;
}

function mentionAffichee(): string {
  return donnees().activeDiplome as string;
}

function enVigueur(diplome: unknown): unknown {
  return ((donnees().valide ?? {}) as Objet)[diplome as string];
}

function aujourdhui(): string {
  return branchements.maintenant().toISOString().slice(0, 10);
}

function nouvelIdentifiant(prefixe: string): string {
  return historique().newId(prefixe);
}

function copie<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}

/** Versions datées du diplôme (la plus récente d'abord), créées vides au besoin. */
export function versionsDe(diplome: string): Objet[] {
  const lesDonnees = donnees();
  lesDonnees.versions = lesDonnees.versions ?? {};
  const parDiplome = lesDonnees.versions as Record<string, Objet[] | undefined>;
  parDiplome[diplome] = parDiplome[diplome] ?? [];
  return parDiplome[diplome];
}

/** Référentiel de travail du diplôme, sorte par sorte, en texte. */
export function referentielEnTexte(diplome: string): string {
  const referentiel = referentielDe(donnees(), diplome);
  return JSON.stringify(SORTES.map((sorte) => referentiel[sorte]));
}

/** Version en vigueur du diplôme, ou `null`. */
export function versionActive(diplome: string): Objet | null {
  return versionsDe(diplome).find((version) => version.id === enVigueur(diplome)) ?? null;
}

/** Vrai si le référentiel de travail du diplôme est exactement sa version en vigueur. */
export function referentielAJour(diplome: string): boolean {
  const version = versionActive(diplome);
  return !!version && referentielIdentique(version.snap as Objet, referentielDe(donnees(), diplome), SORTES);
}

/**
 * Validation par l'enseignant, qui est responsable du référentiel sur lequel
 * il évalue : seule une version qu'il a attestée lui-même (date
 * d'attestation) permet de créer ou d'enregistrer une évaluation et de saisir
 * des résultats. Une version reçue, livrée avec l'application ou validée
 * avant l'attestation n'en a pas.
 */
export function diplomeAReferentielValide(diplome: string): boolean {
  return branchements.diplomeValide(donnees(), diplome);
}

export function promotionAReferentielValide(promotion: Objet): boolean {
  return branchements.promotionValide(donnees(), promotion);
}

export function promotionsDe(evaluation: Objet): Objet[] {
  return promotionsDeLEvaluation(evaluation, etat.promotions);
}

/** Diplôme dont le référentiel bloque l'évaluation, ou texte vide si rien ne la bloque. */
export function diplomeQuiBloque(evaluation: Objet): string {
  return diplomeBloquant(promotionsDe(evaluation), mentionAffichee(), diplomeAReferentielValide, promotionAReferentielValide);
}

export function promotionDe(evaluation: Objet): Objet | null {
  return promotionDeLEvaluation(evaluation, etat.promotions);
}

/** Identifiant de la version que suit la promotion. */
export function versionDeLaPromotionDonnee(promotion: Objet | null): string {
  if (!promotion) return "";
  return versionDeLaPromotion(promotion, versionsDe(promotion.diplomeId as string), enVigueur(promotion.diplomeId));
}

/** Promotions du diplôme en cours de formation à l'année scolaire du jour. */
export function promotionsEnCours(diplome: string): Objet[] {
  const scolaire = anneeScolaire(aujourdhui());
  return etat.promotions.map(normaliserPromotion).filter((promotion) => {
    if (promotion.diplomeId !== diplome) return false;
    const annee = anneeDeFormation(promotion, scolaire);
    return annee >= 1 && annee <= dureePromotion(promotion);
  });
}

/** Version suivie par l'évaluation en cours, dans la mention affichée, ou `null`. */
export function versionDeLEvaluationEnCours(): Objet | null {
  const mention = mentionAffichee();
  const versions = versionsDe(mention);
  return versionDeLEvaluation(etat.evaluation, promotionDe(etat.evaluation), mention, versions, enVigueur(mention));
}

export function projeterCopie(lesDonnees: Objet, diplome: string, version: Referentiel): Objet {
  return projeterVersion(lesDonnees, diplome, version);
}

/**
 * Référentiel tel que l'interface le lit : la version que suit l'évaluation
 * en cours, sinon le référentiel de travail de la mention affichée. Une
 * version illisible fait revenir au référentiel de travail.
 */
export function referentielAffiche(): Objet {
  try {
    const version = versionDeLEvaluationEnCours();
    return version ? projeterVersion(donnees(), mentionAffichee(), version.snap as Referentiel) : projeterReferentiel(donnees());
  } catch {
    return projeterReferentiel(donnees());
  }
}

export function usageVersion(diplome: string, version: string): { ps: Objet[]; fs: Objet[] } {
  return usageDeLaVersion(diplome, version, etat.promotions, etat.evaluations, versionDeLaPromotionDonnee);
}

function enregistrerEvaluations(): void {
  try {
    branchements.ecrireStockage("dnmade.fiches", JSON.stringify(etat.evaluations));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
}

/** Relit le référentiel affiché et redessine le référentiel. */
function rafraichirReferentiel(): void {
  etat.referentiel = referentielAffiche();
  historique().paintRef();
}

/**
 * Valide le référentiel de la mention affichée. Appelée seulement une fois
 * l'attestation cochée : la version validée la porte.
 */
export function validerVersion(date?: unknown, note?: unknown): void {
  absorber(donnees(), nouvelIdentifiant);
  const diplome = mentionAffichee();
  const referentiel = referentielDe(donnees(), diplome);
  const precedente = (enVigueur(diplome) as string) || "";
  const jour = aujourdhui();
  // Version en vigueur identique au référentiel, mais jamais attestée (reçue, installée) : on l'atteste
  // sans en créer une copie, pour que promotions et évaluations qui la suivent n'aient pas à changer de version.
  const active = versionActive(diplome);
  if (active && !active.attestation && referentielAJour(diplome)) {
    active.attestation = jour;
    historique().persistData();
    rafraichirReferentiel();
    historique().toast(`Référentiel validé — version du ${String(dateEnLettres(active.date))}, vérifiée par vous.`);
    return;
  }
  const version: Objet = {
    id: nouvelIdentifiant("v"),
    date: date || jour,
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- note saisie, convertie comme avant
    note: String(note || "").trim(),
    attestation: jour,
    snap: copie({ ues: referentiel.ues, ecs: referentiel.ecs, blocs: referentiel.blocs, competences: referentiel.competences }),
  };
  // Ce qui suivait l'ancienne version y reste attaché : promotions sans choix explicite, évaluations enregistrées.
  if (precedente) {
    etat.promotions.forEach((promotion) => {
      if (promotion.diplomeId === diplome && !promotion.refV) promotion.refV = precedente;
    });
    etat.evaluations.forEach((evaluation) => {
      if (!evaluation.refV) {
        const promotion = promotionDe(evaluation);
        if (promotion && promotion.diplomeId === diplome) evaluation.refV = precedente;
      }
    });
    enregistrerPromotions();
    enregistrerEvaluations();
  }
  versionsDe(diplome).unshift(version);
  donnees().valide = Object.assign({}, donnees().valide ?? {});
  (donnees().valide as Objet)[diplome] = version.id;
  historique().persistData();
  rafraichirReferentiel();
  const enCours = promotionsEnCours(diplome);
  if (precedente && enCours.length) demanderPromotionsDeLaVersion(diplome, version, enCours);
  else historique().toast(`Référentiel validé — version du ${String(dateEnLettres(version.date))}${enCours.length ? ", appliquée aux promotions de cette mention." : "."}`);
}

/**
 * Libellé d'une promotion dans le choix des promotions qui passent à une
 * nouvelle version : nom court, nom, année de formation, année scolaire et
 * nombre d'étudiants.
 */
export function libellePromotion(promotion: Objet): string {
  promotionALAnnee(promotion);
  const court = nomCourt(promotion);
  /* eslint-disable @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string -- même concaténation que l'interface historique */
  return `${court ? `${court} — ` : ""}${(promotion.nom as string) || "Sans nom"} · Année ${promotion.annee}${promotion.as ? ` · ${promotion.as}` : ""} (${String(nombreEtudiants(promotion.eleves))})`;
  /* eslint-enable @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string */
}

/** Texte d'une valeur affichée dans la fenêtre : rien pour une valeur absente, comme l'interface historique. */
function affiche(valeur: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface historique
  return valeur == null ? "" : String(valeur);
}

/** Élément sans attribut `class` vide, pour garder le balisage de l'interface historique. */
function element<Balise extends keyof HTMLElementTagNameMap>(balise: Balise, attributs: Record<string, string> = {}, ...enfants: (Node | string)[]): HTMLElementTagNameMap[Balise] {
  const noeud = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) noeud.setAttribute(nom, valeur);
  noeud.append(...enfants);
  return noeud;
}

/** Fenêtre : à quelles promotions en cours appliquer la version qui vient d'être validée ? */
export function demanderPromotionsDeLaVersion(diplome: string, version: Objet, enCours: Objet[]): void {
  const precedent = document.activeElement as HTMLElement | null;
  const dateDeVersion = (id: unknown): string => {
    const trouvee = versionsDe(diplome).find((candidate) => candidate.id === id);
    return trouvee ? affiche(dateEnLettres(trouvee.date)) : "référentiel non validé";
  };
  const lignes = enCours.map((promotion) =>
    element(
      "label",
      { class: "sw", style: "align-items:flex-start" },
      element("input", { type: "checkbox", "data-pv": affiche(promotion.id), checked: "" }),
      element("span", {}, libellePromotion(promotion), element("br"), element("span", { class: "hint", style: "font-size:11.5px" }, `actuellement : version du ${dateDeVersion(promotion.refV)}`)),
    ),
  );
  const refuser = element("button", { class: "btn ghost", "data-no": "" }, "N'appliquer à aucune");
  const appliquer = element("button", { class: "btn primary", "data-yes": "" }, "Appliquer");
  const titre = element("p", { id: "pvT" }, element("b", {}, `Version du ${affiche(dateEnLettres(version.date))} validée`), " — à quelles promotions en cours l'appliquer ?");
  const fenetreModale = element("div", { class: "modal" });
  fenetreModale.append(
    element(
      "div",
      { class: "card", role: "dialog", "aria-modal": "true", "aria-labelledby": "pvT", style: "max-width:480px;width:100%" },
      titre,
      element("div", { style: "display:flex;flex-direction:column;gap:6px;margin:6px 0 10px" }, ...lignes),
      element(
        "p",
        { class: "hint", style: "font-size:12.5px" },
        "Les évaluations déjà enregistrées gardent le référentiel sur lequel elles ont été faites. Les nouvelles promotions utiliseront cette version.",
      ),
      element("div", { class: "row" }, refuser, appliquer),
    ),
  );
  const fermer = (): void => {
    fenetreModale.remove();
    document.removeEventListener("keydown", clavier);
    precedent?.focus();
    etat.referentiel = referentielAffiche();
    historique().paintRef();
    historique().paintForm();
    historique().paintPick();
  };
  const aucune = (): void => {
    fermer();
    historique().toast("Version validée, appliquée à aucune promotion en cours.");
  };
  const clavier = (evenement: KeyboardEvent): void => {
    if (evenement.key === "Escape") aucune();
  };
  refuser.onclick = aucune;
  appliquer.onclick = () => {
    let nombre = 0;
    fenetreModale.querySelectorAll<HTMLInputElement>("[data-pv]").forEach((case_) => {
      if (case_.checked) {
        const promotion = etat.promotions.find((candidate) => candidate.id === case_.dataset.pv);
        if (promotion) {
          promotion.refV = version.id;
          nombre++;
        }
      }
    });
    enregistrerPromotions();
    fermer();
    historique().toast(`Version du ${String(dateEnLettres(version.date))} appliquée à ${String(nombre)} promotion${nombre > 1 ? "s" : ""}.`);
  };
  document.addEventListener("keydown", clavier);
  document.body.appendChild(fenetreModale);
}

/** Revient à une version validée de la mention affichée : elle redevient le référentiel de travail et la version en vigueur. */
export function restaurerVersion(id: unknown): void {
  const diplome = mentionAffichee();
  const version = versionsDe(diplome).find((candidate) => candidate.id === id);
  if (!version) return;
  const referentiel = referentielDe(donnees(), diplome);
  const contenu = version.snap as Partial<Record<string, unknown[]>>;
  SORTES.forEach((sorte) => {
    referentiel[sorte] = copie(contenu[sorte] || []) as Referentiel[typeof sorte];
  });
  donnees().valide = Object.assign({}, donnees().valide ?? {});
  (donnees().valide as Objet)[diplome] = version.id;
  materialiser(donnees());
  etat.referentiel = referentielAffiche();
  historique().persistData();
  historique().paintRef();
  historique().paintForm();
  historique().paintPick();
  historique().paintLignes();
  historique().toast(`Version du ${String(dateEnLettres(version.date))} rétablie.${version.attestation ? "" : " Validez-la avant d'évaluer avec."}`);
}

/**
 * Mention de la promotion d'une évaluation, dont on affiche le référentiel :
 * chaque mention a le sien, et une évaluation suit toujours la mention de sa promotion.
 */
export function mentionDe(evaluation: Objet): string {
  return mentionDeLEvaluation(evaluation, etat.promotions, (donnees().diplomes ?? []) as Objet[]);
}

/** Affiche le référentiel d'une autre mention (le référentiel de travail est d'abord rangé). */
export function afficherMention(diplome: string): void {
  if (!diplome || diplome === mentionAffichee()) return;
  absorber(donnees(), nouvelIdentifiant);
  donnees().activeDiplome = diplome;
  materialiser(donnees());
  etat.referentiel = referentielAffiche();
  historique().persistData();
}

/** « 1 septembre 2026 » ; une date illisible est rendue telle quelle. */
export function dateEnLettres(date: unknown): unknown {
  const jour = new Date(`${String(date)}T12:00:00`);
  return Number.isNaN(jour.getTime()) ? date : jour.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Publie ces fonctions sous leurs anciens noms, pour le fichier historique. */
export function publierVersionsReferentiel(cible: Fenetre, recu: Branchements): void {
  fenetre = cible;
  branchements = recu;
  Object.assign(cible, {
    versionsOf: versionsDe,
    refJSON: referentielEnTexte,
    versionActive,
    refAJour: referentielAJour,
    dipRefValide: diplomeAReferentielValide,
    promoRefValide: promotionAReferentielValide,
    promosDeF: promotionsDe,
    dipBloquant: diplomeQuiBloque,
    promoDeF: promotionDe,
    promoVid: versionDeLaPromotionDonnee,
    promosEnCours: promotionsEnCours,
    versionPourF: versionDeLEvaluationEnCours,
    projectSnap: projeterCopie,
    computeREF: referentielAffiche,
    versionUsage: usageVersion,
    validerVersion,
    promoLabel: libellePromotion,
    askPromosVersion: demanderPromotionsDeLaVersion,
    restaurerVersion,
    mentionDeFiche: mentionDe,
    vueMention: afficherMention,
    frDate: dateEnLettres,
  });
}
