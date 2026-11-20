// SPDX-License-Identifier: CECILL-2.1
import "./ecran-avertissement-eleves.css";
import { ADRESSE_CODE_SOURCE, DELAI_VERROUILLAGE_INACTIVITE_MS } from "./configuration";
import { refusNouveauMotDePasse, suiteApresMotDePasseActuel } from "./domaine/activation-eleves";
import { defautsRobustesse, expliquerDefauts } from "./domaine/robustesse-mot-de-passe";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES } from "./domaine/saisie-coffre";
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
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";

/** Ce que les documents à remettre citent de l'établissement, et de quoi mener l'enseignant à sa saisie. */
export interface ContexteDocumentsEleves {
  etablissement: SaisieEtablissement;
  /** Mène à Mon établissement > Établissement, pour saisir ce qui manque aux documents. */
  allerSaisirEtablissement: () => void;
  /** Date imprimée sur les documents. */
  date: Date;
  /** Durée de conservation choisie par l'établissement, en mois. */
  moisConservation: number;
}

/**
 * Le mot de passe des données, dans l'enveloppe de bureau. Il ne sort pas de
 * la boîte d'activation : il n'est ni conservé ni écrit.
 */
export interface MotDePasseModule {
  /** @throws si le mot de passe n'est pas celui des données */
  verifier: (motDePasse: string) => Promise<void>;
  /** Écrit ce qui est en attente, puis remplace le mot de passe des données. */
  changer: (actuel: string, nouveau: string) => Promise<void>;
  /** Prénom, nom, établissement… : ce que le mot de passe ne doit pas contenir. */
  motsInterdits: () => readonly string[];
}

/** Ce que l'avertissement sait de l'établissement, et le mot de passe à confirmer (`null` hors de l'enveloppe). */
export interface ContexteAvertissement extends ContexteDocumentsEleves {
  motDePasse: MotDePasseModule | null;
}

const MINUTES_VERROUILLAGE = Math.round(DELAI_VERROUILLAGE_INACTIVITE_MS / 60_000);
const LONGUEUR = String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES);

const LIBELLES_MANQUANTS: Readonly<Record<ChampManquant, string>> = {
  nom: "le nom de l'établissement",
  contactDelegue: "le contact du délégué ou de la déléguée à la protection des données",
};

/** « a », « a et b » : les champs à saisir, en toutes lettres. */
function enumerer(manquants: readonly ChampManquant[]): string {
  const libelles = manquants.map((champ) => LIBELLES_MANQUANTS[champ]);
  return libelles.length <= 1 ? (libelles[0] ?? "") : `${libelles.slice(0, -1).join(", ")} et ${libelles.at(-1) ?? ""}`;
}

/**
 * Les deux documents à remettre, chacun ouvert en aperçu ; sans nom
 * d'établissement ni contact du délégué à la protection des données, un
 * renvoi vers leur saisie à la place.
 *
 * @param fermer referme la boîte qui contient la section, avant d'aller saisir l'établissement
 * @param astuceSiManque phrase ajoutée sous le renvoi vers la saisie
 */
function creerDocuments(contexte: ContexteDocumentsEleves, fermer: () => void, astuceSiManque: string): HTMLElement {
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
    );
    if (astuceSiManque !== "") documents.append(creer("p", "avertissement-astuce", astuceSiManque));
    return documents;
  }
  const champs: ChampsDocumentsRgpd = {
    ...contexte.etablissement,
    moisConservation: contexte.moisConservation,
    date: contexte.date,
    adresseCodeSource: ADRESSE_CODE_SOURCE,
    minutesVerrouillage: MINUTES_VERROUILLAGE,
  };
  documents.append(
    creerBouton("Information aux étudiant·es (avec accusé de réception)", "btn", () => {
      montrerApercuDocument(composerFicheEleves(champs));
    }),
    creerBouton("Note à la direction de l'établissement", "btn", () => {
      montrerApercuDocument(composerNoteEtablissement(champs));
    }),
    creer("p", "avertissement-astuce", "Chaque document s'ouvre d'abord en aperçu, pour l'enregistrer en PDF ou l'imprimer."),
  );
  return documents;
}

function creerChampMotDePasse(libelle: string, completion: AutoFill): { ligne: HTMLElement; champ: HTMLInputElement } {
  const ligne = creer("label", "compte-champ", libelle);
  const champ = creer("input");
  champ.type = "password";
  champ.autocomplete = completion;
  ligne.append(champ);
  return { ligne, champ };
}

/**
 * Avertit l'enseignant qui active le module Étudiants, dans une seule boîte :
 * données conservées, obligations, documents à remettre (à voir, enregistrer
 * en PDF ou imprimer), puis confirmation du mot de passe. Si ce mot de passe
 * ne répond pas aux exigences du module (voir `domaine/activation-eleves`),
 * l'enseignant en choisit un plus solide dans la même boîte. Hors de
 * l'enveloppe, il n'y a pas de mot de passe : rien n'est demandé.
 *
 * @returns `true` si le module peut être activé (mot de passe vérifié, et changé
 *   s'il le fallait), `false` si l'enseignant renonce (bouton « Annuler », croix,
 *   clic sur le fond, Échap, ou départ vers la saisie de l'établissement).
 */
export function confirmerActivationEleves(contexte: ContexteAvertissement): Promise<boolean> {
  return new Promise((resoudre) => {
    let confirme = false;
    const { boite, fermer } = ouvrirBoite("Module Étudiant·es : données personnelles", () => {
      resoudre(confirme);
    });
    const terminer = (): void => {
      confirme = true;
      fermer();
    };
    boite.classList.add("avertissement-eleves");
    boite.append(
      creer(
        "p",
        "",
        "Avec ce module, DNMAX conserve les noms de vos étudiant·es et leurs résultats (niveaux, observations, appréciations), sur cet ordinateur seulement, chiffrés par votre mot de passe. Ce sont des données personnelles, soumises au RGPD.",
      ),
      creer("p", "avertissement-intro", "Avant de saisir vos étudiant·es :"),
    );
    const obligations = creer("ul", "avertissement-liste");
    for (const obligation of [
      "informez-les\u00a0: remettez-leur la note d'information, avec son accusé de réception à signer\u00a0;",
      "prévenez la direction de l'établissement ou le délégué ou la déléguée à la protection des données, avec la note prévue à cet effet\u00a0;",
      `gardez leurs données au plus ${ecrireDuree(contexte.moisConservation)} après la sortie de leur promotion\u00a0: DNMAX vous le rappellera\u00a0;`,
      "une demande d'accès ou d'effacement se traite dans Paramètres > Données des étudiant·es.",
    ]) {
      obligations.append(creer("li", "", obligation));
    }
    boite.append(
      obligations,
      creer(
        "p",
        "",
        "L'accusé de réception n'est pas un consentement : l'évaluation relève de la mission de l'établissement, les étudiant·es en sont informé·es.",
      ),
      creer(
        "p",
        "avertissement-securite",
        `Sécurité : avec ce module, DNMAX exige un mot de passe d'au moins ${LONGUEUR} caractères et se verrouille après ${String(MINUTES_VERROUILLAGE)} minutes sans activité (ou tout de suite, par « Mon compte » > « Verrouiller »). Chiffrez aussi le disque de l'ordinateur (BitLocker sous Windows, FileVault sur Mac, LUKS sous Linux) : c'est conseillé, pas obligatoire. Les exports Word, Excel et OpenDocument, eux, ne sont pas chiffrés.`,
      ),
      creerDocuments(
        contexte,
        fermer,
        "Le module n'est pas activé pour autant : revenez ensuite l'activer dans Paramètres. Les documents restent disponibles dans la carte du module, une fois activé.",
      ),
    );

    const motDePasse = contexte.motDePasse;
    if (motDePasse === null) {
      const actions = creer("div", "echange-actions");
      const activer = creerBouton("J'ai compris, activer le module", "btn primary", terminer);
      actions.append(creerBouton("Annuler", "btn", fermer), activer);
      boite.append(actions);
      activer.focus();
      return;
    }

    const formulaire = creer("form", "compte-formulaire avertissement-mot-de-passe");
    const message = creer("p", "echange-erreur");
    message.setAttribute("role", "alert");
    message.hidden = true;
    const dire = (texte: string): void => {
      message.textContent = texte;
      message.hidden = false;
    };
    const valider = creer("button", "btn primary", "J'ai compris, activer le module");
    valider.type = "submit";
    const actions = creer("div", "echange-actions");
    actions.append(creerBouton("Annuler", "btn", fermer), valider);

    const actuel = creerChampMotDePasse("Votre mot de passe actuel", "current-password");
    const nouveau = creerChampMotDePasse("Nouveau mot de passe", "new-password");
    const confirmation = creerChampMotDePasse("Nouveau mot de passe, une seconde fois", "new-password");
    /** Vrai une fois l'ancien mot de passe vérifié et jugé trop faible : place au choix du nouveau. */
    let choixDuNouveau = false;

    const montrerChoixDuNouveau = (): void => {
      choixDuNouveau = true;
      formulaire.replaceChildren(
        creer(
          "p",
          "avertissement-intro",
          `Avec le module Étudiant·es, il faut un mot de passe plus solide. ${expliquerDefauts(defautsRobustesse(actuel.champ.value, motDePasse.motsInterdits()))} Une courte phrase avec un chiffre convient très bien. Votre code de secours reste le même.`,
        ),
        nouveau.ligne,
        confirmation.ligne,
        message,
        actions,
      );
      message.hidden = true;
      valider.textContent = "Changer le mot de passe et activer";
      nouveau.champ.focus();
    };

    const etape = async (): Promise<void> => {
      if (!choixDuNouveau) {
        await motDePasse.verifier(actuel.champ.value);
        if (suiteApresMotDePasseActuel(actuel.champ.value, motDePasse.motsInterdits()) === "activer") {
          terminer();
        } else {
          montrerChoixDuNouveau();
        }
        return;
      }
      const refus = refusNouveauMotDePasse(nouveau.champ.value, confirmation.champ.value, motDePasse.motsInterdits());
      if (refus !== null) {
        dire(refus);
        return;
      }
      await motDePasse.changer(actuel.champ.value, nouveau.champ.value);
      terminer();
    };

    formulaire.addEventListener("submit", (evenement) => {
      evenement.preventDefault();
      if (valider.disabled) {
        return;
      }
      valider.disabled = true;
      message.hidden = true;
      etape()
        .catch((erreur: unknown) => {
          dire(messagePourErreur(erreur));
        })
        .finally(() => {
          valider.disabled = false;
        });
    });

    formulaire.append(
      creer("p", "avertissement-intro", "Pour activer le module, confirmez votre mot de passe :"),
      actuel.ligne,
      message,
      actions,
    );
    boite.append(formulaire);
    actuel.champ.focus();
  });
}

/**
 * Rouvre les documents à remettre une fois le module Étudiants activé,
 * depuis sa carte dans Paramètres > Modules.
 */
export function montrerDocumentsEleves(contexte: ContexteDocumentsEleves): void {
  const { boite, fermer } = ouvrirBoite("Module Étudiant·es : documents à remettre");
  boite.classList.add("avertissement-eleves");
  const actions = creer("div", "echange-actions");
  const bouton = creerBouton("Fermer", "btn primary", fermer);
  actions.append(bouton);
  boite.append(
    creer(
      "p",
      "",
      "La note d'information, avec son accusé de réception, se remet à chaque étudiant·e ; la note à la direction de l'établissement, ou au délégué ou à la déléguée à la protection des données.",
    ),
    creerDocuments(contexte, fermer, ""),
    actions,
  );
  bouton.focus();
}
