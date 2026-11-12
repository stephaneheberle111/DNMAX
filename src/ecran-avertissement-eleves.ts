// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-avertissement-eleves.css";
import { ANNEES_CONSERVATION_ELEVES } from "./configuration";
import {
  composerFicheEleves,
  composerNoteEtablissement,
  ecrireDuree,
  type ChampsDocumentsRgpd,
  type DocumentImprimable,
} from "./domaine/documents-rgpd";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";

/** Ce que l'avertissement sait de l'enseignant et de son établissement, pour préremplir les documents. */
export type ContexteAvertissement = Pick<ChampsDocumentsRgpd, "etablissement" | "enseignant">;

const CLASSE_IMPRESSION = "impression-document";
const CLASSE_DOCUMENT = "document-imprimable";

/**
 * Imprime un document seul, sans l'application autour : il est posé dans la
 * page, masqué à l'écran, et une feuille de style d'impression masque tout le
 * reste. Imprimer la fenêtre principale évite un cadre ou une nouvelle
 * fenêtre, dont l'impression varie selon les moteurs ; le dialogue
 * d'impression du système propose l'enregistrement en PDF.
 *
 * Le document reste dans la page jusqu'à `afterprint` : selon les moteurs,
 * `window.print()` rend la main avant que l'impression soit composée.
 */
function imprimer(imprimable: DocumentImprimable): void {
  document.querySelector(`.${CLASSE_DOCUMENT}`)?.remove();
  const conteneur = creer("article", CLASSE_DOCUMENT);
  // Le HTML vient de `composerFicheEleves` ou `composerNoteEtablissement`, qui échappent les champs saisis.
  conteneur.innerHTML = imprimable.html;
  document.body.append(conteneur);
  const racine = document.documentElement;
  const titreApplication = document.title;
  // Le titre de la page est proposé comme nom du fichier PDF.
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
 * Avertit l'enseignant qui active le module Élèves : données conservées,
 * obligations, documents à remettre. Il peut imprimer ces documents puis
 * activer le module, ou renoncer.
 *
 * @returns `true` si l'enseignant confirme l'activation, `false` s'il annule
 *   (bouton « Annuler », croix, clic sur le fond ou Échap).
 */
export function confirmerActivationEleves(contexte: ContexteAvertissement): Promise<boolean> {
  const champs: ChampsDocumentsRgpd = { ...contexte, anneesConservation: ANNEES_CONSERVATION_ELEVES };
  return new Promise((resoudre) => {
    let confirme = false;
    const { boite, fermer } = ouvrirBoite("Module Élèves : données personnelles", () => {
      resoudre(confirme);
    });
    boite.classList.add("avertissement-eleves");
    boite.append(
      creer(
        "p",
        "",
        "Avec ce module, DNMAX conserve les noms de vos élèves et leurs résultats (niveaux, observations, appréciations), sur cet ordinateur seulement, chiffrés par votre mot de passe. Ce sont des données personnelles, soumises au RGPD.",
      ),
      creer("p", "avertissement-intro", "Avant de saisir vos élèves :"),
    );
    const obligations = creer("ul", "avertissement-liste");
    for (const obligation of [
      "informez-les\u00a0: remettez-leur la fiche d'information, avec son accusé de réception à signer\u00a0;",
      "prévenez votre chef d'établissement ou le délégué à la protection des données, avec la note prévue pour eux\u00a0;",
      `gardez leurs données au plus ${ecrireDuree(ANNEES_CONSERVATION_ELEVES)} après la sortie de leur promotion\u00a0: DNMAX vous le rappellera\u00a0;`,
      "une demande d'accès ou d'effacement se traite dans Paramètres > Données des élèves.",
    ]) {
      obligations.append(creer("li", "", obligation));
    }
    boite.append(
      obligations,
      creer(
        "p",
        "",
        "L'accusé de réception n'est pas un consentement : l'évaluation relève de la mission de l'établissement, les élèves en sont informés.",
      ),
    );

    const documents = creer("div", "avertissement-documents");
    documents.append(
      creerBouton("Fiche d'information des élèves (avec accusé de réception)", "btn", () => {
        imprimer(composerFicheEleves(champs));
      }),
      creerBouton("Note pour le chef d'établissement", "btn", () => {
        imprimer(composerNoteEtablissement(champs));
      }),
    );
    boite.append(
      documents,
      creer("p", "avertissement-astuce", "Pour obtenir un PDF, choisissez « Enregistrer en PDF » à l'impression."),
    );

    const actions = creer("div", "echange-actions");
    const activer = creerBouton("J'ai compris, activer le module", "btn primary", () => {
      confirme = true;
      fermer();
    });
    actions.append(creerBouton("Annuler", "btn", fermer), activer);
    boite.append(actions);
    activer.focus();
  });
}
