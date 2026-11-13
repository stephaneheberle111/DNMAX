// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import type { Bloc, DocumentImprimable } from "./document-imprimable";
import {
  champsManquants,
  composerFicheEleves,
  composerNoteEtablissement,
  ecrireDuree,
  lireSaisieEtablissement,
  type ChampsDocumentsRgpd,
} from "./documents-rgpd";

// Établissement et contact fictifs.
const CHAMPS: ChampsDocumentsRgpd = {
  nom: "Lycée des Arts appliqués",
  contactDelegue: "dpd@exemple.fr",
  anneesConservation: 1,
  date: new Date(2026, 10, 13),
  adresseCodeSource: "https://exemple.org/dnmax",
  minutesVerrouillage: 15,
};

/** Tout le texte d'un document, blocs imbriqués compris, pour y chercher une phrase. */
function texteDe(document: DocumentImprimable): string {
  const morceaux: string[] = [];
  const parcourir = (bloc: Bloc): void => {
    switch (bloc.type) {
      case "titre":
      case "sous-titre":
      case "intertitre":
      case "decoupe":
        morceaux.push(bloc.texte);
        break;
      case "contexte":
      case "paragraphe":
        morceaux.push(bloc.contenu.map((segment) => segment.texte).join(""));
        break;
      case "liste":
        for (const element of bloc.elements) {
          morceaux.push(element.map((segment) => segment.texte).join(""));
        }
        break;
      case "tableau":
        for (const ligne of bloc.lignes) {
          morceaux.push(ligne.intitule, ligne.contenu.map((segment) => segment.texte).join(""));
        }
        break;
      case "insecable":
        bloc.blocs.forEach(parcourir);
        break;
    }
  };
  document.pages.flat().forEach(parcourir);
  return morceaux.join("\n");
}

describe("ecrireDuree", () => {
  it("écrit une année en toutes lettres", () => {
    expect(ecrireDuree(1)).toBe("un an");
  });

  it("écrit plusieurs années en chiffres", () => {
    expect(ecrireDuree(3)).toBe("3 ans");
  });

  it("revient à un an pour une durée nulle ou invalide", () => {
    expect(ecrireDuree(0)).toBe("un an");
    expect(ecrireDuree(Number.NaN)).toBe("un an");
  });
});

describe("lireSaisieEtablissement", () => {
  it("lit le nom et le contact du délégué de « Mon établissement »", () => {
    expect(lireSaisieEtablissement({ nom: "Lycée", contactDpo: "dpd@exemple.fr", uai: "0000000A" })).toEqual({
      nom: "Lycée",
      contactDelegue: "dpd@exemple.fr",
    });
  });

  it("compte pour vide un champ absent ou qui n'est pas du texte", () => {
    expect(lireSaisieEtablissement({ nom: 12 })).toEqual({ nom: "", contactDelegue: "" });
  });

  it("compte pour vide un établissement absent ou illisible", () => {
    expect(lireSaisieEtablissement(undefined)).toEqual({ nom: "", contactDelegue: "" });
    expect(lireSaisieEtablissement("Lycée")).toEqual({ nom: "", contactDelegue: "" });
  });
});

describe("champsManquants", () => {
  it("ne signale rien quand l'établissement et le contact du délégué sont saisis", () => {
    expect(champsManquants({ nom: "Lycée", contactDelegue: "dpd@exemple.fr" })).toEqual([]);
  });

  it("signale le nom de l'établissement et le contact du délégué vides", () => {
    expect(champsManquants({ nom: "", contactDelegue: "" })).toEqual(["nom", "contactDelegue"]);
  });

  it("tient un champ fait seulement d'espaces pour vide", () => {
    expect(champsManquants({ nom: "Lycée", contactDelegue: " \n\t " })).toEqual(["contactDelegue"]);
  });
});

describe("composerFicheEleves", () => {
  it("s'intitule « Information aux étudiants » et propose un nom de PDF explicite", () => {
    const fiche = composerFicheEleves(CHAMPS);
    expect(fiche.pages[0]?.[0]).toEqual({ type: "titre", texte: "Information aux étudiants" });
    expect(fiche.nomFichier).toBe("DNMAX - Information aux étudiants.pdf");
  });

  it("tient sur une seule page", () => {
    expect(composerFicheEleves(CHAMPS).pages).toHaveLength(1);
  });

  it("cite l'établissement, le contact du délégué et la date en toutes lettres", () => {
    const texte = texteDe(composerFicheEleves(CHAMPS));
    expect(texte).toContain("Établissement : Lycée des Arts appliqués · 13 novembre 2026");
    expect(texte).toContain("délégué à la protection des données de l'établissement : dpd@exemple.fr.");
  });

  it("ne nomme ni enseignant ni chef d'établissement, et ne laisse aucune zone à compléter", () => {
    const texte = texteDe(composerFicheEleves(CHAMPS));
    expect(texte).not.toMatch(/Enseignant :|Transmise par|\[/);
    expect(texte).not.toContain("service ou personne à contacter");
  });

  it("comporte un accusé de réception à signer, gardé sur une page, sans mention de consentement", () => {
    const fiche = composerFicheEleves(CHAMPS);
    const accuse = fiche.pages[0]?.find((bloc) => bloc.type === "insecable");
    expect(accuse).toBeDefined();
    const texte = texteDe(fiche);
    expect(texte).toContain("Accusé de réception");
    expect(texte).toContain("Signature de l'étudiant");
    expect(texte).toContain("Signature du représentant légal, si l'étudiant est mineur");
    expect(texte).not.toContain("il ne s'agit pas d'un consentement");
  });

  it("reprend la durée de conservation réglée", () => {
    expect(texteDe(composerFicheEleves({ ...CHAMPS, anneesConservation: 2 }))).toContain("jusqu'à 2 ans après la fin");
  });

  it("ramène les espaces et retours à la ligne saisis à une seule espace", () => {
    expect(texteDe(composerFicheEleves({ ...CHAMPS, nom: "  Lycée\n  Jean-Moulin " }))).toContain(
      "Établissement : Lycée Jean-Moulin ·",
    );
  });

  it("garde tels quels les caractères spéciaux saisis, que chaque rendu échappe", () => {
    expect(texteDe(composerFicheEleves({ ...CHAMPS, nom: `Lycée <b>"A" & B</b>` }))).toContain(`Lycée <b>"A" & B</b>`);
  });

  it("refuse de composer sans nom d'établissement ou sans contact du délégué", () => {
    expect(() => composerFicheEleves({ ...CHAMPS, nom: " " })).toThrow("nom");
    expect(() => composerFicheEleves({ ...CHAMPS, contactDelegue: "" })).toThrow("contactDelegue");
  });
});

describe("composerNoteEtablissement", () => {
  it("cite la longueur du mot de passe et le délai de verrouillage du module Étudiants", () => {
    const texte = texteDe(composerNoteEtablissement({ ...CHAMPS, minutesVerrouillage: 20 }));
    expect(texte).toContain("mot de passe d'au moins 12 caractères");
    expect(texte).toContain("verrouillage après 20 minutes sans activité");
  });

  it("s'intitule « Note au chef d'établissement », sur deux pages", () => {
    const note = composerNoteEtablissement(CHAMPS);
    expect(note.pages[0]?.[0]).toEqual({ type: "titre", texte: "Note au chef d'établissement" });
    expect(note.pages).toHaveLength(2);
    expect(note.nomFichier).toBe("DNMAX - Note au chef d'établissement.pdf");
  });

  it("désigne l'établissement comme responsable et donne le contact du délégué", () => {
    const texte = texteDe(composerNoteEtablissement(CHAMPS));
    expect(texte).toContain("Lycée des Arts appliqués, représenté par son chef d'établissement.");
    expect(texte).toContain("Délégué à la protection des données\ndpd@exemple.fr");
    expect(texte).toContain("Établissement : Lycée des Arts appliqués · 13 novembre 2026");
  });

  it("ne nomme ni l'enseignant ni le chef d'établissement", () => {
    const texte = texteDe(composerNoteEtablissement(CHAMPS));
    expect(texte).not.toMatch(/Transmise par|Enseignant :|\[/);
  });

  it("donne un lien vers le code source", () => {
    const note = composerNoteEtablissement(CHAMPS);
    const segments = note.pages
      .flat()
      .flatMap((bloc) => (bloc.type === "paragraphe" ? bloc.contenu : []))
      .filter((segment) => segment.lien !== undefined);
    expect(segments).toEqual([{ texte: "https://exemple.org/dnmax", lien: "https://exemple.org/dnmax" }]);
  });

  it("indique la base légale et la durée de conservation", () => {
    const texte = texteDe(composerNoteEtablissement(CHAMPS));
    expect(texte).toContain("article 6.1.e du RGPD");
    expect(texte).toContain("Un an après la sortie de la promotion");
  });

  it("refuse de composer sans contact du délégué", () => {
    expect(() => composerNoteEtablissement({ ...CHAMPS, contactDelegue: "  " })).toThrow("contactDelegue");
  });
});
