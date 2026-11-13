// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-avertissement-eleves.css";
import { ADRESSE_CODE_SOURCE, ANNEES_CONSERVATION_ELEVES } from "./configuration";
import {
  champsManquants,
  composerFicheEleves,
  composerNoteEtablissement,
  ecrireDuree,
  type ChampManquant,
  type ChampsDocumentsRgpd,
  type SaisieEtablissement,
} from "./domaine/documents-rgpd";
import { montrerApercuDocument } from "./ecran-apercu-document";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";

/** Ce que l'avertissement sait de l'établissement, et de quoi mener l'enseignant à sa saisie. */
export interface ContexteAvertissement {
  etablissement: SaisieEtablissement;
  /** Mène à Mon établissement > Établissement, pour saisir ce qui manque aux documents. */
  allerSaisirEtablissement: () => void;
  /** Date imprimée sur les documents. */
  date: Date;
}

const LIBELLES_MANQUANTS: Readonly<Record<ChampManquant, string>> = {
  nom: "le nom de l'établissement",
  contactDelegue: "le contact du délégué à la protection des données",
};

/** « a », « a et b » : les champs à saisir, en toutes lettres. */
function enumerer(manquants: readonly ChampManquant[]): string {
  const libelles = manquants.map((champ) => LIBELLES_MANQUANTS[champ]);
  return libelles.length <= 1 ? (libelles[0] ?? "") : `${libelles.slice(0, -1).join(", ")} et ${libelles.at(-1) ?? ""}`;
}

/**
 * Avertit l'enseignant qui active le module Élèves : données conservées,
 * obligations, documents à remettre. Il peut voir ces documents, les
 * enregistrer en PDF ou les imprimer, puis activer le module, ou renoncer.
 * Sans nom d'établissement ni contact du délégué à la protection des données,
 * aucun document n'est produit : l'avertissement mène à leur saisie.
 *
 * @returns `true` si l'enseignant confirme l'activation, `false` s'il annule
 *   (bouton « Annuler », croix, clic sur le fond, Échap, ou départ vers la saisie de l'établissement).
 */
export function confirmerActivationEleves(contexte: ContexteAvertissement): Promise<boolean> {
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
      "informez-les\u00a0: remettez-leur la note d'information, avec son accusé de réception à signer\u00a0;",
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
    const manquants = champsManquants(contexte.etablissement);
    if (manquants.length > 0) {
      documents.classList.add("avertissement-manque");
      documents.append(
        creer(
          "p",
          "avertissement-manque-texte",
          `Pour produire les documents à remettre, saisissez d'abord ${enumerer(manquants)} dans Mon établissement > Établissement : les documents les citent.`,
        ),
        creerBouton("Saisir dans Mon établissement", "btn", () => {
          fermer();
          contexte.allerSaisirEtablissement();
        }),
        creer("p", "avertissement-astuce", "Le module n'est pas activé pour autant : revenez ensuite l'activer dans Paramètres."),
      );
    } else {
      const champs: ChampsDocumentsRgpd = {
        ...contexte.etablissement,
        anneesConservation: ANNEES_CONSERVATION_ELEVES,
        date: contexte.date,
        adresseCodeSource: ADRESSE_CODE_SOURCE,
      };
      documents.append(
        creerBouton("Information aux étudiants (avec accusé de réception)", "btn", () => {
          montrerApercuDocument(composerFicheEleves(champs));
        }),
        creerBouton("Note au chef d'établissement", "btn", () => {
          montrerApercuDocument(composerNoteEtablissement(champs));
        }),
        creer("p", "avertissement-astuce", "Chaque document s'ouvre d'abord en aperçu, pour l'enregistrer en PDF ou l'imprimer."),
      );
    }
    boite.append(documents);

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
