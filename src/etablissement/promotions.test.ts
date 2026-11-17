// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { MODULES } from "../domaine/modules";
import { AIDE_SANS_ETUDIANTS } from "./promotions";

describe("aide des promotions sans le module Étudiants", () => {
  it("nomme le module tel qu'il apparaît dans Paramètres", () => {
    expect(AIDE_SANS_ETUDIANTS).toContain(`« ${MODULES.eleves?.nom ?? "?"} »`);
  });

  it("ne cite plus l'ancien nom du module", () => {
    expect(AIDE_SANS_ETUDIANTS).not.toContain("Étudiants et promotions");
  });
});
