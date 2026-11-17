// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { lirePaquet } from "./domaine/echange/paquet";
import { calculerEmpreinteReferentiel } from "./domaine/echange/referentiel";
import { REFERENTIELS_EMBARQUES } from "./referentiels-embarques";

describe("référentiels embarqués", () => {
  it.each(REFERENTIELS_EMBARQUES.map((referentiel) => [referentiel.mention, referentiel.texte] as const))(
    "le fichier %s est un paquet lisible qui porte ce seul référentiel, sans évaluation ni étudiant",
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

  it.each(REFERENTIELS_EMBARQUES.map((referentiel) => [referentiel.mention, referentiel.texte] as const))(
    "le fichier %s porte l'empreinte de son contenu",
    async (_mention, texte) => {
      const paquet = lirePaquet(texte);
      if (typeof paquet === "string") {
        throw new Error(paquet);
      }
      for (const referentiel of paquet.referentiels) {
        expect(await calculerEmpreinteReferentiel(referentiel.contenuLisible)).toBe(referentiel.empreinte);
      }
    },
  );
});
