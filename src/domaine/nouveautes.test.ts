// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { comparerVersions, lireRubriques, nouveautesAMontrer, nouveautesEntre, sectionVersion } from "./nouveautes";

const JOURNAL = `# Journal des modifications

## Non publié

### Ajouté

- Pas encore publié.

## 0.5.1 — 2026-11-13

### Corrigé

- La roue glisse sur **une seule** diagonale.
- Les éclats partent
  du point cliqué.

### Modifié

- « étudiant » partout ([décision 28](DECISIONS.md)).

## 0.5.0 — 2026-11-13

### Ajouté

- Échange en direct par \`code\` de 8 chiffres.

### Rubrique inconnue

- Ignorée.

## 0.4.2 — 2026-11-12

### Sécurité

- Mot de passe plus long.
`;

describe("comparerVersions", () => {
  it("compare numériquement chaque partie", () => {
    expect(comparerVersions("0.10.0", "0.9.9")).toBeGreaterThan(0);
    expect(comparerVersions("0.5.1", "0.5.1")).toBe(0);
    expect(comparerVersions("0.4.2", "0.5.0")).toBeLessThan(0);
  });
});

describe("sectionVersion", () => {
  it("rend la section d'une version sans son titre", () => {
    expect(sectionVersion(JOURNAL, "0.4.2")).toBe("### Sécurité\n\n- Mot de passe plus long.");
  });
  it("rend une chaîne vide pour une version absente", () => {
    expect(sectionVersion(JOURNAL, "9.9.9")).toBe("");
  });
});

describe("lireRubriques", () => {
  it("regroupe les entrées par rubrique dans l'ordre de lecture, texte débarrassé du Markdown", () => {
    expect(lireRubriques(sectionVersion(JOURNAL, "0.5.1"))).toEqual([
      { rubrique: "Modifié", entrees: ["« étudiant » partout (décision 28)."] },
      { rubrique: "Corrigé", entrees: ["La roue glisse sur une seule diagonale.", "Les éclats partent du point cliqué."] },
    ]);
  });
  it("ignore une rubrique inconnue et un texte sans rubrique", () => {
    expect(lireRubriques("Voir le journal des modifications : https://exemple")).toEqual([]);
    expect(lireRubriques(sectionVersion(JOURNAL, "0.5.0"))).toEqual([
      { rubrique: "Ajouté", entrees: ["Échange en direct par code de 8 chiffres."] },
    ]);
  });
});

describe("nouveautesEntre", () => {
  it("réunit les versions sautées, sans la section non publiée", () => {
    expect(nouveautesEntre(JOURNAL, "0.4.2", "0.5.1").map((groupe) => groupe.rubrique)).toEqual([
      "Ajouté",
      "Modifié",
      "Corrigé",
    ]);
  });
  it("sans version de départ, ne prend que la version installée", () => {
    expect(nouveautesEntre(JOURNAL, null, "0.4.2")).toEqual([{ rubrique: "Sécurité", entrees: ["Mot de passe plus long."] }]);
  });
});

describe("nouveautesAMontrer", () => {
  it("ne montre rien à une première installation", () => {
    expect(nouveautesAMontrer(null, "0.5.1", false)).toBeNull();
  });
  it("montre la version installée après une mise à jour depuis une version qui ne notait rien", () => {
    expect(nouveautesAMontrer(null, "0.5.1", true)).toEqual({ depuis: null });
  });
  it("montre les versions parues depuis la dernière vue", () => {
    expect(nouveautesAMontrer("0.4.2", "0.5.1", true)).toEqual({ depuis: "0.4.2" });
  });
  it("ne montre rien quand la version est déjà vue, ni après un retour en arrière", () => {
    expect(nouveautesAMontrer("0.5.1", "0.5.1", true)).toBeNull();
    expect(nouveautesAMontrer("0.6.0", "0.5.1", true)).toBeNull();
  });
});
