// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-apercu-document.css";
import type { DocumentImprimable } from "./domaine/document-imprimable";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";
import { enregistrerFichier } from "./enveloppe";
import { rendreDocumentHtml } from "./rendu-document-html";

/** Classe commune à l'aperçu et à l'impression : les feuilles A4 y ont la même mise en page. */
const CLASSE_FEUILLES = "document-a4";
const CLASSE_IMPRESSION = "impression-document";
const CLASSE_DOCUMENT = "document-imprimable";

/**
 * Imprime le document seul, sans l'application autour : il est posé dans la
 * page, masqué à l'écran, et la feuille de style d'impression masque tout le
 * reste. Les marges de page sont nulles, ce qui retire les en-têtes et pieds
 * de page que le navigateur y écrirait (adresse interne de l'application,
 * date) ; chaque feuille porte ses propres marges.
 *
 * Le document reste dans la page jusqu'à `afterprint` : selon les moteurs,
 * `window.print()` rend la main avant que l'impression soit composée.
 */
function imprimer(imprimable: DocumentImprimable): void {
  document.querySelector(`.${CLASSE_DOCUMENT}`)?.remove();
  const conteneur = creer("div", `${CLASSE_DOCUMENT} ${CLASSE_FEUILLES}`);
  // `rendreDocumentHtml` échappe tout le texte, saisies comprises.
  conteneur.innerHTML = rendreDocumentHtml(imprimable);
  document.body.append(conteneur);
  const racine = document.documentElement;
  const titreApplication = document.title;
  document.title = imprimable.titre;
  racine.classList.add(CLASSE_IMPRESSION);
  window.addEventListener(
    "afterprint",
    () => {
      racine.classList.remove(CLASSE_IMPRESSION);
      document.title = titreApplication;
      conteneur.remove();
    },
    { once: true },
  );
  window.print();
}

/**
 * Montre le document en feuilles A4, tel qu'il sera imprimé, avec de quoi
 * l'enregistrer en PDF ou l'imprimer. Rien ne part sans ce choix.
 */
export function montrerApercuDocument(imprimable: DocumentImprimable): void {
  const { boite, fermer } = ouvrirBoite(`Aperçu : ${imprimable.titre}`);
  boite.classList.add("apercu-document");
  const feuilles = creer("div", `apercu-feuilles ${CLASSE_FEUILLES}`);
  // `rendreDocumentHtml` échappe tout le texte, saisies comprises.
  feuilles.innerHTML = rendreDocumentHtml(imprimable);
  const etat = creer("p", "apercu-etat");
  etat.setAttribute("role", "status");

  const enregistrer = creerBouton("Enregistrer en PDF…", "btn primary", () => {
    void enregistrerPdf();
  });
  const enregistrerPdf = async (): Promise<void> => {
    enregistrer.disabled = true;
    etat.className = "apercu-etat";
    etat.textContent = "Préparation du PDF…";
    try {
      // Chargé à la demande : la bibliothèque PDF et sa police ne servent qu'ici.
      const { genererPdf } = await import("./generer-pdf");
      const octets = await genererPdf(imprimable);
      const ecrit = await enregistrerFichier(imprimable.nomFichier, octets);
      etat.textContent = ecrit ? "PDF enregistré." : "";
    } catch {
      etat.className = "apercu-etat apercu-erreur";
      etat.textContent = "Le PDF n'a pas pu être enregistré. Vous pouvez réessayer, ou l'imprimer.";
    } finally {
      enregistrer.disabled = false;
    }
  };

  const actions = creer("div", "echange-actions");
  actions.append(
    creerBouton("Fermer", "btn", fermer),
    creerBouton("Imprimer…", "btn", () => {
      imprimer(imprimable);
    }),
    enregistrer,
  );
  boite.append(feuilles, etat, actions);
  enregistrer.focus();
}
