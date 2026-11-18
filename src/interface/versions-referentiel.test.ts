// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide } from "./etat";
import { publierPromotionsCalendrier } from "./promotions-calendrier";
import {
  afficherMention,
  dateEnLettres,
  diplomeQuiBloque,
  libellePromotion,
  publierVersionsReferentiel,
  referentielAffiche,
  referentielAJour,
  restaurerVersion,
  validerVersion,
  versionActive,
  versionDeLEvaluationEnCours,
  versionsDe,
} from "./versions-referentiel";

const JOUR = new Date("2026-11-18T10:00:00Z");

interface Banc {
  fenetre: Record<string, unknown>;
  stockage: Map<string, string>;
  appels: string[];
  messages: string[];
}

function referentiel(nom: string): Record<string, unknown> {
  return { ues: [{ id: "u1", nom }], ecs: [], blocs: [], competences: [] };
}

/** État d'un établissement à une mention, sans version validée, et fenêtre où noter les appels au fichier historique. */
function preparer(): Banc {
  Object.assign(etat, etatVide());
  etat.donnees = {
    activeDiplome: "d1",
    diplomes: [
      { id: "d1", nom: "DN MADE", mention: "Objet", code: "DNO" },
      { id: "d2", nom: "DN MADE", mention: "Espace", code: "DNE" },
    ],
    refs: { d1: referentiel("Atelier"), d2: referentiel("Espace") },
    dico: { ues: [], ecs: [], blocs: [], competences: [] },
  };
  etat.promotions = [{ id: "p1", debut: 2025, diplomeId: "d1", eleves: "Ana\nBen" }];
  etat.evaluations = [{ id: "f1", promoId: "p1" }];
  const banc: Banc = { fenetre: {}, stockage: new Map(), appels: [], messages: [] };
  let compteur = 0;
  Object.assign(banc.fenetre, {
    newId: (prefixe: string) => `${prefixe}${String(++compteur)}`,
    persistData: () => banc.appels.push("persistData"),
    toast: (message: string) => banc.messages.push(message),
    paintRef: () => banc.appels.push("paintRef"),
    paintForm: () => banc.appels.push("paintForm"),
    paintPick: () => banc.appels.push("paintPick"),
    paintLignes: () => banc.appels.push("paintLignes"),
  });
  const ecrire = (cle: string, valeur: string): void => {
    banc.stockage.set(cle, valeur);
  };
  publierPromotionsCalendrier(banc.fenetre, ecrire);
  publierVersionsReferentiel(banc.fenetre, {
    ecrireStockage: ecrire,
    promotionValide: (_donnees, promotion) => promotion.id !== "p2",
    diplomeValide: (_donnees, diplome) => diplome === "d1",
    maintenant: () => JOUR,
  });
  return banc;
}

let banc: Banc;
beforeEach(() => {
  banc = preparer();
});

describe("versions d'une mention", () => {
  it("crée la liste des versions au besoin", () => {
    expect(versionsDe("d1")).toEqual([]);
    expect((etat.donnees.versions as Record<string, unknown>).d1).toEqual([]);
  });

  it("n'a pas de version en vigueur avant toute validation", () => {
    expect(versionActive("d1")).toBeNull();
    expect(referentielAJour("d1")).toBe(false);
  });
});

describe("validation du référentiel", () => {
  it("crée une version attestée, en vigueur, qui suit le référentiel", () => {
    validerVersion("", " Révision ");
    const version = versionActive("d1");
    expect(version).toMatchObject({ date: "2026-11-18", note: "Révision", attestation: "2026-11-18" });
    expect(referentielAJour("d1")).toBe(true);
    expect(banc.appels).toEqual(["persistData", "paintRef"]);
    expect(banc.messages).toEqual(["Référentiel validé — version du 18 novembre 2026, appliquée aux promotions de cette mention."]);
  });

  it("atteste sans la copier une version en vigueur reçue et identique", () => {
    etat.donnees.versions = { d1: [{ id: "v0", date: "2026-09-01", snap: referentiel("Atelier") }] };
    etat.donnees.valide = { d1: "v0" };
    validerVersion();
    expect(versionsDe("d1")).toHaveLength(1);
    expect(versionActive("d1")).toMatchObject({ id: "v0", attestation: "2026-11-18" });
    expect(banc.messages).toEqual(["Référentiel validé — version du 1 septembre 2026, vérifiée par vous."]);
  });

  it("laisse sur l'ancienne version les promotions et évaluations qui la suivaient", () => {
    etat.donnees.versions = { d1: [{ id: "v0", date: "2026-09-01", attestation: "2026-09-01", snap: referentiel("Ancien") }] };
    etat.donnees.valide = { d1: "v0" };
    // Sans promotion en cours, la question des promotions n'est pas posée (elle demande une fenêtre).
    etat.promotions[0] = { ...etat.promotions[0], debut: 2020 };
    validerVersion("2026-11-01");
    expect(etat.promotions[0].refV).toBe("v0");
    expect(etat.evaluations[0]?.refV).toBe("v0");
    expect(versionsDe("d1").map((version) => version.id)).toEqual(["v1", "v0"]);
    expect(JSON.parse(banc.stockage.get("dnmade.fiches") ?? "[]")).toEqual([{ id: "f1", promoId: "p1", refV: "v0" }]);
    expect(banc.messages).toEqual(["Référentiel validé — version du 1 novembre 2026."]);
  });
});

describe("version suivie et référentiel affiché", () => {
  it("affiche le référentiel de travail sans version", () => {
    etat.evaluation = { promoId: "p1" };
    expect(versionDeLEvaluationEnCours()).toBeNull();
    expect(referentielAffiche()).toHaveProperty("ues");
  });

  it("affiche la version que suit l'évaluation en cours", () => {
    etat.donnees.versions = { d1: [{ id: "v0", date: "2026-09-01", snap: referentiel("Ancien") }] };
    etat.evaluation = { promoId: "p1", refV: "v0" };
    expect(versionDeLEvaluationEnCours()).toMatchObject({ id: "v0" });
    expect(referentielAffiche()).toHaveProperty("ues");
  });

  it("revient au référentiel de travail si la version est illisible", () => {
    etat.donnees.versions = { d1: [{ id: "v0", date: "2026-09-01", snap: null }] };
    etat.evaluation = { promoId: "p1", refV: "v0" };
    expect(() => referentielAffiche()).not.toThrow();
  });
});

describe("retour à une version", () => {
  it("remet le contenu de la version et la met en vigueur", () => {
    etat.donnees.versions = { d1: [{ id: "v0", date: "2026-09-01", snap: referentiel("Ancien") }] };
    restaurerVersion("v0");
    expect(((etat.donnees.refs as Record<string, Record<string, unknown>>).d1?.ues as unknown[])[0]).toEqual({ id: "u1", nom: "Ancien" });
    expect((etat.donnees.valide as Record<string, unknown>).d1).toBe("v0");
    expect(banc.messages).toEqual(["Version du 1 septembre 2026 rétablie. Validez-la avant d'évaluer avec."]);
  });

  it("ne fait rien pour une version inconnue", () => {
    restaurerVersion("absente");
    expect(banc.appels).toEqual([]);
  });
});

describe("mention affichée", () => {
  it("passe à une autre mention et enregistre", () => {
    afficherMention("d2");
    expect(etat.donnees.activeDiplome).toBe("d2");
    expect(banc.appels).toEqual(["persistData"]);
  });

  it("ne fait rien pour la mention déjà affichée ou vide", () => {
    afficherMention("d1");
    afficherMention("");
    expect(banc.appels).toEqual([]);
  });
});

describe("évaluation bloquée", () => {
  it("n'est pas bloquée quand sa promotion a un référentiel validé", () => {
    expect(diplomeQuiBloque({ promoId: "p1" })).toBe("");
  });

  it("est bloquée par la mention affichée, non validée, sans promotion", () => {
    etat.donnees.activeDiplome = "d2";
    expect(diplomeQuiBloque({})).toBe("d2");
  });
});

describe("textes", () => {
  it("écrit une date en lettres, et rend telle quelle une date illisible", () => {
    expect(dateEnLettres("2026-09-01")).toBe("1 septembre 2026");
    expect(dateEnLettres("bientôt")).toBe("bientôt");
    expect(dateEnLettres(undefined)).toBeUndefined();
  });

  it("libelle une promotion avec son nom, son année et son année scolaire", () => {
    // Le nom court dépend du jour : seule la partie stable est vérifiée.
    expect(libellePromotion(etat.promotions[0] ?? {})).toMatch(/DNO-2025-2028 · Année \d · \d{4}-\d{4} \(\d+\)$/);
  });
});

describe("publication", () => {
  it("pose les fonctions sous leurs anciens noms", () => {
    expect(typeof banc.fenetre.computeREF).toBe("function");
    expect(typeof banc.fenetre.frDate).toBe("function");
    expect(banc.fenetre.allerValidation).toBeUndefined();
  });
});
