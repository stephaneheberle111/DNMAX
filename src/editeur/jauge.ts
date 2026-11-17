// SPDX-License-Identifier: CECILL-2.1
import { aimanterPourcentage, bornesNiveaux, niveauDuPourcentage } from "../domaine/saisie-resultats";
import { couleurNiveau } from "../domaine/teintes-niveaux";
import { creer } from "../ecran-echange";

/** Ce qu'il faut pour dessiner la jauge d'une ligne, pour un étudiant. */
export interface OptionsJauge {
  /** Noms des niveaux, du plus faible au plus fort. */
  readonly niveaux: readonly string[];
  /** Position saisie, de 0 à 100, ou `null` si rien n'est saisi. */
  readonly pourcentage: number | null;
  /** Grande jauge (fiche d'un étudiant), avec le nom de chaque niveau sous la barre. */
  readonly grande: boolean;
  /** Appelée à chaque saisie validée (relâchement, clavier, effacement). */
  readonly surChangement: (pourcentage: number | null) => void;
}

/** Une jauge posée à l'écran : son élément, et de quoi lui imposer une valeur sans prévenir `surChangement`. */
export interface Jauge {
  readonly element: HTMLElement;
  fixer(pourcentage: number | null): void;
}

const AIDE = "Glisser ou cliquer · flèches pour ajuster · Suppr ou double-clic pour effacer";

/** Nom du niveau atteint à `pourcentage`, ou chaîne vide. */
export function nomDuNiveau(pourcentage: number | null, niveaux: readonly string[]): string {
  return pourcentage === null ? "" : (niveaux[niveauDuPourcentage(pourcentage, niveaux.length)] ?? "");
}

/**
 * Position suivante au clavier : flèches (pas de 1, de 10 avec Maj), Début et
 * Fin, Suppr ou Retour arrière pour effacer. Une jauge vide part de 0. Rend
 * `undefined` pour une autre touche.
 */
export function positionAuClavier(touche: string, maj: boolean, actuelle: number | null, nombre: number): number | null | undefined {
  const bornes = bornesNiveaux(nombre);
  const pas = maj ? 10 : 1;
  switch (touche) {
    case "ArrowRight":
    case "ArrowUp":
      // Le premier niveau vaut 0 : un pas vers la droite saute au début du deuxième.
      return actuelle === null ? 0 : aimanterPourcentage(Math.min(100, actuelle === 0 ? (bornes[1] ?? 100) : actuelle + pas), nombre);
    case "ArrowLeft":
    case "ArrowDown":
      // Le dernier niveau vaut 100 : un pas vers la gauche revient dans l'avant-dernier.
      return actuelle === null
        ? 0
        : aimanterPourcentage(Math.max(0, actuelle === 100 ? (bornes[nombre - 1] ?? 0) - pas : actuelle - pas), nombre);
    case "Home":
      return 0;
    case "End":
      return 100;
    case "Delete":
    case "Backspace":
      return null;
    default:
      return undefined;
  }
}

/**
 * Jauge de saisie d'un niveau en pourcentage continu. Pendant le glisser, elle
 * suit le pointeur ; au relâchement, la position est aimantée (le premier
 * niveau retombe à 0, le dernier monte à 100) puis transmise.
 */
export function creerJauge(options: OptionsJauge): Jauge {
  const { niveaux, grande, surChangement } = options;
  const nombre = niveaux.length;
  const bornes = bornesNiveaux(nombre);
  const element = creer("div", grande ? "ntk big" : "ntk");
  element.setAttribute("role", "slider");
  element.tabIndex = 0;
  element.setAttribute("aria-valuemin", "0");
  element.setAttribute("aria-valuemax", "100");
  element.title = AIDE;
  const piste = creer("span", "nt");
  const remplissage = creer("i", "nf");
  piste.append(remplissage);
  for (const borne of bornes.slice(1, -1)) {
    const cran = creer("b", "maj");
    cran.style.left = `${borne.toFixed(3)}%`;
    piste.append(cran);
  }
  element.append(piste);
  if (grande) {
    const echelle = creer("span", "ns");
    niveaux.forEach((nom, rang) => {
      const etiquette = creer("span", "", nom);
      etiquette.style.left = `${(((bornes[rang] ?? 0) + (bornes[rang + 1] ?? 100)) / 2).toFixed(2)}%`;
      echelle.append(etiquette);
    });
    element.append(echelle);
  }
  const libelle = creer("span", "nl");
  element.append(libelle);

  let valeur = options.pourcentage;
  const montrer = (pourcentage: number | null): void => {
    element.classList.toggle("empty", pourcentage === null);
    remplissage.classList.toggle("zero", pourcentage === 0);
    remplissage.style.width = `${String(pourcentage ?? 0)}%`;
    remplissage.style.background = pourcentage === null ? "transparent" : couleurNiveau(niveauDuPourcentage(pourcentage, nombre), nombre);
    libelle.textContent = pourcentage === null ? "—" : nomDuNiveau(pourcentage, niveaux);
  };
  const fixer = (pourcentage: number | null): void => {
    valeur = pourcentage;
    montrer(pourcentage);
    element.setAttribute("aria-valuetext", pourcentage === null ? "non renseigné" : nomDuNiveau(pourcentage, niveaux));
    if (pourcentage === null) {
      element.removeAttribute("aria-valuenow");
    } else {
      element.setAttribute("aria-valuenow", String(pourcentage));
    }
  };
  const valider = (pourcentage: number | null): void => {
    fixer(pourcentage);
    surChangement(pourcentage);
  };
  const sousLePointeur = (abscisse: number): number => {
    const zone = piste.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(100, ((abscisse - zone.left) / zone.width) * 100)));
  };

  let glisse: number | null = null;
  element.addEventListener("pointerdown", (evenement) => {
    if (evenement.button > 0) return;
    evenement.preventDefault();
    element.focus({ preventScroll: true });
    try {
      element.setPointerCapture(evenement.pointerId);
    } catch {
      // Un pointeur déjà relâché ne se capture pas : le glisser se fait alors sans capture.
    }
    glisse = sousLePointeur(evenement.clientX);
    element.classList.add("drag");
    montrer(glisse);
  });
  element.addEventListener("pointermove", (evenement) => {
    if (glisse === null) return;
    const position = sousLePointeur(evenement.clientX);
    if (position !== glisse) {
      glisse = position;
      montrer(position);
    }
  });
  element.addEventListener("pointerup", () => {
    if (glisse === null) return;
    const position = aimanterPourcentage(glisse, nombre);
    glisse = null;
    element.classList.remove("drag");
    valider(position);
  });
  element.addEventListener("pointercancel", () => {
    glisse = null;
    element.classList.remove("drag");
    montrer(valeur);
  });
  element.addEventListener("dblclick", () => {
    valider(null);
  });
  element.addEventListener("keydown", (evenement) => {
    const position = positionAuClavier(evenement.key, evenement.shiftKey, valeur, nombre);
    if (position === undefined) return;
    evenement.preventDefault();
    valider(position);
  });

  fixer(valeur);
  return { element, fixer };
}
