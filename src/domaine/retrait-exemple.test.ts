// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { CLE_EVALUATIONS, CLE_PROMOTIONS } from "./echange/modele";
import { CLE_DATES_MODIFICATION } from "./echange/suivi-modifications";
import type { Entrees } from "./magasin-memoire";
import { CLE_INSTANTANE_EXEMPLE, composerInstantane, lireInstantane, retirerExemple } from "./retrait-exemple";

const CLE_ETABLISSEMENT = "dnmade.data";
const CLE_MODULES = "dnmade.modules";

function entrees(evaluations: unknown[], promotions: unknown[], autres: Record<string, string> = {}): Entrees {
  return { [CLE_EVALUATIONS]: JSON.stringify(evaluations), [CLE_PROMOTIONS]: JSON.stringify(promotions), ...autres };
}

const MIENNE = { id: "mienne", titre: "Mon évaluation", promoId: "pMienne" };
const P_MIENNE = { id: "pMienne", nom: "Ma promo", liste: [{ id: "s1", nom: "Élève réel fictif" }] };
const EXEMPLE = { id: "ex1", titre: "Exemple", promoId: "pEx" };
const P_EXEMPLE = { id: "pEx", nom: "Promo d'exemple", liste: [] };

const AVANT = entrees([MIENNE], [P_MIENNE], { [CLE_ETABLISSEMENT]: '{"vide":true}', "dnmax.identite": "{}" });
const APRES = entrees([EXEMPLE, MIENNE], [P_MIENNE, P_EXEMPLE], {
  [CLE_ETABLISSEMENT]: '{"exemple":true}',
  [CLE_MODULES]: '{"eleves":true}',
  "dnmax.identite": "{}",
});
const INSTANTANE = composerInstantane(AVANT, APRES, null);

function lire(apres: Entrees, cle: string): unknown {
  return JSON.parse(apres[cle] ?? "null");
}

describe("composerInstantane", () => {
  it("ne garde que les données de l'interface, pas celles de l'application", () => {
    expect(Object.keys(INSTANTANE.avant).sort()).toEqual([CLE_ETABLISSEMENT, CLE_EVALUATIONS, CLE_PROMOTIONS]);
  });

  it("conserve l'état d'avant d'origine quand l'exemple est rechargé", () => {
    const second = composerInstantane(APRES, APRES, INSTANTANE);
    expect(second.avant).toEqual(INSTANTANE.avant);
  });

  it("se relit après enregistrement et refuse un contenu illisible", () => {
    expect(lireInstantane(JSON.stringify(INSTANTANE))).toEqual(INSTANTANE);
    expect(lireInstantane("pas du json")).toBeNull();
    expect(lireInstantane('{"avant":{}}')).toBeNull();
    expect(lireInstantane(undefined)).toBeNull();
  });
});

describe("retirerExemple", () => {
  it("revient exactement à l'état d'avant quand rien n'a été touché depuis", () => {
    const { entrees: apres, bilan } = retirerExemple({ ...APRES, [CLE_INSTANTANE_EXEMPLE]: "x" }, INSTANTANE);
    expect(lire(apres, CLE_EVALUATIONS)).toEqual([MIENNE]);
    expect(lire(apres, CLE_PROMOTIONS)).toEqual([P_MIENNE]);
    expect(apres[CLE_ETABLISSEMENT]).toBe('{"vide":true}');
    expect(CLE_MODULES in apres).toBe(false);
    expect(CLE_INSTANTANE_EXEMPLE in apres).toBe(false);
    expect(apres["dnmax.identite"]).toBe("{}");
    expect(bilan).toEqual({ evaluationsRetirees: 1, promotionsRetirees: 1, promotionsGardees: 0, etablissementConserve: false });
  });

  it("garde les évaluations créées après l'exemple, et les résultats saisis dans les miennes", () => {
    const mienneAvecResultats = { ...MIENNE, res: { s1: { n: { a: 3 } } } };
    const nouvelle = { id: "apres", titre: "Créée ensuite", promoId: "pMienne" };
    const courantes = { ...APRES, [CLE_EVALUATIONS]: JSON.stringify([nouvelle, EXEMPLE, mienneAvecResultats]) };
    const { entrees: apres } = retirerExemple(courantes, INSTANTANE);
    expect(lire(apres, CLE_EVALUATIONS)).toEqual([nouvelle, mienneAvecResultats]);
  });

  it("retire une évaluation d'exemple même retouchée depuis", () => {
    const courantes = { ...APRES, [CLE_EVALUATIONS]: JSON.stringify([{ ...EXEMPLE, titre: "Retouchée" }, MIENNE]) };
    expect(lire(retirerExemple(courantes, INSTANTANE).entrees, CLE_EVALUATIONS)).toEqual([MIENNE]);
  });

  it("garde une promotion d'exemple à laquelle une de mes évaluations se rattache", () => {
    const rattachee = { id: "apres", titre: "Sur la promo d'exemple", promoId: "pEx" };
    const courantes = { ...APRES, [CLE_EVALUATIONS]: JSON.stringify([rattachee, EXEMPLE, MIENNE]) };
    const { entrees: apres, bilan } = retirerExemple(courantes, INSTANTANE);
    expect(lire(apres, CLE_PROMOTIONS)).toEqual([P_MIENNE, P_EXEMPLE]);
    expect(bilan).toMatchObject({ promotionsRetirees: 0, promotionsGardees: 1 });
  });

  it("garde aussi une promotion d'exemple désignée par son nom dans les classes d'une évaluation", () => {
    const rattachee = { id: "apres", classes: ["Promo d'exemple"] };
    const courantes = { ...APRES, [CLE_EVALUATIONS]: JSON.stringify([rattachee, MIENNE]) };
    expect(retirerExemple(courantes, INSTANTANE).bilan.promotionsGardees).toBe(1);
  });

  it("rend son état d'avant à une promotion que l'exemple avait modifiée", () => {
    const ecrasee = { ...P_MIENNE, liste: [{ id: "d1", nom: "Élève d'exemple" }] };
    const instantane = composerInstantane(AVANT, { ...APRES, [CLE_PROMOTIONS]: JSON.stringify([ecrasee, P_EXEMPLE]) }, null);
    const courantes = { ...APRES, [CLE_PROMOTIONS]: JSON.stringify([ecrasee, P_EXEMPLE]) };
    expect(lire(retirerExemple(courantes, instantane).entrees, CLE_PROMOTIONS)).toEqual([P_MIENNE]);
  });

  it("laisse telle quelle une promotion modifiée par l'exemple puis par moi", () => {
    const ecrasee = { ...P_MIENNE, liste: [{ id: "d1", nom: "Élève d'exemple" }] };
    const retouchee = { ...ecrasee, liste: [...ecrasee.liste, { id: "s9", nom: "Ajouté par moi" }] };
    const instantane = composerInstantane(AVANT, { ...APRES, [CLE_PROMOTIONS]: JSON.stringify([ecrasee, P_EXEMPLE]) }, null);
    const courantes = { ...APRES, [CLE_PROMOTIONS]: JSON.stringify([retouchee, P_EXEMPLE]) };
    expect(lire(retirerExemple(courantes, instantane).entrees, CLE_PROMOTIONS)).toEqual([retouchee]);
  });

  it("conserve l'établissement s'il a été modifié depuis, et le signale", () => {
    const courantes = { ...APRES, [CLE_ETABLISSEMENT]: '{"exemple":true,"modifie":true}' };
    const { entrees: apres, bilan } = retirerExemple(courantes, INSTANTANE);
    expect(apres[CLE_ETABLISSEMENT]).toBe('{"exemple":true,"modifie":true}');
    expect(bilan.etablissementConserve).toBe(true);
    expect(CLE_MODULES in apres).toBe(false);
  });

  it("retire les dates de modification des évaluations retirées", () => {
    const dates = { ex1: { le: "2026-01-01", par: "" }, mienne: { le: "2026-01-02", par: "Moi" } };
    const { entrees: apres } = retirerExemple({ ...APRES, [CLE_DATES_MODIFICATION]: JSON.stringify(dates) }, INSTANTANE);
    expect(lire(apres, CLE_DATES_MODIFICATION)).toEqual({ mienne: { le: "2026-01-02", par: "Moi" } });
  });

  it("ne retire rien quand l'exemple a déjà été retiré à la main", () => {
    const { entrees: apres, bilan } = retirerExemple({ ...AVANT, [CLE_MODULES]: '{"eleves":true}' }, INSTANTANE);
    expect(lire(apres, CLE_EVALUATIONS)).toEqual([MIENNE]);
    expect(bilan.evaluationsRetirees).toBe(0);
  });
});
