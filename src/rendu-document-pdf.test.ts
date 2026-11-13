// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { gras, lien, texte, type DocumentImprimable } from "./domaine/document-imprimable";
import { definirDocumentPdf, POLICE_PDF } from "./rendu-document-pdf";

function documentDe(pages: DocumentImprimable["pages"]): DocumentImprimable {
  return { titre: "Essai", nomFichier: "essai.pdf", pages };
}

describe("definirDocumentPdf", () => {
  it("met le document en A4, dans la police de l'application, avec son titre", () => {
    const definition = definirDocumentPdf(documentDe([[{ type: "titre", texte: "Un" }]]));
    expect(definition.pageSize).toBe("A4");
    expect(definition.defaultStyle.font).toBe(POLICE_PDF);
    expect(definition.info.title).toBe("Essai");
  });

  it("commence chaque page après la première sur une nouvelle feuille", () => {
    const definition = definirDocumentPdf(
      documentDe([[{ type: "titre", texte: "Un" }], [{ type: "titre", texte: "Deux" }]]),
    );
    expect(definition.content).toHaveLength(2);
    expect(definition.content[0]).not.toHaveProperty("pageBreak");
    expect(definition.content[1]).toHaveProperty("pageBreak", "before");
  });

  it("rend cliquable une adresse https et laisse en texte une autre adresse", () => {
    const definition = definirDocumentPdf(
      documentDe([[{ type: "paragraphe", contenu: [lien("https://exemple.org"), lien("javascript:alert(1)")] }]]),
    );
    expect(JSON.stringify(definition.content)).toContain('"link":"https://exemple.org"');
    expect(JSON.stringify(definition.content)).not.toContain('"link":"javascript');
  });

  it("met en gras les segments saisis", () => {
    const definition = definirDocumentPdf(documentDe([[{ type: "paragraphe", contenu: [texte("A "), gras("B")] }]]));
    expect(JSON.stringify(definition.content)).toContain('[{"text":"A "},{"text":"B","bold":true}]');
  });

  it("garde un bloc insécable sur une même page", () => {
    const definition = definirDocumentPdf(documentDe([[{ type: "insecable", blocs: [{ type: "intertitre", texte: "A" }] }]]));
    expect(JSON.stringify(definition.content)).toContain('"unbreakable":true');
  });
});
