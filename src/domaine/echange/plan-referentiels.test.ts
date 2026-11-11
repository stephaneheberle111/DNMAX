// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { CATALOGUE, DONNEES, EMPREINTE_VERSION, creerEntrees, creerEvaluation } from "./jeu-essai";
import { CLE_DONNEES, CLE_EVALUATIONS, lireEvaluations } from "./modele";
import { construirePaquet, lirePaquet, type Paquet } from "./paquet";
import { appliquerPlan, calculerPlan } from "./plan";
import {
  appliquerReferentiels,
  calculerPlanReferentiels,
  rattacherAuxVersionsCreees,
  type ContexteImport,
} from "./plan-referentiels";
import type { ReferentielEchange } from "./referentiel-echange";

const MAINTENANT = new Date("2026-03-09T10:00:00.000Z");
const LISTES_VIDES = { ues: [], ecs: [], blocs: [], competences: [] };
const DICTIONNAIRE = { ...LISTES_VIDES, competences: [{ id: "c0", code: "C1.1", libelle: "Analyser" }] };
const STRUCTURE = { ...LISTES_VIDES, competences: [{ id: "c0", bloc: "1", ecs: [] }] };
const EMPREINTE_RECUE = "d".repeat(64);

function referentielRecu(surcharge: Partial<ReferentielEchange> = {}): ReferentielEchange {
  return {
    diplome: "DN MADE",
    mention: "Objet",
    empreinte: EMPREINTE_RECUE,
    dateVersion: "2026-02-01",
    structure: STRUCTURE,
    dictionnaire: DICTIONNAIRE,
    contenuLisible: { competences: [{ code: "C1.1", libelle: "Analyser un contexte" }, { code: "C1.9", libelle: "Neuve" }] },
    ...surcharge,
  };
}

function paquetAvec(referentiels: ReferentielEchange[], evaluations: Paquet["evaluations"] = []): Paquet {
  return { format: "dnmax-echange", version: 1, creeLe: "", expediteur: "Noé Baptiste", evaluations, referentiels, promotions: [] };
}

function contexte(): ContexteImport {
  let numero = 0;
  return {
    dateDuJour: "2026-03-09",
    note: "Reçu de Noé Baptiste",
    genererIdentifiant: (partie) => {
      numero += 1;
      return `${partie}-${String(numero)}`;
    },
  };
}

function entreesLocales() {
  const entrees = creerEntrees([]);
  return { ...entrees, [CLE_DONNEES]: JSON.stringify({ ...DONNEES, dico: LISTES_VIDES, refs: { d0: LISTES_VIDES } }) };
}

describe("calculerPlanReferentiels", () => {
  it("propose d'ajouter un référentiel différent et détaille les écarts avec la version en vigueur", () => {
    const plan = calculerPlanReferentiels(paquetAvec([referentielRecu()]), CATALOGUE);
    expect(plan).toMatchObject([{ action: "ajouter", diplomeId: "d0" }]);
    expect(plan[0]?.differences?.competences).toEqual({ ajoutes: ["C1.9"], retires: [], modifies: ["C1.1"] });
  });

  it("ne propose rien pour un référentiel déjà présent ici", () => {
    const plan = calculerPlanReferentiels(paquetAvec([referentielRecu({ empreinte: EMPREINTE_VERSION })]), CATALOGUE);
    expect(plan).toMatchObject([{ action: "aucune", differences: null, diplomeId: "" }]);
  });

  it("déclare impossible l'ajout quand le diplôme n'existe pas ici", () => {
    const plan = calculerPlanReferentiels(paquetAvec([referentielRecu({ mention: "Graphisme" })]), CATALOGUE);
    expect(plan).toMatchObject([{ action: "impossible", diplomeId: "" }]);
  });

  it("rend un plan vide pour un fichier sans référentiel", () => {
    expect(calculerPlanReferentiels(paquetAvec([]), CATALOGUE)).toEqual([]);
  });
});

describe("appliquerReferentiels", () => {
  it("crée une version non activée, datée et annotée", () => {
    const entrees = entreesLocales();
    const plan = calculerPlanReferentiels(paquetAvec([referentielRecu()]), CATALOGUE);
    const { entrees: apres, versionsCreees } = appliquerReferentiels(entrees, plan, new Set([plan[0]?.identifiant ?? ""]), contexte());
    const donnees = JSON.parse(apres[CLE_DONNEES] ?? "{}") as { versions: Record<string, unknown[]>; valide: unknown };
    expect(donnees.versions.d0).toHaveLength(2);
    expect(donnees.versions.d0?.[1]).toMatchObject({ id: "version-1", date: "2026-02-01", note: "Reçu de Noé Baptiste" });
    expect(donnees.valide).toEqual(DONNEES.valide);
    expect([...versionsCreees.values()]).toEqual(["version-1"]);
  });

  it("retient la date du jour pour un référentiel de travail reçu sans date", () => {
    const plan = calculerPlanReferentiels(paquetAvec([referentielRecu({ dateVersion: "" })]), CATALOGUE);
    const { entrees: apres } = appliquerReferentiels(entreesLocales(), plan, new Set([plan[0]?.identifiant ?? ""]), contexte());
    expect(apres[CLE_DONNEES]).toContain('"date":"2026-03-09"');
  });

  it("ne change rien quand la ligne n'est pas choisie, déjà présente ou impossible", () => {
    const entrees = entreesLocales();
    const paquet = paquetAvec([referentielRecu({ empreinte: EMPREINTE_VERSION }), referentielRecu({ mention: "Graphisme" }), referentielRecu()]);
    const plan = calculerPlanReferentiels(paquet, CATALOGUE);
    const choix = new Set([plan[0]?.identifiant ?? "", plan[1]?.identifiant ?? ""]);
    expect(appliquerReferentiels(entrees, plan, choix, contexte()).entrees).toBe(entrees);
  });

  it("n'ajoute qu'une fois un référentiel présent deux fois dans le fichier", () => {
    const plan = calculerPlanReferentiels(paquetAvec([referentielRecu(), referentielRecu()]), CATALOGUE);
    const { versionsCreees } = appliquerReferentiels(entreesLocales(), plan, new Set([plan[0]?.identifiant ?? ""]), contexte());
    expect(versionsCreees.size).toBe(1);
  });
});

describe("rattacherAuxVersionsCreees", () => {
  it("rattache à la version créée une évaluation construite sur le référentiel reçu", () => {
    const base = { diplome: "DN MADE", mention: "Objet", empreinte: EMPREINTE_RECUE, dateVersion: "2026-02-01" };
    const paquet = paquetAvec([referentielRecu()], [{ modele: creerEvaluation(), modifieLe: "", modifiePar: "", base, donneesEleves: null }]);
    const entrees = entreesLocales();
    const planReferentiels = calculerPlanReferentiels(paquet, CATALOGUE);
    const planEvaluations = calculerPlan(entrees, paquet, CATALOGUE);
    expect(planEvaluations[0]?.referentiel).toEqual({ etat: "different" });

    const { entrees: avecVersion, versionsCreees } = appliquerReferentiels(
      entrees,
      planReferentiels,
      new Set([planReferentiels[0]?.identifiant ?? ""]),
      contexte(),
    );
    const rattachees = rattacherAuxVersionsCreees(planEvaluations, versionsCreees);
    const apres = appliquerPlan(avecVersion, rattachees, new Set(["eval1"]), MAINTENANT);
    expect(lireEvaluations(apres[CLE_EVALUATIONS])[0]?.refV).toBe("version-1");
  });

  it("laisse intacte une évaluation construite sur un autre référentiel", () => {
    const paquet = paquetAvec([], [{ modele: creerEvaluation(), modifieLe: "", modifiePar: "", base: null, donneesEleves: null }]);
    const plan = calculerPlan(entreesLocales(), paquet, CATALOGUE);
    expect(rattacherAuxVersionsCreees(plan, new Map([["autre", "v9"]]))).toEqual(plan);
  });
});

describe("référentiels dans le fichier d'échange", () => {
  it("un fichier ne contenant que des référentiels est accepté", () => {
    const paquet = lirePaquet(JSON.stringify({ format: "dnmax-echange", version: 1, referentiels: [referentielRecu()] }));
    expect(paquet).toMatchObject({ evaluations: [], referentiels: [{ empreinte: EMPREINTE_RECUE }] });
  });

  it("un référentiel mal formé est écarté sans rejeter le reste", () => {
    const texte = JSON.stringify({
      format: "dnmax-echange",
      version: 1,
      evaluations: [],
      referentiels: [{ ...referentielRecu(), structure: "illisible" }, { diplome: 3 }, referentielRecu()],
    });
    expect(lirePaquet(texte)).toMatchObject({ referentiels: [{ empreinte: EMPREINTE_RECUE }] });
  });

  it("l'envoi d'un diplôme choisi emporte sa version en vigueur, structure et libellés", () => {
    const donnees = { ...DONNEES, dico: DICTIONNAIRE, refs: { d0: LISTES_VIDES }, versions: { d0: [{ id: "v1", date: "2025-09-01", snap: STRUCTURE }] } };
    const entrees = { ...creerEntrees([]), [CLE_DONNEES]: JSON.stringify(donnees) };
    const paquet = construirePaquet(entrees, new Set(), MAINTENANT, "Camille Ferrand", CATALOGUE, new Set(["d0"]));
    expect(paquet.referentiels).toMatchObject([
      { empreinte: EMPREINTE_VERSION, dateVersion: "2025-09-01", structure: STRUCTURE, dictionnaire: DICTIONNAIRE },
    ]);
  });

  it("un diplôme choisi mais inconnu du catalogue n'emporte rien", () => {
    const paquet = construirePaquet(creerEntrees([]), new Set(), MAINTENANT, "Camille Ferrand", CATALOGUE, new Set(["absent"]));
    expect(paquet.referentiels).toEqual([]);
  });
});
