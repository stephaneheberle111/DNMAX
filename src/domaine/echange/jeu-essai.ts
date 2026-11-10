// SPDX-License-Identifier: AGPL-3.0-or-later

/** Données fictives partagées par les tests de l'échange. Aucun nom réel. */
import type { Entrees } from "../magasin-memoire";
import { CLE_DONNEES, CLE_EVALUATIONS, CLE_PROMOTIONS, type Evaluation } from "./modele";
import { CLE_DATES_MODIFICATION } from "./suivi-modifications";

export const REFERENTIEL_A = { ues: [{ id: "u0", nom: "UE A" }], ecs: [], blocs: [], competences: [{ code: "C1.1" }] };
export const REFERENTIEL_B = { ues: [{ id: "u0", nom: "UE A" }], ecs: [], blocs: [], competences: [{ code: "C1.2" }] };

export const DONNEES = {
  diplomes: [{ id: "d0", nom: "DN MADE", mention: "Objet" }],
  refs: { d0: REFERENTIEL_B },
  versions: { d0: [{ id: "v1", date: "2025-09-01", note: "", snap: REFERENTIEL_A }] },
  valide: { d0: "v1" },
};

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

export function creerEntrees(evaluations: unknown[], dates: Record<string, string> = {}): Entrees {
  return {
    [CLE_EVALUATIONS]: JSON.stringify(evaluations),
    [CLE_PROMOTIONS]: JSON.stringify(PROMOTIONS),
    [CLE_DONNEES]: JSON.stringify(DONNEES),
    [CLE_DATES_MODIFICATION]: JSON.stringify(dates),
    "dnmade.prefs": '{"critLabel":"Critère"}',
  };
}
