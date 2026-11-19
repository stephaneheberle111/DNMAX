// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 1 de l'éditeur d'évaluation, première partie : les livrables
 * attendus, les enseignants et le semestre. Les règles sont dans
 * `domaine/evaluation` ; ce module affiche et transmet.
 */
import { basculerEc, basculerUe, cadreDuSemestre, autresPromotionsMontrees, promotionsBloquees, separerMiennes, uesRetenues } from "../domaine/cadre-evaluation";
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
    hote.replaceChildren(creer("span", "hint", "Ajoutez les enseignant·es dans Mon établissement > Enseignant·es."));
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

/** Un EC proposé au semestre, tel que l'étape l'affiche. */
export interface EcPropose {
  readonly ec: string;
  readonly nom: string;
  readonly ue: string;
  readonly couleur: string;
}

/** Ce que l'éditeur confie au choix des UE et des EC. */
export interface ContexteUesEcs {
  /** L'évaluation en cours ; ses UE (`ues`) et EC (`ecCodes`) sont remplacés à chaque choix. */
  readonly evaluation: Record<string, unknown>;
  /** EC du semestre, triés. */
  readonly ecs: readonly EcPropose[];
  couleurUe(ue: string): string;
  /** Nom court d'une UE, sans le préfixe « UE ». */
  nomUe(ue: string): string;
  /** EC que les enseignants choisis assurent pour les promotions cochées ; `null` : pas de restriction. */
  readonly ecsAffectes: readonly string[] | null;
  /** Les enseignants choisis, en une ligne. */
  readonly enseignants: string;
  /** Vrai si au moins une promotion est cochée : c'est son référentiel qui donne les UE et les EC. */
  readonly promotionChoisie: boolean;
  /** Après un choix : les compétences retenues suivent leurs EC, l'évaluation est enregistrée et l'étape redessinée. */
  apresChangement(): void;
}

/** UE et EC retenus par l'évaluation, et la ligne qui résume le choix. */
export function peindreUesEtEcs(contexte: ContexteUesEcs): void {
  const { evaluation, ecs } = contexte;
  if (!contexte.promotionChoisie) {
    // Les UE et EC viennent du référentiel de la promotion : rien à proposer avant d'en avoir choisi une.
    const attente = "Choisissez d'abord une promotion : les UE et EC proposés viennent du référentiel de sa mention.";
    document.getElementById("f-ue")?.replaceChildren(creer("span", "hint", attente));
    document.getElementById("f-ecsel")?.replaceChildren();
    const resume = document.getElementById("ecHint");
    if (resume !== null) resume.textContent = "";
    return;
  }
  // Après un changement de semestre, les UE et EC d'un autre semestre sont oubliés.
  const cadre = cadreDuSemestre({ ues: textes(evaluation.ues), ecCodes: textes(evaluation.ecCodes) }, ecs);
  evaluation.ues = cadre.ues;
  evaluation.ecCodes = cadre.ecCodes;
  const affectes = contexte.ecsAffectes === null ? null : new Set(contexte.ecsAffectes);
  const choisir = (suite: { ues: string[]; ecCodes: string[] }): void => {
    evaluation.ues = suite.ues;
    evaluation.ecCodes = suite.ecCodes;
    contexte.apresChangement();
  };

  const zoneUes = document.getElementById("f-ue");
  if (zoneUes !== null) {
    const ues = [...new Set(ecs.map((entree) => entree.ue))].filter(
      (ue) => affectes === null || cadre.ues.includes(ue) || ecs.some((entree) => entree.ue === ue && affectes.has(entree.ec)),
    );
    if (ues.length === 0) {
      zoneUes.replaceChildren(creer("span", "hint", "Aucune UE à ce semestre."));
    } else {
      zoneUes.replaceChildren(
        ...ues.map((ue) => {
          const cochee = cadre.ues.includes(ue);
          const total = ecs.filter((entree) => entree.ue === ue).length;
          const retenus = ecs.filter((entree) => entree.ue === ue && cadre.ecCodes.includes(entree.ec)).length;
          const bouton = creerBouton(contexte.nomUe(ue), cochee && retenus < total ? "ec part" : "ec", () => {
            choisir(basculerUe(cadre, ue, ecs));
          });
          bouton.style.setProperty("--c", contexte.couleurUe(ue));
          bouton.dataset.uepick = ue;
          bouton.setAttribute("aria-pressed", String(cochee));
          if (cochee && total > 0) bouton.append(creer("em", "", `${String(retenus)}/${String(total)}`));
          return bouton;
        }),
      );
    }
  }

  const montres = affectes === null ? ecs : ecs.filter((entree) => affectes.has(entree.ec) || cadre.ecCodes.includes(entree.ec));
  const zoneEcs = document.getElementById("f-ecsel");
  if (zoneEcs !== null) {
    zoneEcs.replaceChildren(
      ...montres.map((entree) => {
        const bouton = creerBouton("", "ec", () => {
          choisir(basculerEc(cadre, entree.ec, ecs));
        });
        bouton.style.setProperty("--c", entree.couleur);
        bouton.dataset.ecc = entree.ec;
        bouton.setAttribute("aria-pressed", String(cadre.ecCodes.includes(entree.ec)));
        bouton.title = entree.ue;
        bouton.append(creer("span", "k", entree.ec), entree.nom);
        return bouton;
      }),
    );
  }

  const resume = document.getElementById("ecHint");
  if (resume !== null) {
    const nombreEcs = cadre.ecCodes.length;
    const nombreUes = uesRetenues(cadre, ecs).length;
    const choix =
      nombreEcs > 0 || nombreUes > 0
        ? [nombreUes > 0 ? `${String(nombreUes)} UE` : "", nombreEcs > 0 ? `${String(nombreEcs)} EC sélectionné${nombreEcs > 1 ? "s" : ""}` : "aucun EC"]
            .filter(Boolean)
            .join(" · ")
        : "Aucune UE ni EC précisé — toutes les compétences du semestre sont proposées";
    resume.textContent =
      choix + (affectes === null ? "" : ` · EC limités à ceux de ${contexte.enseignants} (${String(montres.length)} sur ${String(ecs.length)})`);
  }
}

/** Une promotion proposée à l'étape 1. */
export interface PromotionProposee {
  readonly nom: string;
  /** Nom court (« DNO2 »), ou le nom complet faute de mieux. */
  readonly libelle: string;
  /** Année de formation à l'année scolaire de l'évaluation ; `null` pour une promotion inconnue de l'établissement. */
  readonly annee: number | null;
  /** Vrai si la promotion est en cours (son année est dans la durée du diplôme). */
  readonly enCours: boolean;
  readonly referentielValide: boolean;
  /** Vrai si la promotion est dans la répartition de service de l'enseignant (ou s'il n'en a pas encore). */
  readonly mienne: boolean;
}

/** Ce que l'éditeur confie au choix des promotions. */
export interface ContextePromotions {
  /** Promotions en cours du diplôme, puis celles déjà cochées qui ne le sont plus. */
  readonly promotions: readonly PromotionProposee[];
  readonly cochees: readonly string[];
  readonly anneeScolaire: string;
  /** Vrai s'il n'y a aucune promotion en cours cette année scolaire. */
  readonly aucuneEnCours: boolean;
  /** Vrai si le référentiel de l'évaluation n'est pas validé (elle s'enregistre quand même). */
  readonly referentielNonValide: boolean;
  allerValidation(): void;
  basculer(nom: string): void;
}

/** Vrai quand l'enseignant a demandé à voir les promotions hors de sa répartition de service. */
let autresAffichees = false;

/**
 * Promotions de l'évaluation : boutons à bascule, avec leur année et l'état
 * de leur référentiel. Celles hors de la répartition de service de
 * l'enseignant sont masquées derrière un bouton (sauf si elles sont cochées) :
 * dans un grand établissement, elles noieraient les siennes.
 */
export function peindrePromotions(contexte: ContextePromotions): void {
  const hote = document.getElementById("f-classes");
  if (hote === null) return;
  const bloquees = promotionsBloquees(contexte.promotions, contexte.cochees);
  const { miennes, autres } = separerMiennes(contexte.promotions);
  const boutonPromotion = (promotion: PromotionProposee): HTMLElement => {
    const cochee = contexte.cochees.includes(promotion.nom);
    const bloquee = bloquees.has(promotion.nom);
    const element = creerBouton(promotion.libelle, "liv", () => {
      contexte.basculer(promotion.nom);
    });
    element.dataset.classe = promotion.nom;
    element.setAttribute("aria-pressed", String(cochee));
    element.disabled = bloquee;
    element.title =
      promotion.nom +
      (bloquee ? " — autre année de formation que la promotion déjà choisie" : "") +
      (promotion.referentielValide ? "" : " — référentiel non validé");
    if (promotion.libelle === promotion.nom && promotion.enCours && promotion.annee !== null) {
      element.append(creer("span", "n", `Année ${String(promotion.annee)}`));
    }
    if (!promotion.referentielValide) element.append(creer("span", "n", "référentiel à valider"));
    return element;
  };
  const elements: HTMLElement[] = miennes.map(boutonPromotion);
  // Les promotions hors de ma répartition de service restent accessibles, à part et plus discrètes ;
  // masquées par défaut, sauf celles déjà cochées.
  const montrees = autresPromotionsMontrees(autres, contexte.cochees, autresAffichees, miennes.length > 0);
  if (autres.length > 0) {
    if (miennes.length > 0) {
      const cachees = autres.length - montrees.length;
      const bascule = creerBouton(
        autresAffichees ? "Masquer les autres promotions" : `Autres promotions (${String(cachees)})`,
        autresAffichees ? "liv add moins" : "liv add",
        () => {
          autresAffichees = !autresAffichees;
          peindrePromotions(contexte);
        },
      );
      bascule.dataset.autres = "";
      bascule.setAttribute("aria-expanded", String(autresAffichees));
      bascule.title = "Promotions en cours hors de votre répartition de service";
      if (autresAffichees || cachees > 0) elements.push(bascule);
    }
    elements.push(
      ...montrees.map((promotion) => {
        const element = boutonPromotion(promotion);
        element.classList.add("discrete");
        element.title += " — hors de votre répartition de service";
        return element;
      }),
    );
  }
  if (contexte.aucuneEnCours) {
    elements.push(creer("span", "hint", `Aucune promotion en cours en ${contexte.anneeScolaire} : créez-la dans Mon établissement > Promotions.`));
  }
  if (contexte.referentielNonValide) {
    const alerte = creer("span", "hint", "Le référentiel de cette évaluation n'est pas validé : vous pouvez l'enregistrer, mais pensez à le vérifier et à le valider. ");
    alerte.id = "f-refnv";
    alerte.style.color = "var(--signal)";
    alerte.style.flexBasis = "100%";
    const valider = creerBouton("Valider le référentiel", "btn ghost", () => {
      contexte.allerValidation();
    });
    valider.dataset.allerval = "";
    alerte.append(valider);
    elements.push(alerte);
  }
  hote.replaceChildren(...elements);
}
