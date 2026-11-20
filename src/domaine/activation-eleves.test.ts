// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { refusChangementMotDePasse, refusNouveauMotDePasse, suiteApresMotDePasseActuel } from "./activation-eleves";

const contexte = ["Camille", "Durand", "Lycée Jean-Moulin"];

describe("suiteApresMotDePasseActuel", () => {
  it("active le module quand le mot de passe actuel répond déjà aux exigences", () => {
    expect(suiteApresMotDePasseActuel("Le chat dort 3 fois", contexte)).toBe("activer");
  });

  it("fait choisir un nouveau mot de passe quand l'actuel est trop faible", () => {
    expect(suiteApresMotDePasseActuel("motdepasse", contexte)).toBe("choisir-nouveau");
  });

  it("fait choisir un nouveau mot de passe quand l'actuel contient le nom de l'enseignant", () => {
    expect(suiteApresMotDePasseActuel("Durand!x9Kpq", contexte)).toBe("choisir-nouveau");
  });
});

describe("refusNouveauMotDePasse", () => {
  it("accepte un nouveau mot de passe solide, saisi deux fois à l'identique", () => {
    expect(refusNouveauMotDePasse("Le chat dort 3 fois", "Le chat dort 3 fois", contexte)).toBeNull();
  });

  it("refuse un nouveau mot de passe de moins de douze caractères, en disant le minimum", () => {
    expect(refusNouveauMotDePasse("Ab1!xyz", "Ab1!xyz", contexte)).toBe("Le nouveau mot de passe doit compter au moins 12 caractères.");
  });

  it("refuse deux saisies différentes", () => {
    expect(refusNouveauMotDePasse("Le chat dort 3 fois", "Le chat dort 4 fois", contexte)).toBe(
      "Les deux saisies du nouveau mot de passe ne sont pas identiques.",
    );
  });

  it("explique ce qui manque à un mot de passe assez long mais faible", () => {
    expect(refusNouveauMotDePasse("toutenminuscules", "toutenminuscules", contexte)).toMatch(/^Il faut : /);
  });

  it("compte les caractères et non les unités de codage : douze émojis suffisent en longueur", () => {
    const emojis = "🙂".repeat(12);
    expect(refusNouveauMotDePasse(emojis, emojis, contexte)).not.toContain("au moins 12 caractères");
  });
});

describe("refusChangementMotDePasse", () => {
  it("sans le module Étudiant·es, n'exige que huit caractères et deux saisies identiques", () => {
    expect(refusChangementMotDePasse("motdepasse", "motdepasse", false, contexte)).toBeNull();
    expect(refusChangementMotDePasse("court", "court", false, contexte)).toBe("Le nouveau mot de passe doit compter au moins 8 caractères.");
    expect(refusChangementMotDePasse("motdepasse", "motdepassf", false, contexte)).toBe("Les deux saisies du nouveau mot de passe ne sont pas identiques.");
  });

  it("avec le module, applique toutes les règles de l'activation : un mot de passe long mais faible est refusé", () => {
    expect(refusChangementMotDePasse("motdepassemotdepasse", "motdepassemotdepasse", true, contexte)).not.toBeNull();
    expect(refusChangementMotDePasse("Ab1!xyz", "Ab1!xyz", true, contexte)).toBe("Le nouveau mot de passe doit compter au moins 12 caractères.");
  });

  it("avec le module, accepte un mot de passe solide", () => {
    expect(refusChangementMotDePasse("Le chat dort 3 fois", "Le chat dort 3 fois", true, contexte)).toBeNull();
  });

  it("avec le module, rend le même verdict que l'activation", () => {
    for (const motDePasse of ["motdepasse", "Camille Durand 2026", "azertyuiop123", "Le chat dort 3 fois"]) {
      expect(refusChangementMotDePasse(motDePasse, motDePasse, true, contexte)).toBe(refusNouveauMotDePasse(motDePasse, motDePasse, contexte));
    }
  });
});
