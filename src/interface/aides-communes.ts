// SPDX-License-Identifier: CECILL-2.1
/**
 * Petites aides communes à l'interface : échappement HTML, bulle d'annonce,
 * question oui / non, redessin de la barre des onglets, nom d'un bloc,
 * couleur et nom d'un EC ou d'une UE, ordre des EC.
 *
 * Reprises du fichier historique (décision 38) sans rien changer.
 */
import { numeroCode, ordreEc } from "../domaine/constituer";
import { afficherPage } from "./onglets";
import { tidy } from "./constantes";
import { peindreLigneEnregistrement } from "./editeur";
import { etat, type Objet } from "./etat";

const ANNEES = [1, 2, 3];

/** Durée d'affichage d'une bulle d'annonce, en millisecondes. */
const DUREE_ANNONCE = 3200;

let documentCourant: Document | null = null;

function page(): Document {
  if (documentCourant === null) throw new Error("aides communes : document absent");
  return documentCourant;
}

/** Nom d'un bloc de compétences du référentiel affiché, ou « Bloc n ». */
export function blocName(numero: unknown): string {
  const bloc = (etat.referentiel.blocs as Objet[]).find((candidat) => candidat.num === String(numero));
  return bloc ? (bloc.nom as string) : "Bloc " + String(numero);
}

/** Échappe un texte pour l'insérer dans du HTML (`&`, `<`, `>`, `"`). */
export function esc(valeur: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  return String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Pose une question oui / non dans une fenêtre : « Oui, l'ajouter » appelle
 * `oui`, « Non, juste cette évaluation », Échap ou un clic à côté appellent
 * `non`. Le focus revient ensuite où il était.
 *
 * @param html question, en HTML préparé par l'appelant (ses parties variables déjà échappées)
 */
export function askModal(html: string, oui?: () => void, non?: () => void): void {
  const document = page();
  const precedent = document.activeElement as HTMLElement | null;
  const fond = document.createElement("div");
  fond.className = "modal";
  const carte = document.createElement("div");
  carte.className = "card";
  carte.setAttribute("role", "dialog");
  carte.setAttribute("aria-modal", "true");
  const question = document.createElement("p");
  // La question arrive en HTML, comme avant : l'appelant en échappe les parties variables.
  question.innerHTML = html;
  const rangee = document.createElement("div");
  rangee.className = "row";
  const boutonNon = document.createElement("button");
  boutonNon.className = "btn ghost";
  boutonNon.setAttribute("data-no", "");
  boutonNon.textContent = "Non, juste cette évaluation";
  const boutonOui = document.createElement("button");
  boutonOui.className = "btn primary";
  boutonOui.setAttribute("data-yes", "");
  boutonOui.textContent = "Oui, l'ajouter";
  rangee.append(boutonNon, boutonOui);
  carte.append(question, rangee);
  fond.append(carte);
  const fermer = (suite?: () => void): void => {
    fond.remove();
    document.removeEventListener("keydown", touche);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- l'élément actif peut ne pas savoir prendre le focus
    if (precedent && precedent.focus) precedent.focus();
    if (suite) suite();
  };
  const touche = (evenement: KeyboardEvent): void => {
    if (evenement.key === "Escape") fermer(non);
  };
  boutonOui.onclick = () => {
    fermer(oui);
  };
  boutonNon.onclick = () => {
    fermer(non);
  };
  fond.onclick = (evenement) => {
    if (evenement.target === fond) fermer(non);
  };
  document.addEventListener("keydown", touche);
  document.body.appendChild(fond);
  boutonOui.focus();
}

/** Bulle d'annonce en bas de la fenêtre, retirée après quelques secondes. */
export function toast(message: string): void {
  const document = page();
  const bulle = document.createElement("div");
  bulle.className = "toast";
  bulle.textContent = message;
  document.body.appendChild(bulle);
  setTimeout(() => {
    bulle.remove();
  }, DUREE_ANNONCE);
}

/** Affiche la page de l'onglet courant et redessine la ligne d'enregistrement. */
export function paintTabs(): void {
  etat.ui.tab = afficherPage(page(), etat.ui.tab);
  peindreLigneEnregistrement();
}

/** Teinte tirée du texte, stable d'une fois sur l'autre. */
export function hueOf(cle: unknown): string {
  let teinte = 0;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- conversion de l'historique gardée à l'identique (décision 37)
  for (const caractere of String(cle || "")) teinte = (teinte * 31 + caractere.charCodeAt(0)) % 360;
  return `hsl(${String(teinte)} 52% 60%)`;
}

/** EC du référentiel affiché dont l'un des codes (d'une année) est `code`, ou `null`. */
export function refEcByCode(code: unknown): Objet | null {
  return ((etat.referentiel.ecs || []) as Objet[]).find((ec) => ANNEES.some((annee) => ((ec.codes || {}) as Record<number, unknown>)[annee] === code)) || null;
}

export function ecColor(code: unknown): string {
  const ec = refEcByCode(code);
  return (ec && (ec.couleur as string)) || hueOf(code);
}

export function ecNomRef(code: unknown): unknown {
  const ec = refEcByCode(code);
  return (ec && (ec.nom)) || code;
}

export function ueColor(ue: unknown): string {
  const trouvee = ((etat.referentiel.ues || []) as Objet[]).find((candidate) => tidy(candidate.nom) === tidy(ue));
  return (trouvee && (trouvee.couleur as string)) || hueOf(ue);
}

/** Rang d'une UE : celui de son premier EC dans le référentiel affiché, 99 si aucun. */
export function ueOrd(ue: unknown): number {
  const rang = ((etat.referentiel.ecs || []) as Objet[]).findIndex((ec) => tidy(ec.ue) === ue);
  return rang < 0 ? 99 : rang;
}

export function ecNum(code: unknown): number {
  return numeroCode(code);
}

/** Lien d'une compétence vers l'EC d'identifiant `id`, ou `null`. */
export function lienEc(competence: Objet | null | undefined, id: unknown): Objet | null {
  return (((competence || {}).ecs || []) as Objet[]).find((lien) => lien.id === id) || null;
}

export function ecOrd(ec: Objet | null | undefined): number {
  return ordreEc(ec || {});
}

/** Donne aux aides le document où poser bulles et questions. */
export function brancherAidesCommunes(document: Document | null): void {
  documentCourant = document;
}
