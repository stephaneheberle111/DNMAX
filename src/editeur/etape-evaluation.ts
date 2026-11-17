// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 1 de l'éditeur d'évaluation, première partie : les livrables
 * attendus, les enseignants et le semestre. Les règles sont dans
 * `domaine/evaluation` ; ce module affiche et transmet.
 */
import { basculerLivrableAttendu } from "../domaine/evaluation";
import { creer, creerBouton } from "../ecran-echange";

function textes(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.filter((element): element is string => typeof element === "string") : [];
}

/** Ce que l'éditeur confie à la liste des livrables. */
export interface ContexteLivrables {
  /** L'évaluation en cours ; ses livrables, compétences et regroupements sont remplacés à chaque changement. */
  readonly evaluation: Record<string, unknown>;
  /** Livrables proposés par « Mon établissement ». */
  readonly livrablesEtablissement: readonly string[];
  enregistrer(): void;
  apresChangement(): void;
  /** Propose d'ajouter un livrable saisi à la liste de « Mon établissement », pour les prochaines évaluations. */
  proposerAjoutEtablissement(livrable: string): void;
}

/** Livrables attendus : ceux de l'établissement, puis ceux propres à l'évaluation ; « Autre livrable… » pour en saisir un. */
export function peindreLivrables(contexte: ContexteLivrables): void {
  const hote = document.getElementById("f-livr");
  if (hote === null) return;
  const attendus = textes(contexte.evaluation.livrables);
  const changer = (livrable: string): void => {
    Object.assign(contexte.evaluation, basculerLivrableAttendu(contexte.evaluation, livrable));
    contexte.enregistrer();
    peindreLivrables(contexte);
    contexte.apresChangement();
  };
  const proposes = [...new Set([...contexte.livrablesEtablissement, ...attendus])].filter((livrable) => livrable !== "");
  const boutons = proposes.map((livrable) => {
    const bouton = creerBouton(livrable, "liv", () => {
      changer(livrable);
    });
    bouton.dataset.livr = livrable;
    bouton.setAttribute("aria-pressed", String(attendus.includes(livrable)));
    return bouton;
  });

  const zoneAjout = creer("span", "livnew");
  const puce = creer("button", "liv add", "Autre livrable…");
  puce.type = "button";
  puce.id = "livAddChip";
  const champ = creer("input", "livinput");
  champ.type = "text";
  champ.id = "f-livr-new";
  champ.placeholder = "Nom du livrable";
  champ.hidden = true;
  const annuler = (): void => {
    champ.hidden = true;
    champ.value = "";
    puce.hidden = false;
    puce.setAttribute("aria-pressed", "false");
  };
  const valider = (): void => {
    const nom = champ.value.trim();
    if (nom === "") {
      annuler();
      return;
    }
    // Le champ disparaît au nouvel affichage : sa perte de focus ne doit pas valider une seconde fois.
    champ.disabled = true;
    if (!textes(contexte.evaluation.livrables).includes(nom)) {
      Object.assign(contexte.evaluation, basculerLivrableAttendu(contexte.evaluation, nom));
    }
    contexte.enregistrer();
    peindreLivrables(contexte);
    contexte.apresChangement();
    if (!contexte.livrablesEtablissement.includes(nom)) contexte.proposerAjoutEtablissement(nom);
  };
  puce.addEventListener("click", () => {
    puce.hidden = true;
    puce.setAttribute("aria-pressed", "true");
    champ.hidden = false;
    champ.value = "";
    champ.focus();
  });
  champ.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") {
      evenement.preventDefault();
      valider();
    } else if (evenement.key === "Escape") {
      evenement.preventDefault();
      annuler();
    }
  });
  champ.addEventListener("blur", () => {
    if (!champ.disabled) valider();
  });
  zoneAjout.append(puce, champ);
  hote.replaceChildren(...boutons, zoneAjout);
}

/** Ce que l'éditeur confie à la liste des enseignants. */
export interface ContexteEnseignants {
  readonly evaluation: Record<string, unknown>;
  /** Enseignants de « Mon établissement ». */
  readonly enseignants: readonly string[];
  enregistrer(): void;
  /** Après un changement : les EC proposés et la barre des étapes suivent les enseignants choisis. */
  apresChangement(): void;
}

/** Enseignants de l'évaluation ; `prof` garde leur liste en une ligne, pour les documents. */
export function peindreEnseignants(contexte: ContexteEnseignants): void {
  const hote = document.getElementById("f-prof-sel");
  if (hote === null) return;
  const { evaluation } = contexte;
  if (!Array.isArray(evaluation.profs)) {
    evaluation.profs = typeof evaluation.prof === "string" ? evaluation.prof.split(/,\s*/).filter(Boolean) : [];
  }
  const choisis = textes(evaluation.profs);
  const tous = [...new Set([...contexte.enseignants.filter(Boolean), ...choisis])];
  if (tous.length === 0) {
    hote.replaceChildren(creer("span", "hint", "Ajoutez les enseignants dans Mon établissement > Enseignants."));
    return;
  }
  hote.replaceChildren(
    ...tous.map((nom) => {
      const bouton = creerBouton(nom, "liv", () => {
        const profs = choisis.includes(nom) ? choisis.filter((autre) => autre !== nom) : [...choisis, nom];
        evaluation.profs = profs;
        evaluation.prof = profs.join(", ");
        contexte.enregistrer();
        peindreEnseignants(contexte);
        contexte.apresChangement();
      });
      bouton.dataset.prof = nom;
      bouton.setAttribute("aria-pressed", String(choisis.includes(nom)));
      return bouton;
    }),
  );
}

/** Ce que l'éditeur confie au choix du semestre. */
export interface ContexteSemestres {
  readonly semestre: string;
  readonly tousLesSemestres: readonly string[];
  /** Semestres de l'année de formation des promotions cochées ; tous si l'année n'est pas connue. */
  readonly autorises: readonly string[];
  /** Année de formation des promotions cochées, ou 0. */
  readonly annee: number;
  /** Nom de la promotion, cité dans l'infobulle d'un semestre hors de son année. */
  readonly classe: string;
  /** Niveau DN MADE du semestre (module Niveaux), ou chaîne vide. */
  readonly niveauDn: string;
  readonly nombreCompetences: number;
  readonly anneeScolaire: string;
  /** Vrai si l'enseignant a choisi le semestre lui-même, au lieu de le laisser suivre la date. */
  readonly choisiALaMain: boolean;
  choisir(semestre: string): void;
  suivreLaDate(): void;
}

/** Boutons des semestres, et la ligne d'information en dessous. */
export function peindreSemestres(contexte: ContexteSemestres): void {
  const hote = document.getElementById("f-sem");
  if (hote === null) return;
  hote.replaceChildren(
    ...contexte.tousLesSemestres.map((semestre) => {
      const bouton = creerBouton(semestre, "", () => {
        if (!bouton.disabled) contexte.choisir(semestre);
      });
      bouton.dataset.sem = semestre;
      bouton.setAttribute("aria-pressed", String(semestre === contexte.semestre));
      if (!contexte.autorises.includes(semestre)) {
        bouton.disabled = true;
        bouton.title = `Hors de l'année ${String(contexte.annee)}${contexte.classe === "" ? "" : ` (${contexte.classe})`}`;
      }
      return bouton;
    }),
  );
  const information = document.getElementById("semHint");
  if (information === null) return;
  const morceaux: (Node | string)[] = [];
  if (contexte.niveauDn !== "") morceaux.push(creer("span", "dnbadge", contexte.niveauDn), " \u00a0");
  morceaux.push(
    `${String(contexte.nombreCompetences)} compétences mobilisées` +
      (contexte.annee > 0 ? ` · semestres d'année ${String(contexte.annee)}` : "") +
      ` · année scolaire ${contexte.anneeScolaire}`,
  );
  if (contexte.choisiALaMain) {
    const suivre = creerBouton("suivre la date", "lnk", () => {
      contexte.suivreLaDate();
    });
    suivre.id = "semAuto";
    morceaux.push(" · ", suivre);
  }
  information.replaceChildren(...morceaux);
}
