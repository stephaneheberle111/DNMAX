// SPDX-License-Identifier: CECILL-2.1
import "./ecran-parcours.css";
import {
  CLE_PARCOURS,
  CLE_REPRISE,
  lireReprise,
  doitLancerAuDemarrage,
  doitLancerBouquet,
  estIdentifiantParcours,
  lireAvancement,
  noterParcoursVu,
  rejouerApparition,
  salvesBouquetFinal,
  type Avancement,
  type MotifAffichage,
  type IdentifiantParcours,
} from "./domaine/parcours";
import { choisirCoin, type Rectangle } from "./domaine/coin-bulle";
import type { AccesDonnees } from "./ecran-echange";
import { chapitreDe, PARCOURS_DEFINIS, type Etape, type Geste, type Parcours, type Selon } from "./parcours-etapes";

/** Lit une valeur d'étape, fixe ou relue sur l'écran. */
function lire<T>(valeur: Selon<T>): T {
  return typeof valeur === "function" ? (valeur as () => T)() : valeur;
}

function pointeDe(etape: Etape): string | undefined {
  return etape.pointe === undefined ? undefined : lire(etape.pointe);
}

function gesteDe(etape: Etape): Geste | undefined {
  return etape.geste === undefined ? undefined : lire(etape.geste);
}

/** Durée de la halte du curseur sur chaque élément, pour le geste « parcourir ». */
const DUREE_HALTE_PARCOURS = 1300;
/** Durée de chaque geste d'un enchaînement : une boucle de l'animation « glisser » (2,6 s dans la feuille de style). */
const DUREE_MOUVEMENT = 2600;

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
/** Bouton de fermeture d'une boîte de l'application. */
const SELECTEUR_FERMER_BOITE = '[role="dialog"][aria-modal="true"] [aria-label="Fermer"]';

type Acces = Pick<AccesDonnees, "lireEntrees" | "ecrireEntree">;

interface Visite {
  identifiant: IdentifiantParcours;
  index: number;
  /** Objectif de l'étape déjà atteint en y entrant (la bulle le dit au lieu de le demander). */
  dejaFait: boolean;
  salut: number | null;
  /** Le bouquet final est déjà parti pendant cette visite : il ne part qu'une fois. */
  bouquetLance: boolean;
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
/** Éléments vers lesquels la page a déjà défilé pour l'étape en cours : on ne défile qu'une fois vers chacun. */
const defilesEtape = new Set<Element>();
/** Une boîte de l'application était ouverte à l'image précédente : la bulle change de texte quand cela change. */
let boiteVue = false;

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

/**
 * Vrai si le centre de l'élément est à l'écran et dans le cadre de chacun de
 * ses ancêtres qui coupent leur contenu (une carte zoomée garde hors de son
 * cadre des éléments qui ont pourtant une taille).
 */
function centreApparent(element: Element): boolean {
  const rectangle = element.getBoundingClientRect();
  const x = rectangle.left + rectangle.width / 2;
  const y = rectangle.top + rectangle.height / 2;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    const limite = parent.getBoundingClientRect();
    if (x < limite.left || x > limite.right || y < limite.top || y > limite.bottom) return false;
  }
  return true;
}

/** Premier élément visible désigné par le sélecteur, hors de la bulle ; avec `apparent`, seulement s'il se voit vraiment. */
function premierVisible(selecteur: string, apparent = false): Element | null {
  for (const candidat of document.querySelectorAll(selecteur)) {
    if (!estVisible(candidat) || candidat.closest(".parcours-bulle")) continue;
    if (!apparent || centreApparent(candidat)) return candidat;
  }
  return null;
}

/** Cadre visible d'un élément : coupé par ses ancêtres qui font défiler (tableau large) et par la fenêtre. */
function cadreVisible(element: Element): DOMRect {
  const cadre = element.getBoundingClientRect();
  let gauche = Math.max(cadre.left, 0);
  let droite = Math.min(cadre.right, window.innerWidth);
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
    const debord = getComputedStyle(parent).overflowX;
    if (debord === "auto" || debord === "scroll" || debord === "hidden") {
      const limite = parent.getBoundingClientRect();
      gauche = Math.max(gauche, limite.left);
      droite = Math.min(droite, limite.right);
    }
  }
  return new DOMRect(gauche, cadre.top, Math.max(0, droite - gauche), cadre.height);
}

/** Cadre de la zone éclairée : la cible, ou la réunion des éléments de `zone` quand l'étape en donne. */
function cadreDeLaZone(etape: Etape, cible: Element): DOMRect {
  const elements = (etape.zone ?? []).map((selecteur) => premierVisible(selecteur)).filter((element) => element !== null);
  if (elements.length === 0) return cible.getBoundingClientRect();
  const cadres = elements.map((element) => cadreVisible(element));
  const gauche = Math.min(...cadres.map((cadre) => cadre.left));
  const haut = Math.min(...cadres.map((cadre) => cadre.top));
  const droite = Math.max(...cadres.map((cadre) => cadre.right));
  const bas = Math.max(...cadres.map((cadre) => cadre.bottom));
  return new DOMRect(gauche, haut, droite - gauche, bas - haut);
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
  retenirClics();
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
  elements.curseur = creer("div", "parcours-curseur parcours-curseur-cache");
  elements.curseur.setAttribute("aria-hidden", "true");
  curseurPose = false;
  elements.bulle = creer("section", "parcours-bulle");
  elements.bulle.setAttribute("role", "dialog");
  elements.bulle.setAttribute("aria-modal", "false");
  elements.bulle.setAttribute("aria-live", "polite");
  document.body.append(...elements.voiles, elements.anneau, elements.curseur, elements.bulle);
  document.addEventListener("keydown", surTouche, true);
}

function demonter(): void {
  // Un salut en attente ferait avancer la visite suivante, relancée entre-temps.
  if (visite?.salut !== null && visite?.salut !== undefined) {
    window.clearTimeout(visite.salut);
    visite.salut = null;
  }
  for (const element of [...elements.voiles, elements.anneau, elements.curseur, elements.bulle]) {
    element?.remove();
  }
  elements.voiles = [];
  zoneAffichee = null;
  boiteVue = false;
  defilesEtape.clear();
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

/**
 * Ferme la visite ; elle est notée comme vue, qu'elle soit terminée ou passée.
 * Fermée depuis sa dernière page, elle ramène à « Mes évaluations », le point
 * de départ du travail quotidien.
 */
export function terminer(): void {
  const finie = visite !== null && visite.index >= PARCOURS_DEFINIS[visite.identifiant].etapes.length - 1;
  if (visite !== null) {
    noterVu(visite.identifiant);
  }
  demonter();
  visite = null;
  noterReprise();
  if (finie) {
    document.getElementById("t-saved")?.click();
  }
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
  // Les haltes du curseur se comptent une fois la zone arrivée.
  debutEtape = performance.now() + DUREE_GLISSEMENT;
  bulleRevelee = false;
  visite.dejaFait = etape.objectif?.(etat) ?? false;
  visite.salut = null;
  detacherClic();
  afficherBulle("etape");
  defilesEtape.clear();
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

/** Couleurs des éclats : les nuances de pétrole de l'identité, relevées d'une pointe de cuivre. */
const COULEURS_ECLATS = ["#10555f", "#2a7f88", "#62a9ae", "#a8d2d4", "#8a4a0e"];

/** Au-delà de ce délai, un clic n'est plus considéré comme la cause d'une réussite. */
const DELAI_CLIC_RECENT_MS = 4000;

/** Dernier clic de l'enseignant pendant la visite : les éclats partent de là. */
let dernierClic: { x: number; y: number; instant: number } | null = null;
let ecouteClicsPosee = false;

function retenirClics(): void {
  if (ecouteClicsPosee) {
    return;
  }
  ecouteClicsPosee = true;
  // En capture : un écran qui arrête la propagation du clic n'empêche pas de le retenir.
  document.addEventListener(
    "pointerdown",
    (evenement) => {
      dernierClic = { x: evenement.clientX, y: evenement.clientY, instant: performance.now() };
    },
    true,
  );
}

/** Point de départ des éclats : le clic qui vient de réussir l'étape, sinon le point donné. */
function departEclats(x: number, y: number): [number, number] {
  if (dernierClic !== null && performance.now() - dernierClic.instant < DELAI_CLIC_RECENT_MS) {
    return [dernierClic.x, dernierClic.y];
  }
  return [x, y];
}

/** Petite gerbe d'éclats colorés en (x, y), pour saluer une étape réussie. */
function eclater(x: number, y: number, nombre: number, ampleur = 1): void {
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
    eclat.style.setProperty("--distance", `${String(Math.round((46 + (rang % 3) * 22) * ampleur))}px`);
    eclat.style.setProperty("--couleur", COULEURS_ECLATS[rang % COULEURS_ECLATS.length] ?? "#10555f");
    eclat.style.setProperty("--delai", `${String((rang % 4) * 30)}ms`);
    gerbe.append(eclat);
  }
  document.body.append(gerbe);
  window.setTimeout(() => {
    gerbe.remove();
  }, 1400);
}

/** Bouquet final de confettis sur toute la fenêtre, à l'arrivée sur la dernière page de la visite. */
function bouquetFinal(): void {
  for (const salve of salvesBouquetFinal(window.innerWidth, window.innerHeight)) {
    window.setTimeout(() => {
      eclater(salve.x, salve.y, salve.nombre, salve.ampleur);
    }, salve.delaiMs);
  }
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

function afficherBulle(motif: MotifAffichage): void {
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
  const rejouer = rejouerApparition(motif);
  bulle.replaceChildren();
  if (rejouer) {
    // Relance l'animation d'apparition à chaque étape.
    bulle.classList.remove("parcours-entree");
    void bulle.getBoundingClientRect();
    bulle.classList.add("parcours-entree");
  }
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
  const texteEtape = fait && etape.texteFait !== undefined ? etape.texteFait : etape.texte;
  const texte = creer("p", "parcours-texte", boiteVue && etape.siBoite !== undefined ? etape.siBoite.texte : texteEtape);
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
    } else if (etape.ouvrir !== undefined && etape.atteinte?.() !== true) {
      // L'écran ouvert, la relecture de l'avancement voit l'étape atteinte et passe à la suite.
      etape.ouvrir();
    } else {
      if (etape.fermeLaBoite === true) {
        document.querySelector<HTMLElement>(SELECTEUR_FERMER_BOITE)?.click();
      }
      suivante();
    }
  });
  actions.append(passer, precedente, continuer);
  bulle.append(actions);
  // Le contenu apparaît en cascade ; un simple changement de texte s'affiche d'un coup.
  if (rejouer) {
    [...bulle.children].forEach((enfant, rang) => {
      if (enfant instanceof HTMLElement) {
        enfant.classList.add("parcours-cascade");
        enfant.style.setProperty("--rang", String(rang));
      }
    });
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
  const pointe = pointeDe(etape);
  const visee = pointe === undefined ? null : (cible?.querySelector<HTMLElement>(pointe) ?? null);
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

/**
 * Taille de la bulle sans ses transformations : le rebond d'apparition la réduit un
 * instant, et une place calculée sur cette taille glissait de quelques pixels à
 * chaque image, jusqu'à la fin du rebond.
 */
function tailleBulle(bulle: HTMLElement): { width: number; height: number } {
  return { width: bulle.offsetWidth, height: bulle.offsetHeight };
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
  const dimensions = tailleBulle(bulle);
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

/** `evite` : l'élément que la bulle ne doit pas cacher quand elle se range dans un coin. */
function placerBulle(trou: DOMRect | null, enCoin: boolean, evite: readonly Rectangle[] = []): void {
  const bulle = elements.bulle;
  if (bulle === null) {
    return;
  }
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  const piedPage = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hauteur-pied")) || 0;
  const dimensions = tailleBulle(bulle);
  const marge = 12;
  let gauche: number;
  let haut: number;
  bulle.dataset.position = "centre";
  if (trou === null || enCoin) {
    if (enCoin) {
      ({ gauche, haut } = choisirCoin(dimensions, { width: largeur, height: hauteur, piedPage }, evite.length > 0 ? evite : trou === null ? [] : [trou], marge));
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
      ({ gauche, haut } = choisirCoin(dimensions, { width: largeur, height: hauteur, piedPage }, evite.length > 0 ? evite : [trou], marge));
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

/** Éléments que la bulle rangée dans un coin ne doit pas cacher ; à défaut, la zone éclairée. */
function zonesADegager(etape: Etape, visee: DOMRect | null): DOMRect[] {
  // L'annonce « Ouvrir le document » d'un export, quand elle est affichée, ne doit pas être cachée par la bulle.
  const selecteurs = [pointeDe(etape), etape.aDegager, ".annonce-export"].filter((selecteur) => selecteur !== undefined);
  const zones = selecteurs
    .flatMap((selecteur) => [...document.querySelectorAll(selecteur)])
    .filter((element) => estVisible(element))
    .map((element) => element.getBoundingClientRect());
  return zones.length > 0 || visee === null ? zones : [visee];
}

/**
 * Fait défiler la page jusqu'à la zone à éclairer quand elle est hors de
 * l'écran, une seule fois par zone : l'enseignant n'a pas à chercher où cliquer
 * avec l'ascenseur, et peut ensuite faire défiler librement.
 */
/** Bande de l'écran où l'on voit le contenu, entre la barre d'onglets et le bas de page. */
function bandeVisible(): { haut: number; bas: number } {
  const haut = document.querySelector("header.bar")?.getBoundingClientRect().bottom ?? 0;
  const pied = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hauteur-pied")) || 0;
  return { haut, bas: window.innerHeight - pied };
}

function dansLaBande(element: Element): boolean {
  const cadre = element.getBoundingClientRect();
  const { haut, bas } = bandeVisible();
  return cadre.top >= haut && cadre.bottom <= bas;
}

function defilerVers(cible: Element | null): void {
  if (cible === null || defilesEtape.has(cible) || !(cible instanceof HTMLElement)) {
    return;
  }
  defilesEtape.add(cible);
  const cadreCible = cible.getBoundingClientRect();
  const { haut, bas } = bandeVisible();
  const horsEcran = cadreCible.top < haut || cadreCible.bottom > bas;
  if (horsEcran) {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Une zone plus haute que l'écran se cale par le haut, pour qu'on en voie le début.
    cible.scrollIntoView({ block: cadreCible.height > bas - haut ? "start" : "center", behavior: reduit ? "auto" : "smooth" });
  }
}

/** Instant où l'étape en cours a commencé. */
let debutEtape = 0;

/** Geste d'enchaînement montré à l'image précédente : son changement relance l'animation du curseur. */
let mouvementMontre = "";

/**
 * L'étape telle que le curseur la montre à cet instant : elle-même, ou, quand
 * elle a un enchaînement, le geste de l'enchaînement en cours (tour à tour, en boucle).
 */
function etapeDuMoment(etape: Etape): Etape {
  const enchainement = etape.enchainement === undefined ? [] : lire(etape.enchainement);
  if (enchainement.length === 0) return etape;
  const rang = Math.floor(Math.max(0, performance.now() - debutEtape) / DUREE_MOUVEMENT) % enchainement.length;
  const mouvement = enchainement[rang] ?? enchainement[0];
  return mouvement === undefined ? etape : { ...etape, geste: mouvement.geste, pointe: mouvement.pointe, depuis: mouvement.depuis };
}

/** Vrai une fois le curseur posé quelque part : il glisse ensuite de là, au lieu de surgir de la bulle. */
let curseurPose = false;

/** Pose le curseur ; il glisse depuis sa position précédente, sauf la première fois, où il apparaît sur place. */
function poserCurseur(curseur: HTMLElement, x: number, y: number): void {
  const premiere = !curseurPose;
  if (premiere) {
    curseur.style.transition = "none";
  }
  curseur.style.left = `${String(Math.round(x))}px`;
  curseur.style.top = `${String(Math.round(y))}px`;
  if (premiere) {
    // Lire la taille applique la position sans transition, avant de rendre la main à la feuille de style.
    curseur.getBoundingClientRect();
    curseur.style.transition = "";
    curseurPose = true;
  }
}

/**
 * Mène le curseur animé vers la zone éclairée, en suivant le mouvement d'une
 * main : il part de là où il était (étape précédente, élément précédent) et
 * glisse jusqu'à l'élément visé, où il clique ou écrit. Seul le geste
 * « glisser » part d'un autre point, l'élément à emporter.
 */
function placerCurseur(trou: DOMRect | null, etapeEntiere: Etape): void {
  const curseur = elements.curseur;
  const bulle = elements.bulle;
  if (curseur === null || bulle === null) {
    return;
  }
  const etape = etapeDuMoment(etapeEntiere);
  const mouvement = etape === etapeEntiere ? "" : `${String(gesteDe(etape))}|${String(etape.depuis)}|${String(pointeDe(etape))}`;
  if (mouvement !== mouvementMontre) {
    mouvementMontre = mouvement;
    // Chaque geste de l'enchaînement repart du début de l'animation, depuis son propre point de départ.
    curseur.style.animation = "none";
    curseur.getBoundingClientRect();
    curseur.style.animation = "";
  }
  const geste = visite !== null && (visite.dejaFait || visite.salut !== null) ? undefined : gesteDe(etape);
  // Masqué sans être retiré de l'affichage : il garde sa position, d'où il repartira.
  const masque = trou === null || geste === undefined;
  curseur.classList.toggle("parcours-curseur-cache", masque);
  if (trou === null || geste === undefined) {
    return;
  }
  const pointe = pointeDe(etape);
  // Haltes données dans l'ordre : le premier élément de chacune qui se voit vraiment (une carte zoomée garde hors de
  // son cadre des éléments qui ont pourtant une taille).
  const haltes = etape.haltes === undefined ? undefined : lire(etape.haltes);
  const candidats =
    haltes !== undefined
      ? haltes.map((selecteur) => premierVisible(selecteur, true)).filter((element) => element !== null)
      : pointe === undefined
        ? []
        : [...(cibleCourante?.querySelectorAll(pointe) ?? [])].filter((element) => estVisible(element));
  if (geste === "parcourir" && candidats.length > 0) {
    // Le curseur se pose tour à tour sur chaque élément visible à l'écran (la transition CSS le fait glisser
    // de l'un à l'autre) ; il ne part pas hors de l'écran, l'enseignant fait défiler à son rythme.
    const visibles = candidats.filter((element) => dansLaBande(element));
    const etapes = visibles.length > 0 ? visibles : candidats;
    // Compté depuis le début de l'étape : le curseur commence par la première halte (la case avant le bouton).
    const rang = Math.floor(Math.max(0, performance.now() - debutEtape) / DUREE_HALTE_PARCOURS) % etapes.length;
    const halte = (etapes[rang] ?? etapes[0])?.getBoundingClientRect();
    if (halte !== undefined) {
      curseur.dataset.geste = geste;
      poserCurseur(curseur, halte.left + Math.min(40, halte.width / 2), halte.top + Math.min(24, halte.height / 2));
      return;
    }
  }
  const source = geste === "glisser" && etape.depuis !== undefined ? lire(etape.depuis) : undefined;
  const elementSource = source === undefined ? null : document.querySelector(source);
  const depart = elementSource !== null && estVisible(elementSource) ? elementSource.getBoundingClientRect() : bulle.getBoundingClientRect();
  const visee = candidats[0] ?? null;
  // L'élément à cliquer ou à remplir est hors de l'écran (bas d'une longue étape) : la page défile jusqu'à lui.
  defilerVers(visee);
  const zone = visee !== null ? visee.getBoundingClientRect() : trou;
  const auCentre = geste === "cliquer" || geste === "glisser";
  const arriveeX = auCentre ? zone.left + zone.width / 2 : zone.left + Math.min(48, zone.width / 2);
  const arriveeY = auCentre ? zone.top + zone.height / 2 : zone.top + Math.min(36, zone.height / 2);
  curseur.dataset.geste = geste;
  poserCurseur(curseur, arriveeX, arriveeY);
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
  const boiteOuverte = document.querySelector(SELECTEUR_BOITES);
  // Boîte ouverte pendant une étape qui la prévoit : la bulle dit quoi y faire, et la zone éclairée passe dans la boîte.
  const avecBoite = boiteOuverte !== null && etape.siBoite !== undefined;
  if (avecBoite !== boiteVue) {
    boiteVue = avecBoite;
    // Boîte refermée : l'étape qui n'attendait que cela passe aussitôt à la suite, sans
    // réafficher d'abord son premier texte à son ancienne place le temps de la relecture suivante.
    if (!avecBoite) {
      suivre();
      if (etapeCourante() !== etape) {
        cadre = window.requestAnimationFrame(redessiner);
        return;
      }
    }
    afficherBulle("boite");
  }
  const cible = avecBoite && etape.siBoite !== undefined ? trouverCible({ ...etape, cibles: etape.siBoite.cibles }) : trouverCible(etape);
  cibleCourante = cible;
  defilerVers(cible);
  const cibleDansBoite = cible !== null && boiteOuverte !== null && boiteOuverte.contains(cible);
  const brut = cible === null ? null : cadreDeLaZone(etape, cible);
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
    anneau.dataset.geste = gesteDe(etape) ?? "regarder";
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
        // Rangée dans un coin, la bulle ne doit pas cacher le bouton que l'étape fait cliquer.
        placerBulle(visee === null || masquer ? null : visee, masquer || tropGrande, masquer ? [] : zonesADegager(etape, visee));
      }
      if (!bulleRevelee) {
        bulleRevelee = true;
        bulle.classList.remove("parcours-entree");
        void bulle.getBoundingClientRect();
        bulle.classList.add("parcours-entree");
        // La dernière page apparaît : c'est elle que salue le bouquet, pas la fermeture de la visite.
        const nombreEtapes = PARCOURS_DEFINIS[visite.identifiant].etapes.length;
        if (doitLancerBouquet({ index: visite.index, nombreEtapes, dejaLance: visite.bouquetLance })) {
          visite.bouquetLance = true;
          bouquetFinal();
        }
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
        // Écoute à la capture : passe avant le traitement du clic par l'application.
        etape.avantClic?.();
        // Laisse l'application traiter le clic avant de passer à la suite.
        window.setTimeout(() => {
          etape.apresClic?.();
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
    }, etape.delaiSalut ?? DUREE_SALUT);
    afficherBulle("salut");
    const zone = cibleCourante?.getBoundingClientRect() ?? elements.bulle?.getBoundingClientRect();
    if (zone !== undefined) {
      eclater(...departEclats(zone.left + zone.width / 2, zone.top + Math.min(zone.height / 2, 60)), 16);
    }
    return;
  }
  if (visite.salut === null && etape.atteinte?.() === true) {
    if (etape.celebrer === true) {
      const bulle = elements.bulle?.getBoundingClientRect();
      eclater(...departEclats(bulle === undefined ? window.innerWidth / 2 : bulle.left + bulle.width / 2, bulle?.top ?? window.innerHeight / 2), 16);
    }
    avancerDepuis(visite.index);
  }
}

/** Lance une visite depuis son début (ou la relance si elle est en cours). */
export function lancerParcours(identifiant: IdentifiantParcours, depart = 0): void {
  if (acces === null) {
    return;
  }
  demonter();
  visite = { identifiant, index: depart, dejaFait: false, salut: null, bouquetLance: false };
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
