// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Bloc, Contenu, DocumentImprimable, LigneTableau } from "./domaine/document-imprimable";

const ENTITES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Échappe un texte pour l'insérer dans du HTML, contenu ou valeur d'attribut. */
export function echapperHtml(valeur: string): string {
  return valeur.replace(/[&<>"']/g, (caractere) => ENTITES[caractere] ?? caractere);
}

/**
 * Les adresses restent du texte : sur papier un lien ne sert à rien, et dans
 * l'aperçu un clic ferait quitter l'application à la vue web.
 */
function rendreContenu(contenu: Contenu): string {
  return contenu
    .map((segment) => {
      const echappe = echapperHtml(segment.texte);
      if (segment.lien !== undefined) {
        return `<span class="lien">${echappe}</span>`;
      }
      return segment.gras === true ? `<strong>${echappe}</strong>` : echappe;
    })
    .join("");
}

function rendreLigne(ligne: LigneTableau): string {
  const classe = ligne.aRemplir === undefined ? "" : ` class="a-remplir-${ligne.aRemplir}"`;
  return `<tr${classe}><th>${echapperHtml(ligne.intitule)}</th><td>${rendreContenu(ligne.contenu)}</td></tr>`;
}

function rendreBloc(bloc: Bloc): string {
  switch (bloc.type) {
    case "titre":
      return `<h1>${echapperHtml(bloc.texte)}</h1>`;
    case "sous-titre":
      return `<p class="sous-titre">${echapperHtml(bloc.texte)}</p>`;
    case "contexte":
      return `<p class="contexte">${rendreContenu(bloc.contenu)}</p>`;
    case "paragraphe":
      return `<p>${rendreContenu(bloc.contenu)}</p>`;
    case "intertitre":
      return `<h2>${echapperHtml(bloc.texte)}</h2>`;
    case "liste":
      return `<ul>${bloc.elements.map((element) => `<li>${rendreContenu(element)}</li>`).join("")}</ul>`;
    case "tableau":
      return `<table>${bloc.lignes.map(rendreLigne).join("")}</table>`;
    case "decoupe":
      return `<p class="decoupe">${echapperHtml(bloc.texte)}</p>`;
    case "insecable":
      return `<div class="insecable">${bloc.blocs.map(rendreBloc).join("")}</div>`;
  }
}

/** Une feuille A4 (`section.feuille`) par page du document ; tout texte est échappé. */
export function rendreDocumentHtml(document: DocumentImprimable): string {
  return document.pages
    .map((page) => `<section class="feuille">${page.map(rendreBloc).join("")}</section>`)
    .join("");
}
