// SPDX-License-Identifier: AGPL-3.0-or-later

/** Données fictives partagées par les tests de l'échange. Aucun nom réel. */
import type { Entrees } from "../magasin-memoire";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS, type Evaluation } from "./modele";
import type { ReferentielLocal } from "./referentiel";
import { CLE_DATES_MODIFICATION } from "./suivi-modifications";

export const EMPREINTE_VERSION = "a".repeat(64);
export const EMPREINTE_TRAVAIL = "b".repeat(64);

export const DONNEES = {
  diplomes: [{ id: "d0", nom: "DN MADE", mention: "Objet" }],
  versions: { d0: [{ id: "v1", date: "2025-09-01", note: "" }] },
  valide: { d0: "v1" },
};

/** Référentiels du poste : la version validée v1 et le référentiel de travail, de contenus différents. */
export const CATALOGUE: ReferentielLocal[] = [
  {
    diplomeId: "d0",
    diplome: "DN MADE",
    mention: "Objet",
    versionId: "",
    dateVersion: "",
    empreinte: EMPREINTE_TRAVAIL,
    enVigueur: false,
    contenu: { competences: [{ code: "C1.2", libelle: "Concevoir" }] },
  },
  {
    diplomeId: "d0",
    diplome: "DN MADE",
    mention: "Objet",
    versionId: "v1",
    dateVersion: "2025-09-01",
    empreinte: EMPREINTE_VERSION,
    enVigueur: true,
    contenu: { competences: [{ code: "C1.1", libelle: "Analyser" }] },
  },
];

export const PROMOTIONS = [{ id: "p1", nom: "DNO-2025-2028", diplomeId: "d0", refV: "", liste: [] }];

export function creerEvaluation(surcharge: Record<string, unknown> = {}): Evaluation {
  return {
    id: "eval1",
    titre: "Mobilier modulaire",
    consignes: "Présenter le projet.",
    items: [{ code: "C1.1" }],
    classes: ["DNO-2025-2028"],
    promoId: "p1",
    res: { eleve1: { n: { "C1.1": 3 } } },
    eleves: "Élève Fictif",
    suivi: { saisie: "2026-01-10" },
    ...surcharge,
  };
}

export function creerEntrees(evaluations: unknown[], dates: Record<string, unknown> = {}): Entrees {
  return {
    [CLE_EVALUATIONS]: JSON.stringify(evaluations),
    [CLE_PROMOTIONS]: JSON.stringify(PROMOTIONS),
    [CLE_DONNEES]: JSON.stringify(DONNEES),
    [CLE_DATES_MODIFICATION]: JSON.stringify(dates),
    "dnmade.prefs": '{"critLabel":"Critère"}',
  };
}
