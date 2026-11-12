// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { composerFicheEleves, composerNoteEtablissement, ecrireDuree, echapperHtml } from "./documents-rgpd";

// Établissement et enseignant fictifs.
const CHAMPS = { etablissement: "Lycée des Arts appliqués", enseignant: "Claire Martin", anneesConservation: 1 };

describe("echapperHtml", () => {
  it("échappe les caractères qui ont un sens en HTML", () => {
    expect(echapperHtml(`<a href="x">L'É & co</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;L&#39;É &amp; co&lt;/a&gt;");
  });

  it("laisse un texte ordinaire tel quel", () => {
    expect(echapperHtml("Lycée Jean-Moulin")).toBe("Lycée Jean-Moulin");
  });
});

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

describe("composerFicheEleves", () => {
  it("préremplit l'établissement et l'enseignant", () => {
    const { html } = composerFicheEleves(CHAMPS);
    expect(html).toContain("<strong>Lycée des Arts appliqués</strong>");
    expect(html).toContain("<strong>Claire Martin</strong>");
    expect(html).not.toContain("[nom de l'établissement]");
  });

  it("comporte un accusé de réception à signer, qui n'est pas un consentement", () => {
    const { html } = composerFicheEleves(CHAMPS);
    expect(html).toContain("Accusé de réception");
    expect(html).toContain("Signature de l'étudiant");
    expect(html).toContain("Signature du représentant légal, si l'étudiant est mineur");
    expect(html).toContain("il ne s'agit pas d'un consentement");
  });

  it("laisse une zone à compléter quand un champ est vide ou blanc", () => {
    const { html } = composerFicheEleves({ ...CHAMPS, etablissement: "", enseignant: "   " });
    expect(html).toContain('<span class="a-completer">[nom de l&#39;établissement]</span>');
    expect(html).toContain('<span class="a-completer">[nom de l&#39;enseignant]</span>');
  });

  it("échappe les caractères spéciaux des champs", () => {
    const { html } = composerFicheEleves({ ...CHAMPS, etablissement: `Lycée <script>alert("x")</script> & Cie` });
    expect(html).not.toContain("<script>");
    expect(html).toContain("<strong>Lycée &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Cie</strong>");
  });

  it("reprend la durée de conservation réglée", () => {
    expect(composerFicheEleves({ ...CHAMPS, anneesConservation: 2 }).html).toContain("jusqu'à 2 ans après la fin");
  });
});

describe("composerNoteEtablissement", () => {
  it("préremplit le responsable du traitement et l'enseignant", () => {
    const { html } = composerNoteEtablissement(CHAMPS);
    expect(html).toContain("<td><strong>Lycée des Arts appliqués</strong>, représenté par son chef d'établissement.");
    expect(html).toContain("Transmise par : <strong>Claire Martin</strong>");
  });

  it("indique la base légale et la durée de conservation", () => {
    const { html } = composerNoteEtablissement(CHAMPS);
    expect(html).toContain("article 6.1.e du RGPD");
    expect(html).toContain("<td>Un an après la sortie de la promotion");
  });

  it("laisse une zone à compléter quand l'établissement n'est pas renseigné", () => {
    expect(composerNoteEtablissement({ ...CHAMPS, etablissement: "" }).html).toContain(
      '<td><span class="a-completer">[nom de l&#39;établissement]</span>, représenté',
    );
  });

  it("échappe les caractères spéciaux du nom de l'enseignant", () => {
    const { html } = composerNoteEtablissement({ ...CHAMPS, enseignant: "Zoé <b>O'Neil</b>" });
    expect(html).toContain("<strong>Zoé &lt;b&gt;O&#39;Neil&lt;/b&gt;</strong>");
  });
});
