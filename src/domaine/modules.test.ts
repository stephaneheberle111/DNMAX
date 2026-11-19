// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { MODULES, appliquerDependances, entraineDautres, modulesParDefaut, noteModule, type Module } from "./modules";

describe("modulesParDefaut", () => {
  it("n'active que la base à l'installation", () => {
    expect(modulesParDefaut()).toEqual({ base: true, eleves: false, dn: false });
  });
});

describe("appliquerDependances", () => {
  it("désactive les niveaux d'acquisition sans le module Étudiants", () => {
    const actifs = { base: true, eleves: false, dn: true };
    appliquerDependances(actifs);
    expect(actifs.dn).toBe(false);
  });

  it("laisse actif un module dont le module requis est actif", () => {
    const actifs = { base: true, eleves: true, dn: true };
    appliquerDependances(actifs);
    expect(actifs.dn).toBe(true);
  });
});

describe("entraineDautres", () => {
  it("signale que désactiver Étudiants désactive aussi les niveaux d'acquisition actifs", () => {
    expect(entraineDautres("eleves", { base: true, eleves: true, dn: true })).toBe(true);
  });

  it("ne signale rien quand le module dépendant est déjà inactif", () => {
    expect(entraineDautres("eleves", { base: true, eleves: true, dn: false })).toBe(false);
  });

  it("ne signale rien pour un module dont aucun autre ne dépend", () => {
    expect(entraineDautres("dn", { base: true, eleves: true, dn: true })).toBe(false);
  });
});

describe("noteModule", () => {
  const module = (cle: string): Module => {
    const trouve = MODULES[cle];
    if (trouve === undefined) throw new Error(cle);
    return trouve;
  };
  const actifs = { base: true, eleves: false, dn: false };

  it("dit la base toujours active", () => {
    expect(noteModule(module("base"), actifs)).toEqual({ texte: "toujours actif", accent: true });
  });

  it("demande d'activer d'abord le module requis", () => {
    expect(noteModule(module("dn"), actifs)?.texte).toBe("activez d'abord le module Étudiant·es");
  });

  it("dit inactif par défaut un module facultatif disponible", () => {
    expect(noteModule(module("eleves"), actifs)?.texte).toBe("désactivé par défaut");
  });

  it("ne dit rien d'un module actif par défaut et sans contrainte", () => {
    expect(noteModule({ nom: "Essai", def: true, d: "" }, actifs)).toBeNull();
  });
});
