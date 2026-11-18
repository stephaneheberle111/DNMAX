// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it } from "vitest";
import { etat, etatVide } from "./etat";
import { palierDeLAnnee } from "./progression";

beforeEach(() => {
  Object.assign(etat, etatVide());
});

describe("niveau d'acquisition visé pour une année", () => {
  it("prend celui du référentiel", () => {
    etat.referentiel = { meta: { niveaux: [{ annee: 2, label: "Guidé·e" }] } };
    expect(palierDeLAnnee(2)).toBe("Guidé·e");
  });

  it("prend le nom d'usage quand le référentiel n'en donne pas", () => {
    etat.referentiel = { meta: { niveaux: [] } };
    expect(palierDeLAnnee(3)).toBe("Autonome");
  });

  it("écrit « Année n » au-delà des trois années", () => {
    expect(palierDeLAnnee(4)).toBe("Année 4");
  });
});
