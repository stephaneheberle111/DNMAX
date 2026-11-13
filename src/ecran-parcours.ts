// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-parcours.css";
import {
  CLE_PARCOURS,
  CLE_REPRISE,
  lireReprise,
  doitLancerAuDemarrage,
  estIdentifiantParcours,
  lireAvancement,
  noterParcoursVu,
  type Avancement,
  type IdentifiantParcours,
} from "./domaine/parcours";
import type { AccesDonnees } from "./ecran-echange";
import { chapitreDe, PARCOURS_DEFINIS, type Etape, type Parcours } from "./parcours-etapes";

/** Marge autour de la zone éclairée, en pixels. */
const MARGE = 8;
/** Intervalle de relecture de l'avancement et de l'écran, en millisecondes. */
const INTERVALLE_SUIVI = 400;
/** Durée pendant laquelle la réussite d'une étape est saluée avant de passer à la suivante. */
const DUREE_SALUT = 1100;
/** Durée du glissement de la zone éclairée d'une étape à la suivante, en millisecondes. */
const DUREE_GLISSEMENT = 750;
/** Au-delà de cette part de l'écran, la zone éclairée est trop grande pour y accoler la bulle. */
const PART_ECRAN_MAX = 0.55;

const IDENTIFIANT_PANNEAU_VISITES = "panneau-visites";

/** Boîtes de dialogue de l'application : quand l'une est ouverte, elle grise déjà le reste. */
const SELECTEUR_BOITES = '.echange-fond, .modal:not([hidden]), [role="dialog"][aria-modal="true"]';

type Acces = Pick<AccesDonnees, "lireEntrees" | "ecrireEntree">;

interface Visite {
  identifiant: IdentifiantParcours;
  index: number;
  /** Objectif de l'étape déjà atteint en y entrant (la bulle le dit au lieu de le demander). */
  dejaFait: boolean;
  salut: number | null;
}

let visite: Visite | null = null;
let acces: Acces | null = null;
let suivi: number | null = null;
let cadre: number | null = null;
let cibleSuivie: Element | null = null;
let cibleCourante: Element | null = null;
/** Zone éclairée telle qu'affichée, qui glisse vers la zone visée à chaque changement d'étape. */
let zoneAffichee: DOMRect | null = null;
let glissement: { depart: DOMRect; debut: number } | null = null;
/** La bulle n'apparaît qu'une fois la zone arrivée, directement à sa place. */
let bulleRevelee = false;

function centreEcran(): DOMRect {
  return new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
}

/** Accélère puis ralentit : le mouvement se lit d'un bout à l'autre. */
function adoucir(progression: number): number {
  return progression < 0.5 ? 4 * progression ** 3 : 1 - (-2 * progression + 2) ** 3 / 2;
}

function interpoler(depart: DOMRect, arrivee: DOMRect, part: number): DOMRect {
  const entre = (a: number, b: number): number => a + (b - a) * part;
  return new DOMRect(
    entre(depart.x, arrivee.x),
    entre(depart.y, arrivee.y),
    entre(depart.width, arrivee.width),
    entre(depart.height, arrivee.height),
  );
}

/** Rend la zone à afficher à cet instant, et dit si elle est encore en mouvement. */
function avancerGlissement(visee: DOMRect, maintenant: number): { zone: DOMRect; enMouvement: boolean } {
  if (glissement === null) {
    return { zone: visee, enMouvement: false };
  }
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progression = reduit ? 1 : Math.min(1, (maintenant - glissement.debut) / DUREE_GLISSEMENT);
  if (progression >= 1) {
    glissement = null;
    return { zone: visee, enMouvement: false };
  }
  return { zone: interpoler(glissement.depart, visee, adoucir(progression)), enMouvement: true };
}
let ecouteClic: ((evenement: Event) => void) | null = null;

const elements = {
  voiles: [] as HTMLElement[],
  anneau: null as HTMLElement | null,
  curseur: null as HTMLElement | null,
  bulle: null as HTMLElement | null,
};

function creer<K extends keyof HTMLElementTagNameMap>(balise: K, classe = "", texte = ""): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  if (classe !== "") {
    element.className = classe;
  }
  if (texte !== "") {
    element.textContent = texte;
  }
  return element;
}

function etapeCourante(): Etape | null {
  return visite === null ? null : (PARCOURS_DEFINIS[visite.identifiant].etapes[visite.index] ?? null);
}

function avancement(): Avancement {
  return lireAvancement(acces?.lireEntrees() ?? {});
}

function estVisible(element: Element): boolean {
  if (element instanceof HTMLElement && element.closest("[hidden]") !== null) {
    return false;
  }
  const rectangle = element.getBoundingClientRect();
  return rectangle.width > 0 && rectangle.height > 0;
}

function trouverCible(etape: Etape): Element | null {
  for (const selecteur of etape.cibles ?? []) {
    for (const candidat of document.querySelectorAll(selecteur)) {
      if (estVisible(candidat) && !candidat.closest(".parcours-bulle")) {
        return candidat;
      }
    }
  }
  return null;
}

/** Une étape se saute quand son écran est déjà affiché ou que le but de son groupe est atteint. */
function estASauter(etape: Etape | undefined, etat: Avancement): boolean {
  if (etape === undefined) {
    return false;
  }
  return (etape.groupeFait?.(etat) ?? false) || (etape.atteinte?.() ?? false);
}

function noterVu(identifiant: IdentifiantParcours): void {
  if (acces === null) {
    return;
  }
  acces.ecrireEntree(CLE_PARCOURS, noterParcoursVu(acces.lireEntrees()[CLE_PARCOURS], identifiant));
}

function construire(): void {
  if (elements.bulle !== null) {
    return;
  }
  elements.voiles = [0, 1, 2, 3].map(() => {
    const voile = creer("div", "parcours-voile");
    // Le voile retient les clics : seule la zone éclairée reste utilisable.
    voile.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      elements.bulle?.classList.remove("parcours-secoue");
      void elements.bulle?.getBoundingClientRect();
      elements.bulle?.classList.add("parcours-secoue");
    });
    return voile;
  });
  elements.anneau = creer("div", "parcours-anneau");
  elements.curseur = creer("div", "parcours-curseur");
  elements.curseur.setAttribute("aria-hidden", "true");
  elements.bulle = creer("section", "parcours-bulle");
  elements.bulle.setAttribute("role", "dialog");
  elements.bulle.setAttribute("aria-modal", "false");
  elements.bulle.setAttribute("aria-live", "polite");
  document.body.append(...elements.voiles, elements.anneau, elements.curseur, elements.bulle);
  document.addEventListener("keydown", surTouche, true);
}

function demonter(): void {
  for (const element of [...elements.voiles, elements.anneau, elements.curseur, elements.bulle]) {
    element?.remove();
  }
  elements.voiles = [];
  zoneAffichee = null;
  glissement = null;
  elements.anneau = null;
  elements.curseur = null;
  elements.bulle = null;
  document.removeEventListener("keydown", surTouche, true);
  detacherClic();
  if (suivi !== null) {
    window.clearInterval(suivi);
    suivi = null;
  }
  if (cadre !== null) {
    window.cancelAnimationFrame(cadre);
    cadre = null;
  }
}

function surTouche(evenement: KeyboardEvent): void {
  // Échap ferme d'abord une boîte ouverte de l'application ; sans boîte, il quitte la visite.
  if (evenement.key === "Escape" && document.querySelector(SELECTEUR_BOITES) === null) {
    terminer();
  }
}

function detacherClic(): void {
  if (cibleSuivie !== null && ecouteClic !== null) {
    cibleSuivie.removeEventListener("click", ecouteClic, true);
  }
  cibleSuivie = null;
  ecouteClic = null;
}

/** Note l'étape en cours pour la session : un rechargement de la page (après un import) reprend ici. */
function noterReprise(): void {
  try {
    if (visite === null) {
      window.sessionStorage.removeItem(CLE_REPRISE);
    } else {
      window.sessionStorage.setItem(CLE_REPRISE, JSON.stringify({ identifiant: visite.identifiant, index: visite.index }));
    }
  } catch {
    // Sans stockage de session, la visite repartira simplement du début après un rechargement.
  }
}

function lireRepriseSession(): ReturnType<typeof lireReprise> {
  try {
    return lireReprise(window.sessionStorage.getItem(CLE_REPRISE));
  } catch {
    return null;
  }
}

/** Ferme la visite ; elle est notée comme vue, qu'elle soit terminée ou passée. */
export function terminer(): void {
  if (visite !== null) {
    noterVu(visite.identifiant);
  }
  visite = null;
  noterReprise();
  demonter();
}

function aller(index: number): void {
  if (visite === null) {
    return;
  }
  const etapes = PARCOURS_DEFINIS[visite.identifiant].etapes;
  const etat = avancement();
  let suivant = index;
  while (suivant < etapes.length - 1 && estASauter(etapes[suivant], etat)) {
    suivant += 1;
  }
  if (suivant >= etapes.length) {
    terminer();
    return;
  }
  const etape = etapes[suivant];
  if (etape === undefined) {
    terminer();
    return;
  }
  visite.index = suivant;
  noterReprise();
  glissement = { depart: zoneAffichee ?? centreEcran(), debut: performance.now() };
  bulleRevelee = false;
  visite.dejaFait = etape.objectif?.(etat) ?? false;
  visite.salut = null;
  detacherClic();
  afficherBulle();
  const cible = trouverCible(etape);
  if (cible instanceof HTMLElement) {
    cible.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function suivante(): void {
  if (visite !== null) {
    aller(visite.index + 1);
  }
}

/** Passe à l'étape suivante seulement si l'on est encore sur `index` : clic et relecture de l'écran peuvent arriver ensemble. */
function avancerDepuis(index: number): void {
  if (visite !== null && visite.index === index) {
    aller(index + 1);
  }
}

/** Couleurs des éclats : les bleus de l'application. */
const COULEURS_ECLATS = ["#2f5bd3", "#4f7fe0", "#8fb4ee", "#1f3f9e", "#c9dbff"];

/** Petite gerbe d'éclats colorés en (x, y), pour saluer une étape réussie. */
function eclater(x: number, y: number, nombre: number): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const gerbe = creer("div", "parcours-eclats");
  gerbe.setAttribute("aria-hidden", "true");
  gerbe.style.left = `${String(Math.round(x))}px`;
  gerbe.style.top = `${String(Math.round(y))}px`;
  for (let rang = 0; rang < nombre; rang += 1) {
    const eclat = creer("span");
    // Angles réguliers et distances alternées : une gerbe régulière, sans hasard.
    eclat.style.setProperty("--angle", `${String((360 / nombre) * rang)}deg`);
    eclat.style.setProperty("--distance", `${String(46 + (rang % 3) * 22)}px`);
    eclat.style.setProperty("--couleur", COULEURS_ECLATS[rang % COULEURS_ECLATS.length] ?? "#2f5bd3");
    eclat.style.setProperty("--delai", `${String((rang % 4) * 30)}ms`);
    gerbe.append(eclat);
  }
  document.body.append(gerbe);
  window.setTimeout(() => {
    gerbe.remove();
  }, 1400);
}

/** Feuille de route des grandes étapes : faites, en cours, à venir. */
function creerFeuilleDeRoute(parcours: Parcours, index: number, derniere: boolean): HTMLElement | null {
  if (parcours.chapitres === undefined) {
    return null;
  }
  const courant = derniere ? parcours.chapitres.length : (chapitreDe(parcours.etapes, index) ?? parcours.chapitres.length);
  const liste = creer("ol", "parcours-feuille");
  liste.setAttribute("aria-label", "Grandes étapes");
  parcours.chapitres.forEach((nom, rang) => {
    const etat = rang < courant ? "fait" : rang === courant && index > 0 ? "actif" : "avenir";
    const element = creer("li", `parcours-chapitre parcours-chapitre-${etat}`);
    element.style.setProperty("--rang", String(rang));
    element.append(creer("span", "parcours-pastille", etat === "fait" ? "✓" : String(rang + 1)), creer("span", "parcours-libelle", nom));
    liste.append(element);
  });
  return liste;
}

function afficherBulle(): void {
  const bulle = elements.bulle;
  if (visite === null || bulle === null) {
    return;
  }
  const parcours = PARCOURS_DEFINIS[visite.identifiant];
  const etape = etapeCourante();
  if (etape === null) {
    return;
  }
  const fait = visite.dejaFait || visite.salut !== null;
  bulle.replaceChildren();
  bulle.classList.remove("parcours-entree");
  // Relance l'animation d'apparition à chaque étape.
  void bulle.getBoundingClientRect();
  bulle.classList.add("parcours-entree");
  bulle.classList.toggle("parcours-reussie", fait);

  const derniere = visite.index === parcours.etapes.length - 1;
  const accueil = visite.index === 0;
  bulle.classList.toggle("parcours-accueil", accueil || derniere);

  const entete = creer("div", "parcours-entete");
  entete.append(
    creer("span", "parcours-nom", parcours.titre),
    creer("span", "parcours-compte", `${String(visite.index + 1)} / ${String(parcours.etapes.length)}`),
  );
  const progression = creer("div", "parcours-progression");
  const barre = creer("span");
  barre.style.width = `${String(((visite.index + 1) / parcours.etapes.length) * 100)}%`;
  progression.append(barre);

  const titre = creer("h2", "parcours-titre", etape.titre);
  titre.id = "parcours-titre";
  bulle.setAttribute("aria-labelledby", titre.id);
  const texte = creer("p", "parcours-texte", fait && etape.texteFait !== undefined ? etape.texteFait : etape.texte);
  if (fait) {
    texte.prepend(creer("span", "parcours-coche", "✓"));
  }
  const feuille = creerFeuilleDeRoute(parcours, visite.index, derniere);
  if (accueil || derniere) {
    const banniere = creer("div", "parcours-banniere");
    banniere.append(creer("span", "parcours-banniere-marque", "DNMAX"), titre);
    bulle.append(banniere);
  } else {
    bulle.append(entete, progression, titre);
  }
  bulle.append(texte);
  if (feuille !== null) {
    bulle.append(feuille);
  }
  const actions = creer("div", "parcours-actions");
  const passer = creer("button", "btn ghost parcours-passer", derniere ? "" : "Passer la visite");
  passer.type = "button";
  passer.hidden = derniere;
  passer.addEventListener("click", terminer);
  const precedente = creer("button", "btn ghost", "Précédent");
  precedente.type = "button";
  precedente.hidden = visite.index === 0;
  precedente.addEventListener("click", () => {
    reculer();
  });
  const continuer = creer("button", "btn primary", derniere ? "Terminer" : "Suivant");
  continuer.type = "button";
  continuer.addEventListener("click", () => {
    if (derniere) {
      terminer();
    } else if (etape.avanceAuClic === true && !fait) {
      cliquerPourLEnseignant(etape);
    } else {
      suivante();
    }
  });
  actions.append(passer, precedente, continuer);
  bulle.append(actions);
  // Le contenu apparaît en cascade.
  [...bulle.children].forEach((enfant, rang) => {
    if (enfant instanceof HTMLElement) {
      enfant.classList.add("parcours-cascade");
      enfant.style.setProperty("--rang", String(rang));
    }
  });
  if (derniere && parcours.chapitres !== undefined) {
    const centre = bulle.getBoundingClientRect();
    eclater(centre.left + centre.width / 2, centre.top + 40, 28);
  }
  if (!(etape.cibles?.length ?? 0)) {
    continuer.focus({ preventScroll: true });
  }
}

/**
 * « Suivant » sur une étape qui attend un clic : la visite fait le clic elle-même,
 * pour mener au bon écran ; l'écoute du clic fait ensuite avancer la visite.
 */
function cliquerPourLEnseignant(etape: Etape): void {
  const cible = trouverCible(etape);
  const visee = etape.pointe === undefined ? null : (cible?.querySelector<HTMLElement>(etape.pointe) ?? null);
  const aCliquer = visee ?? (cible instanceof HTMLElement ? cible : null);
  if (aCliquer === null) {
    suivante();
    return;
  }
  // L'écoute posée sur la zone n'entend pas un clic fait sur un élément intérieur : on avance nous-mêmes.
  const index = visite?.index ?? -1;
  aCliquer.click();
  window.setTimeout(() => {
    avancerDepuis(index);
  }, 150);
}

/** Recule à l'étape précédente qui ne serait pas aussitôt sautée. */
function reculer(): void {
  if (visite === null) {
    return;
  }
  const etapes = PARCOURS_DEFINIS[visite.identifiant].etapes;
  const etat = avancement();
  let index = visite.index - 1;
  while (index > 0 && estASauter(etapes[index], etat)) {
    index -= 1;
  }
  aller(Math.max(0, index));
}

function placerVoiles(trou: DOMRect | null, masques: boolean): void {
  const [haut, bas, gauche, droite] = elements.voiles;
  if (haut === undefined || bas === undefined || gauche === undefined || droite === undefined) {
    return;
  }
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  for (const voile of elements.voiles) {
    voile.hidden = masques;
  }
  if (trou === null) {
    Object.assign(haut.style, { left: "0px", top: "0px", width: `${String(largeur)}px`, height: `${String(hauteur)}px` });
    for (const voile of [bas, gauche, droite]) {
      voile.hidden = true;
    }
    return;
  }
  const x = Math.max(0, trou.left);
  const y = Math.max(0, trou.top);
  const fin = Math.min(largeur, trou.right);
  const pied = Math.min(hauteur, trou.bottom);
  Object.assign(haut.style, { left: "0px", top: "0px", width: `${String(largeur)}px`, height: `${String(y)}px` });
  Object.assign(bas.style, {
    left: "0px",
    top: `${String(pied)}px`,
    width: `${String(largeur)}px`,
    height: `${String(Math.max(0, hauteur - pied))}px`,
  });
  Object.assign(gauche.style, {
    left: "0px",
    top: `${String(y)}px`,
    width: `${String(x)}px`,
    height: `${String(Math.max(0, pied - y))}px`,
  });
  Object.assign(droite.style, {
    left: `${String(fin)}px`,
    top: `${String(y)}px`,
    width: `${String(Math.max(0, largeur - fin))}px`,
    height: `${String(Math.max(0, pied - y))}px`,
  });
}

/** Place la bulle à côté de la zone éclairée, sinon dans un coin, sinon au centre. */
/**
 * Zone à éclairer dans une boîte de l'application : la bulle se pose à côté de la
 * boîte (à droite, sinon à gauche) pour ne pas en cacher le contenu ; sans place, dans un coin.
 */
function placerBulleACoteDe(boite: Element, visee: DOMRect): void {
  const bulle = elements.bulle;
  if (bulle === null) {
    return;
  }
  const cadreBoite = boite.getBoundingClientRect();
  const dimensions = bulle.getBoundingClientRect();
  const marge = 16;
  const haut = Math.min(
    Math.max(marge, visee.top + visee.height / 2 - dimensions.height / 2),
    window.innerHeight - dimensions.height - marge,
  );
  let gauche: number | null = null;
  if (cadreBoite.right + marge + dimensions.width <= window.innerWidth - marge) {
    gauche = cadreBoite.right + marge;
    bulle.dataset.position = "droite";
  } else if (cadreBoite.left - marge - dimensions.width >= marge) {
    gauche = cadreBoite.left - marge - dimensions.width;
    bulle.dataset.position = "gauche";
  }
  let hautFinal = haut;
  if (gauche === null) {
    // Pas de place sur les côtés : sous la boîte, sinon au-dessus, sinon dans un coin.
    gauche = Math.min(Math.max(marge, visee.left + visee.width / 2 - dimensions.width / 2), window.innerWidth - dimensions.width - marge);
    if (cadreBoite.bottom + marge + dimensions.height <= window.innerHeight - marge) {
      hautFinal = cadreBoite.bottom + marge;
      bulle.dataset.position = "sous-boite";
    } else if (cadreBoite.top - marge - dimensions.height >= marge) {
      hautFinal = cadreBoite.top - marge - dimensions.height;
      bulle.dataset.position = "sur-boite";
    } else {
      placerBulle(null, true);
      return;
    }
  }
  bulle.style.left = `${String(Math.round(gauche))}px`;
  bulle.style.top = `${String(Math.round(hautFinal))}px`;
}

function placerBulle(trou: DOMRect | null, enCoin: boolean): void {
  const bulle = elements.bulle;
  if (bulle === null) {
    return;
  }
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  const piedPage = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hauteur-pied")) || 0;
  const dimensions = bulle.getBoundingClientRect();
  const marge = 12;
  let gauche: number;
  let haut: number;
  bulle.dataset.position = "centre";
  if (trou === null || enCoin) {
    if (enCoin) {
      gauche = largeur - dimensions.width - marge;
      haut = hauteur - piedPage - dimensions.height - marge;
      bulle.dataset.position = "coin";
    } else {
      gauche = (largeur - dimensions.width) / 2;
      haut = (hauteur - dimensions.height) / 2;
    }
  } else {
    const espaceDessous = hauteur - piedPage - trou.bottom;
    gauche = Math.min(Math.max(marge, trou.left + trou.width / 2 - dimensions.width / 2), largeur - dimensions.width - marge);
    if (espaceDessous >= dimensions.height + marge * 2) {
      haut = trou.bottom + marge;
      bulle.dataset.position = "dessous";
    } else if (trou.top >= dimensions.height + marge * 2) {
      haut = trou.top - dimensions.height - marge;
      bulle.dataset.position = "dessus";
    } else {
      haut = hauteur - piedPage - dimensions.height - marge;
      gauche = largeur - dimensions.width - marge;
      bulle.dataset.position = "coin";
    }
  }
  const gaucheFinale = Math.round(Math.max(marge, gauche));
  if (trou !== null) {
    const pointe = trou.left + trou.width / 2 - gaucheFinale;
    bulle.style.setProperty("--fleche-x", `${String(Math.round(Math.min(Math.max(24, pointe), dimensions.width - 24)))}px`);
  }
  bulle.style.left = `${String(gaucheFinale)}px`;
  bulle.style.top = `${String(Math.round(Math.max(marge, haut)))}px`;
}

/** Fait glisser le curseur animé de la bulle vers la zone éclairée. */
function placerCurseur(trou: DOMRect | null, etape: Etape): void {
  const curseur = elements.curseur;
  const bulle = elements.bulle;
  if (curseur === null || bulle === null) {
    return;
  }
  const geste = visite !== null && (visite.dejaFait || visite.salut !== null) ? undefined : etape.geste;
  curseur.hidden = trou === null || geste === undefined;
  if (trou === null || geste === undefined) {
    return;
  }
  const depart = bulle.getBoundingClientRect();
  const visee = (etape.pointe === undefined ? null : cibleCourante?.querySelector(etape.pointe)) ?? null;
  const zone = visee !== null && estVisible(visee) ? visee.getBoundingClientRect() : trou;
  const arriveeX = geste === "cliquer" ? zone.left + zone.width / 2 : zone.left + Math.min(48, zone.width / 2);
  const arriveeY = geste === "cliquer" ? zone.top + zone.height / 2 : zone.top + Math.min(36, zone.height / 2);
  curseur.dataset.geste = geste;
  curseur.style.left = `${String(Math.round(arriveeX))}px`;
  curseur.style.top = `${String(Math.round(arriveeY))}px`;
  curseur.style.setProperty("--depart-x", `${String(Math.round(depart.left + depart.width / 2 - arriveeX))}px`);
  curseur.style.setProperty("--depart-y", `${String(Math.round(depart.top + depart.height / 2 - arriveeY))}px`);
}

/** Redessine voiles, anneau, curseur et bulle à chaque image, pour suivre défilements et changements d'écran. */
function redessiner(): void {
  cadre = null;
  if (visite === null || elements.anneau === null) {
    return;
  }
  const etape = etapeCourante();
  if (etape === null) {
    return;
  }
  const cible = trouverCible(etape);
  cibleCourante = cible;
  const boiteOuverte = document.querySelector(SELECTEUR_BOITES);
  const cibleDansBoite = cible !== null && boiteOuverte !== null && boiteOuverte.contains(cible);
  const brut = cible?.getBoundingClientRect() ?? null;
  const visee = brut === null ? null : new DOMRect(brut.left - MARGE, brut.top - MARGE, brut.width + MARGE * 2, brut.height + MARGE * 2);
  // La zone glisse depuis sa place précédente ; sans cible, elle se resserre au centre de l'écran.
  const { zone, enMouvement } = avancerGlissement(visee ?? centreEcran(), performance.now());
  zoneAffichee = zone;
  const trou = visee === null && !enMouvement ? null : zone;
  // Une boîte de l'application grise déjà l'écran : le voile s'efface, et la bulle
  // se range dans un coin sauf si la zone à éclairer est dans la boîte.
  const masquer = boiteOuverte !== null && !cibleDansBoite;
  placerVoiles(trou, masquer || boiteOuverte !== null);
  const anneau = elements.anneau;
  const avecAnneau = trou !== null && !masquer;
  anneau.hidden = !avecAnneau;
  anneau.classList.toggle("parcours-anneau-glisse", enMouvement);
  // Dans une boîte de l'application, l'anneau passe au-dessus d'elle pour rester visible.
  anneau.classList.toggle("parcours-anneau-dessus", cibleDansBoite);
  if (avecAnneau) {
    Object.assign(anneau.style, {
      left: `${String(trou.left)}px`,
      top: `${String(trou.top)}px`,
      width: `${String(trou.width)}px`,
      height: `${String(trou.height)}px`,
    });
    anneau.dataset.geste = etape.geste ?? "regarder";
    anneau.classList.toggle("parcours-anneau-reussi", visite.salut !== null || visite.dejaFait);
  }
  const tropGrande = visee !== null && (visee.width * visee.height) / (window.innerWidth * window.innerHeight) > PART_ECRAN_MAX;
  // La bulle ne voyage pas avec la zone : elle reste cachée pendant le trajet,
  // puis apparaît directement à sa place, près de la zone arrivée.
  const bulle = elements.bulle;
  if (bulle !== null) {
    bulle.classList.toggle("parcours-en-attente", enMouvement);
    // Près d'une boîte, la bulle se fait plus courte (sans feuille de route) pour trouver sa place.
    bulle.classList.toggle("parcours-compacte", cibleDansBoite);
    if (!enMouvement) {
      if (cibleDansBoite && visee !== null) {
        placerBulleACoteDe(boiteOuverte.querySelector(".echange-boite") ?? boiteOuverte, visee);
      } else {
        placerBulle(visee === null || masquer ? null : visee, masquer || tropGrande);
      }
      if (!bulleRevelee) {
        bulleRevelee = true;
        bulle.classList.remove("parcours-entree");
        void bulle.getBoundingClientRect();
        bulle.classList.add("parcours-entree");
      }
    }
  }
  // Le curseur attend que la zone soit arrivée pour montrer le geste.
  placerCurseur(enMouvement || masquer ? null : visee, etape);
  if (etape.avanceAuClic === true && cible !== cibleSuivie) {
    detacherClic();
    if (cible !== null) {
      const index = visite.index;
      ecouteClic = () => {
        // Laisse l'application traiter le clic avant de passer à la suite.
        window.setTimeout(() => {
          avancerDepuis(index);
        }, 150);
      };
      cible.addEventListener("click", ecouteClic, true);
      cibleSuivie = cible;
    }
  }
  cadre = window.requestAnimationFrame(redessiner);
}

/** Relit l'avancement : salue un objectif atteint, avance quand l'écran visé est affiché. */
function suivre(): void {
  if (visite === null) {
    return;
  }
  const etape = etapeCourante();
  if (etape === null) {
    return;
  }
  if (visite.salut === null && !visite.dejaFait && etape.objectif?.(avancement()) === true) {
    const index = visite.index;
    visite.salut = window.setTimeout(() => {
      avancerDepuis(index);
    }, DUREE_SALUT);
    afficherBulle();
    const zone = cibleCourante?.getBoundingClientRect() ?? elements.bulle?.getBoundingClientRect();
    if (zone !== undefined) {
      eclater(zone.left + zone.width / 2, zone.top + Math.min(zone.height / 2, 60), 16);
    }
    return;
  }
  if (visite.salut === null && etape.atteinte?.() === true) {
    avancerDepuis(visite.index);
  }
}

/** Lance une visite depuis son début (ou la relance si elle est en cours). */
export function lancerParcours(identifiant: IdentifiantParcours, depart = 0): void {
  if (acces === null) {
    return;
  }
  demonter();
  visite = { identifiant, index: depart, dejaFait: false, salut: null };
  construire();
  aller(depart);
  suivi = window.setInterval(suivre, INTERVALLE_SUIVI);
  cadre = window.requestAnimationFrame(redessiner);
}

/**
 * Installe les visites guidées : boutons `[data-parcours]` de toute l'interface,
 * et lancement de la prise en main à la première ouverture.
 */
export function installerParcours(accesDonnees: Acces): void {
  acces = accesDonnees;
  // Le panneau « Visites guidées » de Paramètres n'a de sens qu'une fois les visites installées.
  const panneauVisites = document.getElementById(IDENTIFIANT_PANNEAU_VISITES);
  if (panneauVisites !== null) {
    panneauVisites.hidden = false;
  }
  document.addEventListener("click", (evenement) => {
    const bouton = evenement.target instanceof Element ? evenement.target.closest<HTMLElement>("[data-parcours]") : null;
    const identifiant = bouton?.dataset.parcours;
    if (estIdentifiantParcours(identifiant)) {
      evenement.preventDefault();
      lancerParcours(identifiant);
    }
  });
  // Après un rechargement (import validé pendant la visite), la visite reprend où elle en était.
  const reprise = lireRepriseSession();
  if (reprise !== null) {
    lancerParcours(reprise.identifiant, reprise.index);
  } else if (doitLancerAuDemarrage(accesDonnees.lireEntrees())) {
    lancerParcours("prise-en-main");
  }
}
