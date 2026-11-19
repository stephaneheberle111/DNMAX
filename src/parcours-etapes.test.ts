// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it, vi } from "vitest";
import { PARCOURS, type Avancement, type IdentifiantParcours } from "./domaine/parcours";
import { chapitreDe, PARCOURS_DEFINIS, type Etape } from "./parcours-etapes";
import { etat, type Objet } from "./interface/etat";

const ETAPES = [
  { titre: "Bienvenue" },
  { titre: "Mon établissement" },
  { titre: "1. Promotions" },
  { titre: "2. Exporter" },
  { titre: "Fin" },
];

describe("chapitreDe", () => {
  it("rattache une étape de navigation à la grande étape qu'elle prépare", () => {
    expect(chapitreDe(ETAPES, 1)).toBe(0);
  });

  it("lit le numéro d'une étape numérotée", () => {
    expect(chapitreDe(ETAPES, 3)).toBe(1);
  });

  it("ne rattache rien après la dernière étape numérotée", () => {
    expect(chapitreDe(ETAPES, 4)).toBeNull();
  });

  it("chaque grande étape de la prise en main a au moins une étape numérotée", () => {
    const parcours = PARCOURS_DEFINIS["prise-en-main"];
    const vus = new Set(parcours.etapes.map((_, index) => chapitreDe(parcours.etapes, index)));
    parcours.chapitres?.forEach((_, rang) => {
      expect(vus.has(rang)).toBe(true);
    });
  });
});

describe("prise en main, grande étape Référentiel", () => {
  it("ne mène plus au volet « Définir », abandonné", () => {
    const cibles = PARCOURS_DEFINIS["prise-en-main"].etapes.flatMap((etape) => etape.cibles ?? []);
    expect(cibles.some((cible) => cible.includes("definir"))).toBe(false);
  });

  it("mène de l'onglet « Référentiel » droit à « Constituer », sans clic de plus ni passage par Explorer", () => {
    const etapes = PARCOURS_DEFINIS["prise-en-main"].etapes;
    const onglet = etapes.find((etape) => etape.cibles?.includes("#t-ref") === true && etape.avantClic !== undefined);
    etat.ui = { ref: { pane: "explorer" } };
    // Avant que l'application traite le clic : l'onglet s'ouvre déjà sur « Constituer ».
    onglet?.avantClic?.();
    expect((etat.ui.ref as Objet).pane).toBe("constituer");
    expect(etapes.some((etape) => etape.cibles?.includes('#refNav [data-pane="constituer"]') === true)).toBe(false);
  });

  it("guide « Constituer » page par page, en passant à la suivante par la barre du haut, avec des confettis", () => {
    const etapes = PARCOURS_DEFINIS["prise-en-main"].etapes;
    const rangs = ["ecs", "blocs", "tableau", "valider"].map((page) =>
      etapes.findIndex((etape) => etape.cibles?.includes(`#refPane .steps [data-cp="${page}"]`) === true && etape.celebrer === true),
    );
    rangs.forEach((rang) => {
      expect(rang).toBeGreaterThan(0);
    });
    expect([...rangs].sort((a, b) => a - b)).toEqual(rangs);
    expect(rangs[3]).toBeLessThan(etapes.findIndex((etape) => etape.titre === "1. Valider le référentiel"));
    expect(etapes.some((etape) => `${String(etape.pointe)}${etape.aDegager ?? ""}`.includes(".btn.primary[data-cp"))).toBe(false);
  });

  it("éclaire toute la page de chaque étape de « Constituer », pour pouvoir corriger chaque ligne", () => {
    const pages = PARCOURS_DEFINIS["prise-en-main"].etapes.filter((etape) => etape.geste === "parcourir" && etape.cibles?.[0] === "#cpMain");
    expect(pages.map((page) => page.titre)).toEqual([
      "1. Unités d'enseignement",
      "1. Enseignements constitutifs",
      "1. Blocs et compétences",
      "1. Planification par semestre",
    ]);
    for (const page of pages) {
      expect(page.zone).toBeUndefined();
    }
  });

  it("fait vérifier les couleurs, le nom et les semestres de la première UE", () => {
    const page = PARCOURS_DEFINIS["prise-en-main"].etapes.find((etape) => etape.titre === "1. Unités d'enseignement");
    expect(page?.haltes).toContain('[data-row="u0"] input[type="color"]');
    expect(page?.haltes).toContain('[data-row="u0"] .sems');
    expect(page?.geste).toBe("parcourir");
  });

  it("commence par la compétence et l'EC du bas-droit de la roue, puis fait dézoomer", () => {
    const carte = PARCOURS_DEFINIS["prise-en-main"].etapes.find((etape) => etape.titre === "1. La carte du référentiel");
    // Positions à l'écran, autour du moyeu centré en (500, 500) : la roue a pu tourner. Le point du bas-droit
    // hors de la fenêtre (1 200, 1 200) ne compte pas.
    const element = (id: string, x: number, y: number) => ({
      closest: () => null,
      getAttribute: (nom: string) => (nom === "data-id" ? id : null),
      getBoundingClientRect: () => ({ left: x, top: y, width: 0, height: 0 }),
    });
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 1000 });
    vi.stubGlobal("document", {
      querySelector: () => element("moyeu", 500, 500),
      querySelectorAll: (selecteur: string) =>
        selecteur.endsWith(".dot")
          ? [element("c-haut", 500, 400), element("c-bas-droite", 570, 575), element("c-hors-cadre", 1200, 1200)]
          : [element("e-gauche", 420, 500), element("e-bas-droite", 560, 550)],
    });
    expect(typeof carte?.haltes === "function" ? carte.haltes() : carte?.haltes).toEqual([
      '#refExplore .radial .dot[data-id="c-bas-droite"]',
      '#refExplore .radial .sg[data-kind="ec"][data-id="e-bas-droite"]',
      '#refExplore [data-rz="-1"]',
    ]);
    vi.unstubAllGlobals();
    expect(carte?.geste).toBe("parcourir");
  });
});

const TOUT_FAIT: Avancement = {
  referentiel: true,
  referentielValide: true,
  promotions: 3,
  elevesInscrits: 40,
  enseignants: 4,
  repartition: true,
  evaluations: 12,
  moduleEleves: true,
  moduleNiveaux: true,
};

const RIEN_FAIT: Avancement = {
  referentiel: false,
  referentielValide: false,
  promotions: 0,
  elevesInscrits: 0,
  enseignants: 1,
  repartition: false,
  evaluations: 0,
  moduleEleves: false,
  moduleNiveaux: false,
};

/** Étapes gardées quand tout est déjà fait, hors écran déjà affiché : ce que montre une visite rejouée. */
function etapesRejouees(identifiant: IdentifiantParcours, avancement: Avancement): readonly Etape[] {
  return PARCOURS_DEFINIS[identifiant].etapes.filter((etape) => etape.groupeFait?.(avancement) !== true);
}

describe("visite rejouée quand tout est déjà fait", () => {
  it("mène encore à chaque volet de « Mon établissement », où la bulle dit ce qui est fait", () => {
    const cibles = etapesRejouees("prise-en-main", TOUT_FAIT).flatMap((etape) => etape.cibles ?? []);
    for (const volet of ["promos", "enseignants", "affect"]) {
      expect(cibles).toContain(`[data-opane="${volet}"]`);
    }
  });

  it("montre encore l'assistant d'évaluation, même avec une évaluation enregistrée", () => {
    const titres = etapesRejouees("prise-en-main", TOUT_FAIT).map((etape) => etape.titre);
    expect(titres).toContain("5. L'évaluation");
    expect(titres).toContain("5. Les compétences");
  });

  it("chaque étape au message « ici » est précédée d'une étape qui mène à son écran", () => {
    for (const identifiant of PARCOURS) {
      const etapes = etapesRejouees(identifiant, TOUT_FAIT);
      etapes.forEach((etape, rang) => {
        if (etape.texteFait?.includes(" ici") === true) {
          expect(etapes[rang - 1]?.atteinte, `${identifiant} : ${etape.titre}`).toBeDefined();
        }
      });
    }
  });

  it("sans rien de fait, les visites des modules jouent toutes leurs étapes", () => {
    for (const identifiant of ["eleves", "niveaux"] as const) {
      expect(etapesRejouees(identifiant, RIEN_FAIT)).toHaveLength(PARCOURS_DEFINIS[identifiant].etapes.length);
    }
  });

  it("sans référentiel validé, fait quand même créer une évaluation, que l'application permet désormais", () => {
    const etapes = etapesRejouees("prise-en-main", { ...RIEN_FAIT, referentiel: true });
    expect(etapes.some((etape) => etape.avanceAuClic === true && etape.cibles?.includes("#bNew") === true)).toBe(true);
    expect(etapes.some((etape) => etape.titre === "5. L'évaluation" && etape.texte.includes("pas encore validé"))).toBe(true);
  });

  it("avec un référentiel validé et sans évaluation, fait créer la première", () => {
    const etapes = etapesRejouees("prise-en-main", { ...RIEN_FAIT, referentiel: true, referentielValide: true });
    expect(etapes.some((etape) => etape.avanceAuClic === true && etape.cibles?.includes("#bNew") === true)).toBe(true);
  });

  it("sans évaluation enregistrée, ne propose pas d'en exporter une", () => {
    const cibles = etapesRejouees("prise-en-main", RIEN_FAIT).flatMap((etape) => etape.cibles ?? []);
    expect(cibles.some((cible) => cible.includes("[data-xm]"))).toBe(false);
  });
});

describe("boîte d'actions ouverte pendant la visite", () => {
  it("est refermée par « Suivant » quand l'étape suivante éclaire un onglet", () => {
    for (const identifiant of PARCOURS) {
      const etapes = PARCOURS_DEFINIS[identifiant].etapes;
      etapes.forEach((etape, rang) => {
        const dansLaBoite = etape.cibles?.some((cible) => cible.includes("dialog")) === true;
        if (dansLaBoite && rang < etapes.length - 1) {
          expect(etape.fermeLaBoite, `${identifiant} : ${etape.titre}`).toBe(true);
        }
      });
    }
  });
});

describe("prise en main exploratoire", () => {
  const etapes = PARCOURS_DEFINIS["prise-en-main"].etapes;
  const cibles = etapes.flatMap((etape) => etape.cibles ?? []);

  it("n'installe plus de référentiel : la page de bienvenue s'en charge", () => {
    expect(cibles.some((cible) => cible.includes("accueil-vide"))).toBe(false);
    expect(cibles).not.toContain(".echange-boite .echange-actions .btn.primary");
  });

  it("suit l'ordre demandé : référentiel, promotions, collègues, répartition, évaluation, réglages", () => {
    expect(PARCOURS_DEFINIS["prise-en-main"].chapitres).toEqual([
      "Référentiel",
      "Promotions",
      "Collègues",
      "Répartition",
      "Évaluation",
      "Réglages",
    ]);
  });

  it("fait constituer et valider le référentiel avant de l'explorer, et montre comment en ajouter un", () => {
    const rang = (selecteur: string): number => etapes.findIndex((etape) => etape.cibles?.includes(selecteur) === true);
    const validation = etapes.findIndex((etape) => etape.titre === "1. Valider le référentiel");
    expect(rang('#refNav [data-pane="constituer"]')).toBeLessThan(validation);
    expect(rang("#refExplore")).toBeGreaterThan(validation);
    expect(rang("#bouton-echange")).toBeGreaterThan(rang("#refExplore"));
  });

  it("mène aux préférences et au module Étudiants des Paramètres", () => {
    expect(cibles).toContain("#bouton-compte");
    expect(cibles).toContain('#modList .mod:has([data-mod="eleves"])');
  });

  it("ouvre les préférences à la place de l'enseignant, faute de zone à cliquer", () => {
    const preferences = etapes.find((etape) => etape.cibles?.includes("#bouton-compte") === true);
    expect(preferences?.ouvrir).toBeTypeOf("function");
    expect(preferences?.atteinte).toBeTypeOf("function");
  });
});

describe("prise en main, guidage fin", () => {
  const etapes = PARCOURS_DEFINIS["prise-en-main"].etapes;
  const etapeCiblant = (selecteur: string): Etape | undefined => etapes.find((etape) => etape.cibles?.includes(selecteur) === true);

  it("ne fait pas croire qu'il faut écrire pour choisir les compétences : le geste est un clic sur une case", () => {
    expect(etapeCiblant("#step2")?.geste).toBe("cliquer");
  });

  it("fait cocher l'attestation puis cliquer « Valider cette version », sans saluer avant la validation", () => {
    const valider = etapes.find((etape) => etape.titre === "1. Valider le référentiel");
    expect(valider?.geste).toBe("parcourir");
    // Sans navigateur : aucune case cochée, le curseur passe par la case puis par le bouton.
    vi.stubGlobal("document", { querySelectorAll: () => [] });
    expect(typeof valider?.haltes === "function" ? valider.haltes() : valider?.haltes).toEqual(["#cAtteste", "#cValid"]);
    vi.unstubAllGlobals();
    expect(valider?.objectif?.({ ...RIEN_FAIT, referentiel: true })).toBe(false);
  });

  it("ne montre le lien entre compétences qu'à partir de deux compétences", () => {
    const lier = etapes.find((etape) => etape.titre === "5. Lier des compétences");
    vi.stubGlobal("document", { querySelectorAll: () => [{}] });
    expect(lier?.groupeFait?.(RIEN_FAIT)).toBe(true);
    vi.stubGlobal("document", { querySelectorAll: () => [{}, {}] });
    expect(lier?.groupeFait?.(RIEN_FAIT)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("passe à la suite dès l'évaluation enregistrée, avec des confettis, sans faire recliquer « Mes évaluations »", () => {
    const rang = etapes.findIndex((etape) => etape.titre === "5. Formuler et enregistrer");
    const formuler = etapes[rang];
    expect(formuler?.celebrer).toBe(true);
    expect(formuler?.atteinte).toBeTypeOf("function");
    expect(formuler?.cibles).not.toContain("#t-saved");
    // L'étape suivante, retour à « Mes évaluations », est sautée : l'enregistrement y mène déjà.
    expect(etapes[rang + 1]?.cibles).toEqual(["#t-saved"]);
    expect(etapes[rang + 1]?.atteinte).toBeTypeOf("function");
  });

  it("laisse le temps de finir de saisir le nom d'un collègue avant de passer à la suite", () => {
    const collegues = etapes.find((etape) => etape.titre === "3. Vos collègues");
    expect(collegues?.delaiSalut).toBeGreaterThanOrEqual(4000);
  });

  it("montre, avant la formulation, compétence sur compétence, livrable sur compétence, puis la rédaction", () => {
    const rang = etapes.findIndex((etape) => etape.titre === "5. Lier des compétences");
    const lier = etapes[rang];
    vi.stubGlobal("document", { querySelector: (selecteur: string) => (selecteur.includes("data-unlink") ? null : {}), querySelectorAll: () => [{}, {}] });
    const gestes = typeof lier?.enchainement === "function" ? lier.enchainement() : lier?.enchainement;
    vi.unstubAllGlobals();
    expect(gestes?.map((mouvement) => [mouvement.geste, mouvement.depuis])).toEqual([
      ["glisser", "#lignes [data-dragcomp]"],
      ["glisser", "#palLivr [data-dragliv]"],
      ["remplir", undefined],
    ]);
    expect(rang).toBeLessThan(etapes.findIndex((etape) => etape.titre === "5. Formuler et enregistrer"));
  });

  it("ne montre plus le lien entre compétences une fois des compétences liées", () => {
    const lier = etapes.find((etape) => etape.titre === "5. Lier des compétences");
    vi.stubGlobal("document", { querySelector: () => ({}), querySelectorAll: () => [{}, {}] });
    const gestes = typeof lier?.enchainement === "function" ? lier.enchainement() : lier?.enchainement;
    vi.unstubAllGlobals();
    expect(gestes?.map((mouvement) => mouvement.depuis)).toEqual(["#palLivr [data-dragliv]", undefined]);
  });

  it("promène le curseur sur chaque page de « Constituer »", () => {
    const pages = etapes.filter((etape) => etape.haltes !== undefined && etape.cibles?.[0] === "#cpMain");
    expect(pages).toHaveLength(4);
    pages.forEach((page) => {
      expect(page.geste).toBe("parcourir");
    });
  });

  it("passe d'elle-même aux promotions une fois la boîte « Échanger » refermée", () => {
    const etape = PARCOURS_DEFINIS["prise-en-main"].etapes.find((candidate) => candidate.titre === "1. Ajouter un référentiel");
    // Les tests tournent sans navigateur : seule la boîte « Échanger » est simulée, ouverte puis refermée.
    let boiteOuverte = true;
    const boite = { hidden: false, getClientRects: () => (boiteOuverte ? [{}] : []) };
    vi.stubGlobal("document", { querySelector: (selecteur: string) => (selecteur === ".echange-boite" ? boite : null) });
    expect(etape?.atteinte?.()).toBe(false);
    boiteOuverte = false;
    expect(etape?.atteinte?.()).toBe(true);
    // Une fois la suite atteinte, la mémoire est remise à zéro pour une visite rejouée.
    expect(etape?.atteinte?.()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("dit quoi faire quand la boîte « Échanger » est ouverte, et éclaire « Fermer »", () => {
    const echanger = etapeCiblant("#bouton-echange");
    expect(echanger?.siBoite?.texte).toContain("Fermer");
    expect(echanger?.siBoite?.cibles).toContain(".echange-boite .echange-actions .btn");
  });

  it("fête le passage d'une page de l'évaluation à la suivante", () => {
    expect(etapeCiblant("#step1")?.celebrer).toBe(true);
    expect(etapeCiblant("#step2")?.celebrer).toBe(true);
  });

  it("montre le glisser-déposer d'un livrable à l'étape Formulation", () => {
    expect(etapes.find((etape) => etape.titre === "5. Formuler et enregistrer")?.depuis).toBe("#palLivr [data-dragliv]");
  });

  it("éclaire le menu « Mon compte » une fois ouvert, pour que la bulle ne le cache pas", () => {
    expect(etapeCiblant("#bouton-compte")?.cibles?.[0]).toBe("#menu-compte:not([hidden])");
  });
});
