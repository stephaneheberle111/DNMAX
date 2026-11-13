// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { moduleElevesActif, SurveillanceInactivite } from "./securite";

const DELAI_MS = 15 * 60_000;

/** Horloge simulée : le test avance le temps lui-même. */
function creerHorloge(depart = 1_000_000) {
  let maintenant = depart;
  return {
    lire: () => maintenant,
    avancer: (dureeMs: number) => {
      maintenant += dureeMs;
    },
  };
}

function creerSurveillance(exige = () => true) {
  const horloge = creerHorloge();
  return { horloge, surveillance: new SurveillanceInactivite(DELAI_MS, horloge.lire, exige) };
}

describe("moduleElevesActif", () => {
  it("reconnaît le module Étudiants coché", () => {
    expect(moduleElevesActif({ "dnmade.modules": JSON.stringify({ eleves: true }) })).toBe(true);
  });

  it("répond non quand le module est décoché", () => {
    expect(moduleElevesActif({ "dnmade.modules": JSON.stringify({ eleves: false, dn: true }) })).toBe(false);
  });

  it("répond non sans entrée des modules ou si elle est illisible", () => {
    expect(moduleElevesActif({})).toBe(false);
    expect(moduleElevesActif({ "dnmade.modules": "{pas du json" })).toBe(false);
    expect(moduleElevesActif({ "dnmade.modules": JSON.stringify({ eleves: "oui" }) })).toBe(false);
  });
});

describe("SurveillanceInactivite", () => {
  it("expire une fois le délai écoulé sans activité", () => {
    const { horloge, surveillance } = creerSurveillance();
    horloge.avancer(DELAI_MS);
    expect(surveillance.estExpiree()).toBe(true);
  });

  it("n'expire pas juste avant le délai", () => {
    const { horloge, surveillance } = creerSurveillance();
    horloge.avancer(DELAI_MS - 1);
    expect(surveillance.estExpiree()).toBe(false);
  });

  it("repart de la dernière activité", () => {
    const { horloge, surveillance } = creerSurveillance();
    horloge.avancer(DELAI_MS - 1000);
    surveillance.signalerActivite();
    horloge.avancer(DELAI_MS - 1000);
    expect(surveillance.estExpiree()).toBe(false);
    horloge.avancer(1000);
    expect(surveillance.estExpiree()).toBe(true);
  });

  it("ne relance pas le compte sur une activité arrivée après le délai (réveil de veille)", () => {
    const { horloge, surveillance } = creerSurveillance();
    horloge.avancer(2 * DELAI_MS);
    surveillance.signalerActivite();
    expect(surveillance.estExpiree()).toBe(true);
  });

  it("ne verrouille pas tant que le verrouillage n'est pas exigé", () => {
    let moduleEleves = false;
    const { horloge, surveillance } = creerSurveillance(() => moduleEleves);
    horloge.avancer(2 * DELAI_MS);
    expect(surveillance.estExpiree()).toBe(false);
    moduleEleves = true;
    expect(surveillance.estExpiree()).toBe(true);
  });

  it("compte depuis la dernière action quand le module vient d'être activé", () => {
    let moduleEleves = false;
    const { horloge, surveillance } = creerSurveillance(() => moduleEleves);
    horloge.avancer(2 * DELAI_MS);
    surveillance.signalerActivite();
    moduleEleves = true;
    expect(surveillance.estExpiree()).toBe(false);
  });

  it("recommence un délai complet après repartir", () => {
    const { horloge, surveillance } = creerSurveillance();
    horloge.avancer(DELAI_MS);
    expect(surveillance.estExpiree()).toBe(true);
    surveillance.repartir();
    expect(surveillance.estExpiree()).toBe(false);
    horloge.avancer(DELAI_MS);
    expect(surveillance.estExpiree()).toBe(true);
  });

  it("ne verrouille pas si l'horloge recule", () => {
    const { horloge, surveillance } = creerSurveillance();
    horloge.avancer(-DELAI_MS * 3);
    expect(surveillance.estExpiree()).toBe(false);
  });

  it("refuse un délai nul, négatif ou infini", () => {
    for (const delai of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new SurveillanceInactivite(delai, () => 0, () => true)).toThrow(RangeError);
    }
  });
});
