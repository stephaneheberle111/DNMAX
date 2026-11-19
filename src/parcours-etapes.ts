// SPDX-License-Identifier: CECILL-2.1
import { ANGLE_BAS_DROITE, colleguesDeclares, plusProcheDeLAngle, type Avancement, type IdentifiantParcours } from "./domaine/parcours";

/**
 * Geste que l'animation suggère sur la zone éclairée : `parcourir` promène le
 * curseur d'un élément désigné par `pointe` au suivant ; `glisser` le fait
 * partir de l'élément `depuis` jusqu'à `pointe`, comme un glisser-déposer.
 */
export type Geste = "cliquer" | "remplir" | "regarder" | "parcourir" | "glisser";

/** Valeur fixe, ou relue sur l'écran à chaque image (selon ce que l'enseignant a déjà fait). */
export type Selon<T> = T | (() => T);

/** Un geste d'un enchaînement : ce que fait le curseur, vers quoi, et d'où pour `glisser`. */
export interface Mouvement {
  geste: Geste;
  pointe?: string;
  depuis?: string;
}

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
 * - `groupeFait` : saute l'étape quand elle n'a pas lieu d'être : but de son
 *   groupe déjà atteint, ou condition préalable manquante (pas d'export sans
 *   évaluation). Réservé aux étapes qui feraient refaire quelque chose (créer
 *   une évaluation), échoueraient, ou détailleraient un écran devenu inutile :
 *   une étape de navigation qui mène à un objectif déjà atteint reste jouée,
 *   pour que la bulle « déjà fait » s'affiche sur le bon écran, en particulier
 *   quand la visite est rejouée.
 */
export interface Etape {
  titre: string;
  texte: string;
  texteFait?: string;
  cibles?: readonly string[];
  /**
   * Élément, dans la zone éclairée, vers lequel le curseur animé se dirige (par
   * défaut, la zone elle-même) ; pour `parcourir`, tous les éléments désignés, tour à tour.
   */
  pointe?: Selon<string | undefined>;
  /** Pour `glisser` : élément d'où part le curseur (sélecteur cherché dans toute la page). */
  depuis?: Selon<string | undefined>;
  /**
   * Zone éclairée faite de plusieurs éléments réunis (le premier visible de
   * chaque sélecteur), par exemple l'en-tête d'un tableau et sa première ligne,
   * au lieu de la seule première cible.
   */
  zone?: readonly string[];
  /**
   * Pour `parcourir` : haltes du curseur, dans l'ordre, sur le premier élément
   * visible de chaque sélecteur (au lieu de tous les éléments de `pointe`).
   */
  haltes?: Selon<readonly string[]>;
  /** Après le clic de l'enseignant sur la zone (étape `avanceAuClic`), ce que la visite fait encore pour lui. */
  apresClic?: () => void;
  /** Boutons que la bulle, rangée dans un coin, doit laisser visibles (en plus de `pointe`). */
  aDegager?: string;
  geste?: Selon<Geste>;
  /**
   * Gestes montrés tour à tour, en boucle, au lieu d'un seul (`geste`, `pointe`,
   * `depuis`) : par exemple lier deux compétences, puis glisser un livrable, puis rédiger.
   */
  enchainement?: Selon<readonly Mouvement[]>;
  atteinte?: () => boolean;
  objectif?: (avancement: Avancement) => boolean;
  /** Délai avant de saluer l'objectif atteint et de passer à la suite (par défaut, un peu plus d'une seconde), pour laisser finir une saisie. */
  delaiSalut?: number;
  groupeFait?: (avancement: Avancement) => boolean;
  /** L'étape avance au clic sur la zone éclairée. */
  avanceAuClic?: boolean;
  /** « Suivant » referme la boîte de l'application ouverte pendant l'étape, qui cacherait la suite. */
  fermeLaBoite?: boolean;
  /** Étape de navigation sans zone à cliquer pour l'enseignant : « Suivant » ouvre l'écran visé à sa place. */
  ouvrir?: () => void;
  /**
   * Quand une boîte de l'application s'ouvre pendant l'étape : ce que la bulle
   * dit alors, et la zone de la boîte à éclairer (par exemple « Fermer »).
   */
  siBoite?: { texte: string; cibles: readonly string[] };
  /** Confettis quand l'étape est atteinte par un clic de l'enseignant (bouton de passage d'une étape à l'autre). */
  celebrer?: boolean;
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

/** Clique le premier élément visible désigné, s'il y en a un. */
function cliquer(selecteur: string): () => void {
  return () => {
    const element = [...document.querySelectorAll<HTMLElement>(selecteur)].find((candidat) => candidat.getClientRects().length > 0);
    element?.click();
  };
}

/** Vrai si au moins une case désignée est cochée. */
function caseCochee(selecteur: string): boolean {
  return [...document.querySelectorAll<HTMLInputElement>(selecteur)].some((caseACocher) => caseACocher.checked);
}

/** Où en est la formulation : il reste un livrable à glisser, une compétence à rédiger, ou plus qu'à enregistrer. */
function etapeFormulation(): "glisser" | "remplir" | "cliquer" {
  // Sans livrable à l'étape 1, il n'y a rien à glisser : on passe à la rédaction.
  const aGlisser = document.querySelector("#palLivr [data-dragliv]") !== null;
  if (aGlisser && document.querySelector("#lignes [data-lliv]") === null) {
    return "glisser";
  }
  const champs = [...document.querySelectorAll<HTMLInputElement>("#lignes input[data-lib]")];
  return champs.some((champ) => champ.value.trim() === "") ? "remplir" : "cliquer";
}

/** Nombre d'éléments désignés dans la page ; zéro hors navigateur (essais). */
function compter(selecteur: string): number {
  return typeof document === "undefined" ? 0 : document.querySelectorAll(selecteur).length;
}

/**
 * Vrai si le centre de l'élément est dans la fenêtre et dans le cadre de la
 * carte : la vue zoomée garde hors du cadre des éléments qui ont une taille.
 */
function seVoitDansLaCarte(element: Element): boolean {
  const cadre = element.getBoundingClientRect();
  const [x, y] = [cadre.left + cadre.width / 2, cadre.top + cadre.height / 2];
  const carte = element.closest("svg")?.parentElement?.getBoundingClientRect();
  const dans = (limite: { left: number; top: number; right: number; bottom: number }): boolean =>
    x >= limite.left && x <= limite.right && y >= limite.top && y <= limite.bottom;
  return dans({ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }) && (carte === undefined || dans(carte));
}

/**
 * Sélecteur de l'élément de la roue (désigné par `selecteur`) le plus proche
 * de son bas-droit tel qu'il s'affiche (la roue a pu tourner), vu de son
 * centre ; `selecteur` lui-même sans roue ni élément.
 */
function auBasDroiteDeLaRoue(selecteur: string): string {
  if (typeof document === "undefined") return selecteur;
  const moyeu = document.querySelector("#refExplore .radial .hub");
  if (moyeu === null) return selecteur;
  const centre = moyeu.getBoundingClientRect();
  const [centreX, centreY] = [centre.left + centre.width / 2, centre.top + centre.height / 2];
  // Une compétence revient une fois par EC qui la porte : l'angle du dessin (`data-am`) distingue chaque point.
  const reperes = [...document.querySelectorAll(selecteur)].filter(seVoitDansLaCarte).map((element) => {
    const cadre = element.getBoundingClientRect();
    return {
      id: repereSurLaRoue(element),
      angle: Math.atan2(cadre.top + cadre.height / 2 - centreY, cadre.left + cadre.width / 2 - centreX),
    };
  });
  const repere = plusProcheDeLAngle(
    reperes.filter((element) => element.id !== ""),
    ANGLE_BAS_DROITE,
  );
  return repere === null ? selecteur : `${selecteur}${repere}`;
}

/** Attributs qui désignent un seul élément de la roue : son identifiant et son angle dans le dessin. */
function repereSurLaRoue(element: Element): string {
  const id = element.getAttribute("data-id");
  if (id === null || id === "") return "";
  const angle = element.getAttribute("data-am");
  const echapper = (valeur: string): string => valeur.replace(/["\\]/g, "\\$&");
  return `[data-id="${echapper(id)}"]${angle === null ? "" : `[data-am="${echapper(angle)}"]`}`;
}

/**
 * Gestes de la formulation : lier deux compétences (tant qu'aucune ne l'est et
 * qu'il y en a deux), glisser un livrable sur une compétence (s'il y en a un),
 * puis rédiger la compétence opérationnelle.
 */
function gestesFormulation(): readonly Mouvement[] {
  if (typeof document === "undefined") return [];
  const lier: Mouvement = { geste: "glisser", depuis: "#lignes [data-dragcomp]", pointe: "#lignes .lg ~ .lg" };
  const livrable: Mouvement = { geste: "glisser", depuis: "#palLivr [data-dragliv]", pointe: "#lignes .livrow" };
  const rediger: Mouvement = { geste: "remplir", pointe: "#lignes input[data-lib]" };
  const dejaLiees = document.querySelector("#lignes [data-unlink]") !== null;
  const plusieurs = compter("#lignes .lg") >= 2;
  const avecLivrable = document.querySelector("#palLivr [data-dragliv]") !== null;
  return [...(dejaLiees || !plusieurs ? [] : [lier]), ...(avecLivrable ? [livrable] : []), rediger];
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

function allerVolet(volet: string, libelle: string): Etape {
  return {
    titre: libelle,
    texte: `Choisissez le volet « ${libelle} ».`,
    cibles: [`[data-opane="${volet}"]`],
    geste: "cliquer",
    atteinte: voletOuvert(volet),
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

const ALLER_REFERENTIEL: Etape = {
  titre: "Référentiel",
  texte: "Ouvrez l'onglet « Référentiel » : il contient le référentiel de votre mention.",
  cibles: ["#t-ref"],
  geste: "cliquer",
  atteinte: ongletOuvert("v-ref"),
  avanceAuClic: true,
};

function paneReferentiel(pane: string): () => boolean {
  return () => visible("#v-ref") && document.querySelector(`#refNav [data-pane="${pane}"][aria-pressed="true"]`) !== null;
}

/** Vrai si la page `page` de Référentiel > Constituer est affichée. */
function pageConstituer(page: string): () => boolean {
  return () => paneReferentiel("constituer")() && document.querySelector(`#refPane .steps [data-cp="${page}"][aria-current="true"]`) !== null;
}

/**
 * Une page de Référentiel > Constituer : toute la page est éclairée, pour que
 * l'enseignant puisse corriger chaque ligne ; le curseur passe sur chaque champ
 * de la première, pour montrer quoi vérifier.
 */
function etapePageConstituer(titre: string, texte: string, haltes: readonly string[]): Etape {
  return { titre, texte, cibles: ["#cpMain"], haltes, pointe: haltes.join(", "), geste: "parcourir" };
}

/** Passage à la page suivante de « Constituer », par la barre des étapes en haut. */
function etapeOuvrirPageConstituer(page: string, libelle: string): Etape {
  return {
    titre: "1. Constituer",
    texte: `Passez à la page suivante par la barre du haut : « ${libelle} ».`,
    cibles: [`#refPane .steps [data-cp="${page}"]`],
    geste: "cliquer",
    atteinte: pageConstituer(page),
    avanceAuClic: true,
    celebrer: true,
  };
}

/** Vrai une fois la boîte « Échanger » ouverte pendant la visite : sa fermeture fait passer à la suite. */
let boiteEchangeOuverte = false;

function sansEvaluation(avancement: Avancement): boolean {
  return avancement.evaluations === 0;
}

/**
 * Visite de prise en main : exploratoire. L'obligatoire (nom, établissement,
 * mot de passe, référentiel et promotions de la mention) est fait par la page
 * de bienvenue ; la visite montre où tout se trouve et coche ce qui est déjà fait.
 */
const PRISE_EN_MAIN: Parcours = {
  titre: "Prise en main",
  chapitres: ["Référentiel", "Promotions", "Collègues", "Répartition", "Évaluation", "Réglages"],
  etapes: [
    {
      titre: "Découvrir DNMAX",
      texte:
        "Votre espace est prêt. La visite vous fait explorer l'application en six temps : le référentiel, vos promotions, vos collègues, " +
        "la répartition de service, une première évaluation, puis vos préférences et les modules. Ce qui est déjà fait est coché au passage. " +
        "Rien n'y est obligatoire : passez une étape avec « Suivant », ou toute la visite, et relancez-la depuis « Paramètres », panneau « Visites guidées ».",
    },
    {
      ...ALLER_REFERENTIEL,
      texte:
        "Ouvrez l'onglet « Référentiel » : il contient le référentiel de votre mention. La visite vous mène à « Constituer », " +
        "où vous le vérifiez page par page, des unités d'enseignement à la validation.",
      // L'onglet ouvert, la visite choisit « Constituer » à la place de l'enseignant.
      apresClic: cliquer('#refNav [data-pane="constituer"]'),
      atteinte: paneReferentiel("constituer"),
    },
    {
      titre: "1. Constituer",
      texte: "Ouvrez la première page, « 1. Unités d'enseignement ».",
      cibles: ['#refPane .steps [data-cp="ues"]'],
      geste: "cliquer",
      atteinte: pageConstituer("ues"),
      avanceAuClic: true,
    },
    etapePageConstituer(
      "1. Unités d'enseignement",
      "Pour chaque UE, vérifiez sa couleur (elle la signale partout dans DNMAX), corrigez au besoin son nom et les semestres où elle est programmée.",
      ['[data-row="u0"] input[type="color"]', '[data-row="u0"] input[data-cf$="|nom"]', '[data-row="u0"] .sems'],
    ),
    etapeOuvrirPageConstituer("ecs", "2. Enseignements constitutifs"),
    etapePageConstituer(
      "1. Enseignements constitutifs",
      "Même vérification pour chaque EC : sa couleur, ses codes d'une année à l'autre, son nom, son UE et ses semestres.",
      [
        '[data-row="e0"] input[type="color"]',
        '[data-row="e0"] .codes3',
        '[data-row="e0"] input[data-cf$="|nom"]',
        '[data-row="e0"] [data-em]',
        '[data-row="e0"] .chips',
      ],
    ),
    etapeOuvrirPageConstituer("blocs", "3. Blocs et compétences"),
    etapePageConstituer(
      "1. Blocs et compétences",
      "Relisez le code et l'intitulé de chaque compétence, et le bloc auquel elle appartient.",
      ['[data-row="c0"] [data-ccode]', '[data-row="c0"] textarea', '[data-row="c0"] [data-cbloc]'],
    ),
    etapeOuvrirPageConstituer("tableau", "4. Planification par semestre"),
    etapePageConstituer(
      "1. Planification par semestre",
      "Chaque case rattache une compétence à un EC pour un semestre ; filtrez par semestre au-dessus du tableau.",
      [".semfilter .seg", '[data-tog="c0|e0|S1"]'],
    ),
    etapeOuvrirPageConstituer("valider", "5. Validation"),
    {
      titre: "1. Valider le référentiel",
      texte:
        "Avant une première évaluation, vérifiez le référentiel : vous en êtes responsable, même s'il est livré avec DNMAX. " +
        "Cochez la case par laquelle vous attestez l'avoir vérifié et en assumer le contenu, puis cliquez « Valider cette version ». Sans validation, vous pouvez évaluer, mais DNMAX vous le rappellera à chaque promotion cochée.",
      texteFait: "Votre référentiel est validé : vous pouvez évaluer avec.",
      cibles: ["#cpMain .panel", "#t-ref"],
      // Le curseur coche la case d'attestation puis va sur le bouton ; la case cochée, il reste sur le bouton.
      haltes: () => (caseCochee("#cAtteste") ? ["#cValid"] : ["#cAtteste", "#cValid"]),
      pointe: "#cAtteste, #cValid",
      aDegager: "#cValid",
      geste: "parcourir",
      objectif: (avancement) => avancement.referentielValide,
    },
    {
      titre: "1. Explorer",
      texte: "Choisissez maintenant « Explorer » : le référentiel que vous venez de vérifier s'y lit d'un coup d'œil.",
      cibles: ['#refNav [data-pane="explorer"]'],
      geste: "cliquer",
      atteinte: paneReferentiel("explorer"),
      avanceAuClic: true,
    },
    {
      titre: "1. La carte du référentiel",
      texte:
        "Chaque point est une compétence : passez sur l'un d'eux, la carte montre à quel EC elle est associée. " +
        "Survolez un EC : la vue s'éclate autour de lui. Dézoomez (−) pour voir toute la roue. " +
        "La recherche retrouve une compétence par son code (C4.1, EC 11.2) ou un mot-clé.",
      cibles: ["#refExplore"],
      // Le curseur commence par la compétence et l'EC du bas-droit de la roue, la partie que la vue de départ montre.
      haltes: () => [
        auBasDroiteDeLaRoue("#refExplore .radial .dot"),
        auBasDroiteDeLaRoue('#refExplore .radial .sg[data-kind="ec"]'),
        '#refExplore [data-rz="-1"]',
      ],
      pointe: '#refExplore .radial .dot, #refExplore .radial .sg[data-kind="ec"], #refExplore [data-rz="-1"]',
      geste: "parcourir",
    },
    {
      titre: "1. Ajouter un référentiel",
      texte:
        "Un autre référentiel (une autre mention, une nouvelle version) s'ajoute par « Échanger… > Recevoir », avec le fichier d'un collègue " +
        "ou celui téléchargé sur le site de DNMAX : vous voyez ce qu'il contient avant de l'installer.",
      cibles: ["#bouton-echange"],
      geste: () => (visible(".echange-boite") ? "cliquer" : "regarder"),
      siBoite: {
        texte: "Rien à faire ici pour l'instant : vous pourrez y revenir quand un collègue vous enverra un fichier. Pour continuer la visite, cliquez « Fermer ».",
        cibles: [".echange-boite .echange-actions .btn"],
      },
      // La boîte ouverte puis refermée, la visite passe d'elle-même aux promotions.
      atteinte: () => {
        if (visible(".echange-boite")) {
          boiteEchangeOuverte = true;
          return false;
        }
        const refermee = boiteEchangeOuverte;
        boiteEchangeOuverte = false;
        return refermee;
      },
    },
    ALLER_ETABLISSEMENT,
    allerVolet("promos", "Promotions"),
    {
      titre: "2. Vos promotions",
      texte:
        "Cliquez « + Promotion », choisissez le diplôme et la mention, puis l'année d'entrée : DNMAX suit ensuite la promotion d'année en année.",
      texteFait:
        "Vos promotions en cours sont déclarées : DNMAX les fait passer d'année en année. « + Promotion » en ajoute une autre ici, par exemple d'une autre mention.",
      cibles: ["#orgPane"],
      pointe: "#prAdd",
      geste: "cliquer",
      objectif: (avancement) => avancement.promotions > 0,
    },
    ALLER_ETABLISSEMENT,
    allerVolet("enseignants", "Enseignants"),
    {
      titre: "3. Vos collègues",
      texte:
        "Vous êtes déjà dans la liste, marqué « C'est moi » : la progression montrera vos promotions. Ajoutez vos collègues avec « + Ajouter » : prénom et nom.",
      texteFait: "L'équipe est déclarée. Vous pourrez ajouter d'autres collègues ici.",
      cibles: ["#orgPane"],
      pointe: "#edAdd",
      geste: "cliquer",
      objectif: colleguesDeclares,
      // Le collègue compte dès la première lettre de son nom : la visite attend qu'il soit écrit en entier.
      delaiSalut: 5000,
    },
    ALLER_ETABLISSEMENT,
    allerVolet("affect", "Répartition de service"),
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
    ALLER_EVALUATIONS,
    {
      titre: "5. Créer une évaluation",
      texte: "Cliquez « Nouvelle évaluation ».",
      cibles: ["#bNew"],
      geste: "cliquer",
      atteinte: ongletOuvert("v-new"),
      avanceAuClic: true,
    },
    {
      titre: "5. L'évaluation",
      texte:
        "Donnez un intitulé et une consigne, cochez la ou les promotions concernées, les livrables attendus et au moins un EC (ou une UE). Tout cela est nécessaire pour enregistrer. " +
        "Les UE, EC et compétences proposés sont ceux du référentiel de la promotion cochée ; s'il n'est pas encore validé, DNMAX vous le rappelle, et vous pouvez continuer. " +
        "Passez ensuite à l'étape 2, « Compétences ».",
      cibles: ["#step1"],
      // Le curseur passe de l'intitulé à la consigne, aux livrables, aux promotions, au semestre et aux EC, puis au bouton de l'étape 2.
      pointe: '#f-titre, #f-consignes, #f-livr, #f-classes, #f-sem, #row-ec, [data-go="2"]',
      aDegager: '[data-go="2"]',
      geste: "parcourir",
      atteinte: () => visible("#step2") || visible("#step3"),
      ouvrir: cliquer('[data-go="2"]'),
      celebrer: true,
    },
    {
      titre: "5. Les compétences",
      texte: "Cochez les compétences évaluées, choisies dans votre référentiel, puis passez à l'étape 3, « Formulation ».",
      cibles: ["#step2"],
      // Des cases à cocher, pas du texte : le curseur montre une case, puis le bouton de l'étape 3 une fois une compétence cochée.
      pointe: () => (caseCochee('#step2 input[type="checkbox"]') ? '[data-go="3"]' : 'input[type="checkbox"]'),
      aDegager: '[data-go="3"]',
      geste: "cliquer",
      atteinte: () => visible("#step3"),
      ouvrir: cliquer('[data-go="3"]'),
      celebrer: true,
    },
    {
      titre: "5. Lier des compétences",
      texte:
        "Les éléments colorés se déplacent. Saisissez une compétence par sa poignée ⠿ et déposez-la sur une autre ligne pour les lier : " +
        "elles partagent alors une même formulation et les mêmes livrables ; glissée à l'écart, elle se détache. " +
        "Glissez de même un livrable de la colonne de gauche sur une compétence, puis rédigez la compétence opérationnelle. " +
        "Rien d'obligatoire : cliquez « Suivant » pour continuer.",
      cibles: ["#step3"],
      geste: "glisser",
      // Compétence sur compétence, livrable sur compétence, puis rédaction ; une fois des compétences liées, seulement les deux derniers.
      enchainement: gestesFormulation,
      // Avec une seule compétence, il n'y a rien à lier.
      groupeFait: () => compter("#lignes .lg") < 2,
    },
    {
      titre: "5. Formuler et enregistrer",
      texte:
        "Glissez un livrable de la colonne de gauche sur chaque ligne, puis rédigez ce que vous attendez pour chaque compétence (la compétence opérationnelle). " +
        "Votre saisie est gardée en brouillon au fur et à mesure. Cliquez enfin « Enregistrer l'évaluation » : elle sort des brouillons et peut être distribuée.",
      cibles: ["#step3"],
      // Trois temps, selon ce qui est déjà fait : glisser un livrable, rédiger, enregistrer.
      geste: () => etapeFormulation(),
      pointe: () => ({ glisser: "#lignes .livrow", remplir: "#lignes input[data-lib]", cliquer: "#bSave3" })[etapeFormulation()],
      depuis: "#palLivr [data-dragliv]",
      // Enregistrée, l'évaluation ouvre « Mes évaluations » : la visite le fête et continue, sans faire cliquer « Suivant ».
      atteinte: ongletOuvert("v-saved"),
      celebrer: true,
    },
    ALLER_EVALUATIONS,
    {
      titre: "5. Exporter",
      texte: "Ouvrez les actions de votre évaluation.",
      cibles: ACTIONS_EVALUATION,
      geste: "cliquer",
      avanceAuClic: true,
      groupeFait: sansEvaluation,
    },
    {
      titre: "5. Choisir le format",
      texte:
        "Choisissez Word, Excel ou OpenDocument. Le document reprend les compétences avec leur code, ce que vous attendez et votre nom en en-tête.",
      cibles: FENETRE_ACTIONS,
      pointe: "[data-xk]",
      geste: "cliquer",
      fermeLaBoite: true,
      groupeFait: sansEvaluation,
    },
    {
      titre: "6. Vos préférences",
      texte: "Ouvrez « Mon compte », puis « Préférences ».",
      // Menu ouvert : c'est lui qu'on éclaire, la bulle se place dessous sans le cacher.
      cibles: ["#menu-compte:not([hidden])", "#bouton-compte"],
      pointe: () => (visible("#menu-compte") ? ".menu-compte-entree:last-child" : undefined),
      geste: "cliquer",
      atteinte: ongletOuvert("v-pref"),
      ouvrir: () => window.dnmaxPont?.ouvrirPreferences?.(),
    },
    {
      titre: "6. Apparence et vocabulaire",
      texte:
        "Thème clair ou sombre, fond et couleur du papier ; plus bas, le vocabulaire et les livrables proposés. Ces réglages valent pour cet ordinateur.",
      cibles: ["#v-pref .panel"],
      geste: "regarder",
    },
    ALLER_PARAMETRES,
    {
      titre: "6. Le module Étudiants",
      texte:
        "Pour saisir les résultats de chaque étudiant, activez ici le module Étudiants : il demande quelques précautions (information des étudiants, mot de passe plus long) " +
        "et a sa propre visite, comme le module Niveaux d'acquisition qui s'appuie sur lui.",
      texteFait: "Le module Étudiants est actif. Sa visite se lance avec « Visite guidée », juste en dessous.",
      cibles: ['#modList .mod:has([data-mod="eleves"])'],
      pointe: ".tg",
      geste: "regarder",
      objectif: (avancement) => avancement.moduleEleves,
    },
    {
      titre: "6. Les visites guidées",
      texte: "Toutes les visites se relancent ici, à tout moment.",
      cibles: ["#panneau-visites"],
      geste: "regarder",
    },
    {
      titre: "C'est prêt",
      texte:
        "Vous avez fait le tour de l'essentiel. Le module Étudiants et le module Niveaux d'acquisition ont chacun leur visite, et celle-ci se relance depuis « Paramètres », panneau « Visites guidées ».",
    },
  ],
};

const MODULE_ELEVES: Parcours = {
  titre: "Module Étudiants",
  etapes: [
    {
      titre: "Le module Étudiants",
      texte:
        "Il sert à évaluer chaque étudiant dans l'application : grille de saisie de la promotion, observations, non-rendus, un document par étudiant, et la progression de chacun. Les noms et résultats restent sur cet ordinateur.",
    },
    ALLER_PARAMETRES,
    {
      titre: "Activer le module",
      texte:
        "Activez l'interrupteur du module « Étudiants ». Une fenêtre rappelle vos obligations, propose les documents à remettre et demande de confirmer votre mot de passe.",
      texteFait: "Le module Étudiants est actif. Les documents à remettre restent disponibles dans sa carte, à côté de « Visite guidée ».",
      cibles: ['#modList .mod:has([data-mod="eleves"])'],
      pointe: ".tg",
      geste: "cliquer",
      objectif: (avancement) => avancement.moduleEleves,
    },
    ALLER_ETABLISSEMENT,
    allerVolet("promos", "Promotions"),
    {
      titre: "Inscrire les étudiants",
      texte:
        "Dans chaque promotion, collez la liste des étudiants : un étudiant par ligne, prénom puis nom. Vous pourrez corriger chaque nom ensuite.",
      texteFait: "Des étudiants sont inscrits.",
      cibles: ["#orgPane"],
      geste: "remplir",
      objectif: (avancement) => avancement.elevesInscrits > 0,
    },
    ALLER_EVALUATIONS,
    {
      titre: "Évaluer les étudiants",
      texte: "Ouvrez les actions d'une évaluation…",
      cibles: ACTIONS_EVALUATION,
      geste: "cliquer",
      avanceAuClic: true,
    },
    {
      titre: "Évaluer les étudiants",
      texte: "…puis « Évaluer les étudiants » : la grille de la promotion s'ouvre, une ligne par étudiant, avec observations et appréciation.",
      cibles: ["[data-sai]", ...FENETRE_ACTIONS],
      geste: "cliquer",
      fermeLaBoite: true,
    },
    {
      titre: "Suivre chaque étudiant",
      texte: "Dans « Progression », la vue « Étudiant » montre où en est chacun dans le semestre, comparé au reste de la promotion.",
      cibles: ["#t-prog"],
      geste: "cliquer",
    },
    {
      titre: "Données des étudiants",
      texte:
        "Dans « Paramètres », le panneau « Données des étudiants » répond aux demandes d'accès ou d'effacement et propose d'anonymiser les promotions sorties depuis plus d'un an.",
    },
  ],
};

const MODULE_NIVEAUX: Parcours = {
  titre: "Module Niveaux d'acquisition",
  etapes: [
    {
      titre: "Le module Niveaux d'acquisition",
      texte:
        "Il attribue à chaque étudiant son niveau d'acquisition sur chaque compétence : Initié en année 1, Guidé en année 2, Autonome en année 3, dès qu'il y est évalué avec une maîtrise suffisante. Ces niveaux sont facultatifs : le référentiel du diplôme ne les prévoit pas. Le module s'appuie sur le module Étudiants.",
    },
    ALLER_PARAMETRES,
    {
      titre: "Activer le module Étudiants",
      texte: "Le module Niveaux d'acquisition a besoin du module Étudiants : activez d'abord celui-ci.",
      texteFait: "Le module Étudiants est actif.",
      cibles: ['#modList .mod:has([data-mod="eleves"])'],
      pointe: ".tg",
      geste: "cliquer",
      objectif: (avancement) => avancement.moduleEleves,
    },
    {
      titre: "Activer les niveaux",
      texte: "Activez maintenant l'interrupteur « Niveaux d'acquisition ». Sa carte rappelle à partir de quel niveau de maîtrise le niveau de l'année est validé.",
      texteFait: "Le module Niveaux d'acquisition est actif.",
      cibles: ['#modList .mod:has([data-mod="dn"])'],
      pointe: ".tg",
      geste: "cliquer",
      objectif: (avancement) => avancement.moduleNiveaux,
    },
    {
      titre: "Où voir les niveaux",
      texte:
        "Les niveaux s'affichent dans « Progression », vue « Étudiant », dans les intitulés d'année et dans les exports. Ils se mettent à jour à chaque résultat saisi.",
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
