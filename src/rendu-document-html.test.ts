// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { gras, lien, texte, type DocumentImprimable } from "./domaine/document-imprimable";
import { echapperHtml, rendreDocumentHtml } from "./rendu-document-html";

function documentDe(pages: DocumentImprimable["pages"]): DocumentImprimable {
  return { titre: "Essai", nomFichier: "essai.pdf", pages };
}

describe("echapperHtml", () => {
  it("échappe les caractères qui ont un sens en HTML", () => {
    expect(echapperHtml(`<a href="x">L'É & co</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;L&#39;É &amp; co&lt;/a&gt;");
  });

  it("laisse un texte ordinaire tel quel", () => {
    expect(echapperHtml("Lycée Jean-Moulin")).toBe("Lycée Jean-Moulin");
  });
});

describe("rendreDocumentHtml", () => {
  it("produit une feuille par page", () => {
    const html = rendreDocumentHtml(
      documentDe([[{ type: "titre", texte: "Un" }], [{ type: "paragraphe", contenu: [texte("Deux")] }]]),
    );
    expect(html).toBe('<section class="feuille"><h1>Un</h1></section><section class="feuille"><p>Deux</p></section>');
  });

  it("met en gras les segments saisis et échappe leurs caractères spéciaux", () => {
    const html = rendreDocumentHtml(
      documentDe([[{ type: "paragraphe", contenu: [texte("Établissement : "), gras(`<script>alert("x")</script> & Cie`)] }]]),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("<strong>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Cie</strong>");
  });

  it("écrit une adresse en texte, sans lien qui ferait quitter l'application", () => {
    const html = rendreDocumentHtml(documentDe([[{ type: "paragraphe", contenu: [lien("https://exemple.org/a?b=1&c=2")] }]]));
    expect(html).toContain('<span class="lien">https://exemple.org/a?b=1&amp;c=2</span>');
    expect(html).not.toContain("<a ");
  });

  it("marque les cases à remplir et les blocs insécables", () => {
    const html = rendreDocumentHtml(
      documentDe([
        [
          {
            type: "insecable",
            blocs: [{ type: "tableau", lignes: [{ intitule: "Signature", contenu: [], aRemplir: "signature" }] }],
          },
        ],
      ]),
    );
    expect(html).toContain('<div class="insecable"><table><tr class="a-remplir-signature"><th>Signature</th><td></td></tr></table></div>');
  });
});
