// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { ADRESSE_CODE_SOURCE } from "./configuration";
import { composerFicheEleves, composerNoteEtablissement, type ChampsDocumentsRgpd } from "./domaine/documents-rgpd";
import { genererPdf } from "./generer-pdf";

const CHAMPS: ChampsDocumentsRgpd = {
  nom: "Lycée des Arts appliqués",
  contactDelegue: "dpd@exemple.fr",
  anneesConservation: 1,
  date: new Date(2026, 10, 13),
  adresseCodeSource: ADRESSE_CODE_SOURCE,
  minutesVerrouillage: 15,
};

/** Le PDF en texte brut, pour y compter les pages et chercher les liens. */
function lirePdf(octets: Uint8Array): string {
  return new TextDecoder("latin1").decode(octets);
}

function nombreDePages(pdf: string): number {
  return (pdf.match(/\/Type \/Page\b/g) ?? []).length;
}

describe("genererPdf", () => {
  it("produit un PDF d'une page pour la fiche des étudiants", async () => {
    const pdf = lirePdf(await genererPdf(composerFicheEleves(CHAMPS)));
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(nombreDePages(pdf)).toBe(1);
  });

  it("produit un PDF de deux pages pour la note, avec le lien vers le code source", async () => {
    const pdf = lirePdf(await genererPdf(composerNoteEtablissement(CHAMPS)));
    expect(nombreDePages(pdf)).toBe(2);
    expect(pdf).toContain(`/URI (${ADRESSE_CODE_SOURCE})`);
  });
});
