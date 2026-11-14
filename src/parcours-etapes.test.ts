// SPDX-License-Identifier: AGPL-3.0-or-later
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

  it("sans rien de fait, aucune étape n'est sautée pour cause d'objectif atteint", () => {
    for (const identifiant of PARCOURS) {
      expect(etapesRejouees(identifiant, RIEN_FAIT)).toHaveLength(PARCOURS_DEFINIS[identifiant].etapes.length);
    }
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
