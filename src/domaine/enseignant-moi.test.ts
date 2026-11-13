// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { normaliserNomPersonne, provisionnerEnseignantMoi } from "./enseignant-moi";
import type { Identite } from "./identite";

const IDENTITE: Identite = { id: "poste-1", nom: "Hélène Durand", prenom: "Hélène", nomFamille: "Durand" };

const COLLEGUE = { id: "t1", prenom: "Marc", nomFam: "Lenoir", nom: "Marc Lenoir", discipline: "Humanités" };

describe("normaliserNomPersonne", () => {
  it("ignore les accents, la casse et les espaces superflus", () => {
    expect(normaliserNomPersonne("  HÉLÈNE   durand ")).toBe(normaliserNomPersonne("Helene Durand"));
  });
});

describe("provisionnerEnseignantMoi", () => {
  it("ajoute l'enseignant de l'installation et le marque « moi »", () => {
    expect(provisionnerEnseignantMoi({ enseignants: [COLLEGUE], moi: undefined }, IDENTITE)).toEqual({
      enseignants: [COLLEGUE, { id: "poste-1", prenom: "Hélène", nomFam: "Durand", nom: "Hélène Durand", discipline: "" }],
      moi: "poste-1",
    });
  });

  it("ajoute l'enseignant dans une liste vide", () => {
    expect(provisionnerEnseignantMoi({ enseignants: [], moi: "" }, IDENTITE)?.moi).toBe("poste-1");
  });

  it("ne change rien quand « moi » désigne déjà un enseignant présent", () => {
    expect(provisionnerEnseignantMoi({ enseignants: [COLLEGUE], moi: "t1" }, IDENTITE)).toBeNull();
  });

  it("désigne de nouveau quand « moi » pointe sur un enseignant supprimé", () => {
    expect(provisionnerEnseignantMoi({ enseignants: [COLLEGUE], moi: "disparu" }, IDENTITE)?.moi).toBe("poste-1");
  });

  it("désigne un homonyme déjà déclaré plutôt que de créer un doublon", () => {
    const homonyme = { id: "t2", prenom: "helene", nomFam: "DURAND ", nom: "helene DURAND", discipline: "Atelier" };
    expect(provisionnerEnseignantMoi({ enseignants: [COLLEGUE, homonyme], moi: undefined }, IDENTITE)).toEqual({
      enseignants: [COLLEGUE, homonyme],
      moi: "t2",
    });
  });

  it("reconnaît un homonyme enregistré avec son seul nom affiché", () => {
    const ancien = { id: "t3", nom: "Hélène  Durand" };
    expect(provisionnerEnseignantMoi({ enseignants: [ancien], moi: undefined }, IDENTITE)?.moi).toBe("t3");
  });

  it("ne change rien pour une identité sans prénom ni nom", () => {
    const sansNom: Identite = { id: "poste-1", nom: "", prenom: "", nomFamille: "" };
    expect(provisionnerEnseignantMoi({ enseignants: [], moi: undefined }, sansNom)).toBeNull();
  });

  it("ignore les éléments illisibles sans les retirer", () => {
    const resultat = provisionnerEnseignantMoi({ enseignants: [null, "texte", { nom: "Hélène Durand" }], moi: undefined }, IDENTITE);
    expect(resultat?.enseignants).toHaveLength(4);
    expect(resultat?.moi).toBe("poste-1");
  });

  it("est idempotente", () => {
    const premier = provisionnerEnseignantMoi({ enseignants: [COLLEGUE], moi: undefined }, IDENTITE);
    expect(premier).not.toBeNull();
    if (premier !== null) {
      expect(provisionnerEnseignantMoi(premier, IDENTITE)).toBeNull();
    }
  });
});
