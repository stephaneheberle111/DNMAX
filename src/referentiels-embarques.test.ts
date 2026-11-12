// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { lirePaquet } from "./domaine/echange/paquet";
import { REFERENTIELS_EMBARQUES } from "./referentiels-embarques";

describe("référentiels embarqués", () => {
  it.each(REFERENTIELS_EMBARQUES.map((referentiel) => [referentiel.mention, referentiel.texte] as const))(
    "le fichier %s est un paquet lisible qui porte ce seul référentiel, sans évaluation ni élève",
    (mention, texte) => {
      const paquet = lirePaquet(texte);
      expect(typeof paquet).not.toBe("string");
      if (typeof paquet === "string") {
        return;
      }
      expect(paquet.referentiels.map((referentiel) => `${referentiel.diplome} ${referentiel.mention}`)).toEqual([`DN MADE ${mention}`]);
      expect(paquet.evaluations).toEqual([]);
      expect(paquet.promotions).toEqual([]);
    },
  );
});
