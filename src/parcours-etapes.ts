// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Avancement, IdentifiantParcours } from "./domaine/parcours";

/** Geste que l'animation suggère sur la zone éclairée. */
export type Geste = "cliquer" | "remplir" | "regarder";

/**
 * Une étape d'une visite guidée.
 *
 * - `cibles` : sélecteurs essayés dans l'ordre ; la première zone visible est
 *   éclairée, le reste de l'écran est grisé. Sans cible trouvée, la bulle se
 *   place au centre.
 * - `atteinte` (étape de navigation) : vrai quand l'écran visé est déjà
 *   affiché ; l'étape est alors sautée, et elle avance d'elle-même dès qu'il
 *   l'est.
 * - `objectif` : ce que l'étape fait accomplir ; s'il est atteint pendant
 *   l'étape, la visite le salue et passe à la suite. S'il l'était déjà, la
 *   bulle le dit et propose de continuer.
 * - `groupeFait` : sur une étape de navigation, saute l'étape quand le but du
 *   groupe auquel elle mène est déjà atteint.
 */
export interface Etape {
  titre: string;
  texte: string;
  texteFait?: string;
  cibles?: readonly string[];
  /** Élément, dans la zone éclairée, vers lequel le curseur animé se dirige (par défaut, la zone elle-même). */
  pointe?: string;
  geste?: Geste;
  atteinte?: () => boolean;
  objectif?: (avancement: Avancement) => boolean;
  groupeFait?: (avancement: Avancement) => boolean;
  /** L'étape avance au clic sur la zone éclairée. */
  avanceAuClic?: boolean;
}

export interface Parcours {
  titre: string;
  /** Grandes étapes affichées en feuille de route ; une étape dont le titre commence par « n. » appartient à la n-ième. */
  chapitres?: readonly string[];
  etapes: readonly Etape[];
}

/**
 * Grande étape (à partir de 0) à laquelle appartient l'étape `index` : celle de la
 * première étape numérotée à partir d'elle, pour que les étapes de navigation qui
 * mènent à une grande étape en fassent déjà partie. `null` après la dernière.
 */
export function chapitreDe(etapes: readonly Pick<Etape, "titre">[], index: number): number | null {
  for (const etape of etapes.slice(Math.max(0, index))) {
    const numero = /^(\d+)\./.exec(etape.titre);
    if (numero?.[1] !== undefined) {
      return Number(numero[1]) - 1;
    }
  }
  return null;
}

function visible(selecteur: string): boolean {
  const element = document.querySelector<HTMLElement>(selecteur);
  return element !== null && !element.hidden && element.getClientRects().length > 0;
}

function ongletOuvert(identifiantVue: string): () => boolean {
  return () => visible(`#${identifiantVue}`);
}

function voletOuvert(volet: string): () => boolean {
  return () => visible("#v-org") && document.querySelector(`[data-opane="${volet}"][aria-pressed="true"]`) !== null;
}

const ALLER_ETABLISSEMENT: Etape = {
  titre: "Mon établissement",
  texte: "Ouvrez l'onglet « Mon établissement » : c'est là que vous décrivez vos promotions, vos collègues et qui enseigne quoi.",
  cibles: ["#t-org"],
  geste: "cliquer",
  atteinte: ongletOuvert("v-org"),
  avanceAuClic: true,
};

const ALLER_PARAMETRES: Etape = {
  titre: "Paramètres",
  texte: "Ouvrez l'onglet « Paramètres », où se trouvent les modules de l'application.",
  cibles: ["#t-set"],
  geste: "cliquer",
  atteinte: ongletOuvert("v-set"),
  avanceAuClic: true,
};

function allerVolet(volet: string, libelle: string, groupeFait: (avancement: Avancement) => boolean): Etape {
  return {
    titre: libelle,
    texte: `Choisissez le volet « ${libelle} ».`,
    cibles: [`[data-opane="${volet}"]`],
    geste: "cliquer",
    atteinte: voletOuvert(volet),
    groupeFait,
    avanceAuClic: true,
  };
}

const ALLER_EVALUATIONS: Etape = {
  titre: "Mes évaluations",
  texte: "Revenez à l'onglet « Mes évaluations ».",
  cibles: ["#t-saved"],
  geste: "cliquer",
  atteinte: ongletOuvert("v-saved"),
  avanceAuClic: true,
};

const ACTIONS_EVALUATION = ["#savedList [data-xm]"];
/** Fenêtre ou menu d'actions d'une évaluation, quelle que soit sa forme. */
const FENETRE_ACTIONS = ['[role="dialog"][aria-modal="true"]', ".xpop:not([hidden])"];

const PRISE_EN_MAIN: Parcours = {
  titre: "Prise en main",
  chapitres: ["Référentiel", "Promotions", "Collègues", "Répartition", "Évaluation", "Export"],
  etapes: [
    {
      titre: "Bienvenue dans DNMAX",
      texte:
        "En quelques minutes, vous allez installer et valider votre référentiel, déclarer vos promotions, vos collègues et votre répartition de service, puis créer et exporter votre première évaluation. " +
        "Vous pouvez passer cette visite à tout moment et la relancer depuis « Mon compte ».",
    },
    {
      titre: "1. Choisir le référentiel",
      texte:
        "Cliquez sur votre mention, Objet ou Espace : le référentiel est livré avec DNMAX, rien à télécharger. Vous verrez ce qu'il contient avant de l'installer.",
      cibles: [".accueil-vide li:first-child", "#bouton-echange"],
      pointe: ".btn",
      geste: "cliquer",
      groupeFait: (avancement) => avancement.referentiel,
      avanceAuClic: true,
    },
    {
      titre: "1. Valider l'installation",
      texte: "DNMAX montre ce que le référentiel ajouterait. Validez : l'application se recharge et la visite reprend à l'étape suivante.",
      texteFait: "Votre référentiel est installé. Vous le retrouvez dans l'onglet « Référentiel ».",
      cibles: [".echange-boite .echange-actions .btn.primary", ".accueil-vide li:first-child", "#t-ref"],
      geste: "cliquer",
      objectif: (avancement) => avancement.referentiel,
    },
    {
      titre: "1. Mon référentiel",
      texte:
        "Avant une première évaluation, vérifiez le référentiel : vous en êtes responsable, même s'il est livré avec DNMAX. Ouvrez l'onglet « Référentiel ».",
      cibles: ["#t-ref"],
      geste: "cliquer",
      atteinte: ongletOuvert("v-ref"),
      groupeFait: (avancement) => avancement.referentielValide,
      avanceAuClic: true,
    },
    {
      titre: "1. Constituer",
      texte: "Choisissez « Constituer » : les UE, les EC et la planification par semestre s'y relisent étape par étape.",
      cibles: ['#refNav [data-pane="constituer"]'],
      geste: "cliquer",
      atteinte: () => visible("#v-ref") && document.querySelector('#refNav [data-pane="constituer"][aria-pressed="true"]') !== null,
      groupeFait: (avancement) => avancement.referentielValide,
      avanceAuClic: true,
    },
    {
      titre: "1. Validation",
      texte: "Ouvrez la dernière étape, « Validation ».",
      cibles: ['#refPane .steps [data-cp="valider"]'],
      geste: "cliquer",
      atteinte: () => visible("#cAtteste"),
      groupeFait: (avancement) => avancement.referentielValide,
      avanceAuClic: true,
    },
    {
      titre: "1. Valider le référentiel",
      texte:
        "Relisez le référentiel. Cochez ensuite la case par laquelle vous attestez l'avoir vérifié et en assumer le contenu, puis cliquez « Valider cette version ». Sans validation, aucune évaluation ne peut être créée.",
      texteFait: "Votre référentiel est validé : vous pouvez évaluer avec.",
      cibles: ["#cpMain .panel", "#t-ref"],
      pointe: "#cAtteste",
      geste: "cliquer",
      objectif: (avancement) => avancement.referentielValide,
    },
    { ...ALLER_ETABLISSEMENT, groupeFait: (avancement) => avancement.promotions > 0 },
    allerVolet("promos", "Promotions", (avancement) => avancement.promotions > 0),
    {
      titre: "2. Déclarer vos promotions",
      texte:
        "Cliquez « + Promotion », choisissez le diplôme et la mention, puis l'année d'entrée : DNMAX suit ensuite la promotion d'année en année. Déclarez-en au moins une.",
      texteFait: "Vos promotions sont déclarées. Vous pourrez en ajouter d'autres ici.",
      cibles: ["#orgPane"],
      pointe: "#prAdd",
      geste: "cliquer",
      objectif: (avancement) => avancement.promotions > 0,
    },
    { ...ALLER_ETABLISSEMENT, groupeFait: (avancement) => avancement.enseignants > 0 },
    allerVolet("enseignants", "Enseignants", (avancement) => avancement.enseignants > 0),
    {
      titre: "3. Déclarer vos collègues",
      texte:
        "Ajoutez-vous, puis vos collègues, avec « + Ajouter » : prénom, nom et discipline. Cochez la case « moi » sur votre ligne : la progression montrera alors vos promotions.",
      texteFait: "L'équipe est déclarée. Pensez à cocher « moi » sur votre ligne.",
      cibles: ["#orgPane"],
      pointe: "#edAdd",
      geste: "cliquer",
      objectif: (avancement) => avancement.enseignants > 0,
    },
    { ...ALLER_ETABLISSEMENT, groupeFait: (avancement) => avancement.repartition },
    allerVolet("affect", "Répartition de service", (avancement) => avancement.repartition),
    {
      titre: "4. Répartir les enseignements",
      texte:
        "Pour chaque promotion en cours, indiquez qui assure chaque enseignement constitutif (EC) avec « + enseignant ». Une attribution suffit pour continuer ; vous compléterez plus tard.",
      texteFait: "La répartition de service est commencée.",
      cibles: ["#orgPane"],
      pointe: "[data-afadd]",
      geste: "cliquer",
      objectif: (avancement) => avancement.repartition,
    },
    { ...ALLER_EVALUATIONS, groupeFait: (avancement) => avancement.evaluations > 0 },
    {
      titre: "5. Créer une évaluation",
      texte: "Cliquez « + Nouvelle évaluation ».",
      cibles: ["#bNew"],
      geste: "cliquer",
      atteinte: ongletOuvert("v-new"),
      groupeFait: (avancement) => avancement.evaluations > 0,
      avanceAuClic: true,
    },
    {
      titre: "5. L'évaluation",
      texte:
        "Donnez un intitulé, cochez la ou les promotions concernées et les livrables attendus. Passez ensuite à l'étape 2, « Compétences ».",
      cibles: ["#step1"],
      pointe: "#f-titre",
      geste: "remplir",
      atteinte: () => visible("#step2") || visible("#step3"),
      groupeFait: (avancement) => avancement.evaluations > 0,
    },
    {
      titre: "5. Les compétences",
      texte: "Cochez les compétences évaluées, choisies dans votre référentiel, puis passez à l'étape 3, « Formulation ».",
      cibles: ["#step2"],
      geste: "remplir",
      atteinte: () => visible("#step3"),
      groupeFait: (avancement) => avancement.evaluations > 0,
    },
    {
      titre: "5. Formuler et enregistrer",
      texte:
        "Pour chaque compétence, rédigez ce que vous attendez (la compétence opérationnelle). Cliquez enfin « Enregistrer l'évaluation » : elle rejoint « Mes évaluations ».",
      texteFait: "Votre évaluation est enregistrée.",
      cibles: ["#step3", "#t-saved"],
      pointe: "#bSave3",
      geste: "cliquer",
      objectif: (avancement) => avancement.evaluations > 0,
    },
    ALLER_EVALUATIONS,
    {
      titre: "6. Exporter",
      texte: "Ouvrez les actions de votre évaluation.",
      cibles: ACTIONS_EVALUATION,
      geste: "cliquer",
      avanceAuClic: true,
    },
    {
      titre: "6. Choisir le format",
      texte:
        "Choisissez Word, Excel ou OpenDocument. Le document reprend les compétences avec leur code, ce que vous attendez et votre nom en en-tête.",
      cibles: FENETRE_ACTIONS,
      pointe: "[data-xk]",
      geste: "cliquer",
    },
    {
      titre: "C'est prêt",
      texte:
        "Vous savez l'essentiel. Pour saisir les résultats élève par élève, activez le module Élèves dans « Paramètres » : il a sa propre visite, comme le module Niveaux DN MADE. Cette visite se relance depuis « Mon compte ».",
    },
  ],
};

const MODULE_ELEVES: Parcours = {
  titre: "Module Élèves",
  etapes: [
    {
      titre: "Le module Élèves",
      texte:
        "Il sert à évaluer chaque élève dans l'application : grille de saisie de la promotion, observations, non-rendus, un document par élève, et la progression de chacun. Les noms et résultats restent sur cet ordinateur.",
    },
    { ...ALLER_PARAMETRES, groupeFait: (avancement) => avancement.moduleEleves },
    {
      titre: "Activer le module",
      texte: "Activez l'interrupteur du module « Élèves ».",
      texteFait: "Le module Élèves est actif.",
      cibles: ['#modList .mod:has([data-mod="eleves"])'],
      pointe: ".tg",
      geste: "cliquer",
      objectif: (avancement) => avancement.moduleEleves,
    },
    { ...ALLER_ETABLISSEMENT, groupeFait: (avancement) => avancement.elevesInscrits > 0 },
    allerVolet("promos", "Promotions", (avancement) => avancement.elevesInscrits > 0),
    {
      titre: "Inscrire les élèves",
      texte:
        "Dans chaque promotion, collez la liste des élèves : un élève par ligne, prénom puis nom. Vous pourrez corriger chaque nom ensuite.",
      texteFait: "Des élèves sont inscrits.",
      cibles: ["#orgPane"],
      geste: "remplir",
      objectif: (avancement) => avancement.elevesInscrits > 0,
    },
    ALLER_EVALUATIONS,
    {
      titre: "Évaluer les élèves",
      texte: "Ouvrez les actions d'une évaluation…",
      cibles: ACTIONS_EVALUATION,
      geste: "cliquer",
      avanceAuClic: true,
    },
    {
      titre: "Évaluer les élèves",
      texte: "…puis « Évaluer les élèves » : la grille de la promotion s'ouvre, une ligne par élève, avec observations et appréciation.",
      cibles: ["[data-sai]", ...FENETRE_ACTIONS],
      geste: "cliquer",
    },
    {
      titre: "Suivre chaque élève",
      texte: "Dans « Progression », la vue « Élève » montre où en est chacun dans le semestre, comparé au reste de la promotion.",
      cibles: ["#t-prog"],
      geste: "cliquer",
    },
    {
      titre: "Données des élèves",
      texte:
        "Dans « Paramètres », le panneau « Données des élèves » répond aux demandes d'accès ou d'effacement et propose d'anonymiser les promotions sorties depuis plus d'un an.",
    },
  ],
};

const MODULE_NIVEAUX: Parcours = {
  titre: "Module Niveaux DN MADE",
  etapes: [
    {
      titre: "Le module Niveaux DN MADE",
      texte:
        "Il attribue à chaque élève le niveau atteint sur chaque compétence : Initié en année 1, Guidé en année 2, Autonome en année 3, dès qu'il y est évalué avec une maîtrise suffisante. Il s'appuie sur le module Élèves.",
    },
    { ...ALLER_PARAMETRES, groupeFait: (avancement) => avancement.moduleNiveaux },
    {
      titre: "Activer le module Élèves",
      texte: "Le module Niveaux DN MADE a besoin du module Élèves : activez d'abord celui-ci.",
      texteFait: "Le module Élèves est actif.",
      cibles: ['#modList .mod:has([data-mod="eleves"])'],
      pointe: ".tg",
      geste: "cliquer",
      objectif: (avancement) => avancement.moduleEleves,
    },
    {
      titre: "Activer les niveaux",
      texte: "Activez maintenant l'interrupteur « Niveaux DN MADE ».",
      texteFait: "Le module Niveaux DN MADE est actif.",
      cibles: ['#modList .mod:has([data-mod="dn"])'],
      pointe: ".tg",
      geste: "cliquer",
      objectif: (avancement) => avancement.moduleNiveaux,
    },
    {
      titre: "Où voir les niveaux",
      texte:
        "Les niveaux s'affichent dans « Progression », vue « Élève », dans les intitulés d'année et dans les exports. Ils se mettent à jour à chaque résultat saisi.",
      cibles: ["#t-prog"],
      geste: "regarder",
    },
  ],
};

export const PARCOURS_DEFINIS: Readonly<Record<IdentifiantParcours, Parcours>> = {
  "prise-en-main": PRISE_EN_MAIN,
  eleves: MODULE_ELEVES,
  niveaux: MODULE_NIVEAUX,
};
