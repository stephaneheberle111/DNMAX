// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { PARCOURS, type Avancement, type IdentifiantParcours } from "./domaine/parcours";
import { chapitreDe, PARCOURS_DEFINIS, type Etape } from "./parcours-etapes";

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

  it("présente les étapes de « Constituer » avant d'ouvrir la validation", () => {
    const etapes = PARCOURS_DEFINIS["prise-en-main"].etapes;
    const rang = (selecteur: string): number => etapes.findIndex((etape) => etape.cibles?.includes(selecteur) === true);
    const presentation = rang("#refPane .steps");
    expect(presentation).toBeGreaterThan(rang('#refNav [data-pane="constituer"]'));
    expect(presentation).toBeLessThan(rang('#refPane .steps [data-cp="valider"]'));
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

  it("ne fait pas créer une nouvelle évaluation", () => {
    const cibles = etapesRejouees("prise-en-main", TOUT_FAIT).flatMap((etape) => etape.cibles ?? []);
    expect(cibles).not.toContain("#bNew");
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

  it("sans référentiel validé, ne clique pas « Nouvelle évaluation », que l'application refuserait", () => {
    const etapes = etapesRejouees("prise-en-main", { ...RIEN_FAIT, referentiel: true });
    expect(etapes.some((etape) => etape.avanceAuClic === true && etape.cibles?.includes("#bNew") === true)).toBe(false);
    expect(etapes.some((etape) => etape.cibles?.includes("#bNew") === true)).toBe(true);
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

  it("fait explorer le référentiel avant de le constituer, et montre comment en ajouter un", () => {
    const rang = (selecteur: string): number => etapes.findIndex((etape) => etape.cibles?.includes(selecteur) === true);
    expect(rang("#refExplore")).toBeLessThan(rang('#refNav [data-pane="constituer"]'));
    expect(rang("#bouton-echange")).toBeGreaterThan(rang('#refPane .steps [data-cp="valider"]'));
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
    expect(valider?.pointe).toBeTypeOf("function");
    expect(valider?.objectif?.({ ...RIEN_FAIT, referentiel: true })).toBe(false);
  });

  it("promène le curseur d'une étape de « Constituer » à la suivante", () => {
    expect(etapeCiblant("#refPane .steps")?.geste).toBe("parcourir");
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
    expect(etapes.find((etape) => etape.cibles?.includes("#step3") === true)?.depuis).toBe("#palLivr [data-dragliv]");
  });

  it("éclaire le menu « Mon compte » une fois ouvert, pour que la bulle ne le cache pas", () => {
    expect(etapeCiblant("#bouton-compte")?.cibles?.[0]).toBe("#menu-compte:not([hidden])");
  });
});
