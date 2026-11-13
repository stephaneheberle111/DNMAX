// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-avertissement-eleves.css";
import {
  LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES,
  estAssezLong,
  verifierNouveauMotDePasse,
} from "./domaine/saisie-coffre";
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";
import { changerMotDePasse, verifierMotDePasse } from "./enveloppe";

const LONGUEUR = String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES);

function creerChampMotDePasse(libelle: string, completion: AutoFill): { ligne: HTMLElement; champ: HTMLInputElement } {
  const ligne = creer("label", "compte-champ", libelle);
  const champ = creer("input");
  champ.type = "password";
  champ.autocomplete = completion;
  ligne.append(champ);
  return { ligne, champ };
}

/**
 * Dernière étape de l'activation du module Étudiants : l'enseignant confirme son
 * mot de passe et, s'il compte moins de `LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES`
 * caractères, en choisit un plus long. Le mot de passe ne sort pas de cette
 * boîte : il n'est ni conservé ni écrit.
 *
 * @param enregistrerMaintenant écrit ce qui est en attente, avant que le
 *   changement de mot de passe ne réécrive le fichier des données
 * @returns `true` si le mot de passe convient (vérifié, et changé s'il le
 *   fallait), `false` si l'enseignant renonce
 */
export function confirmerMotDePasseEleves(enregistrerMaintenant: () => Promise<void>): Promise<boolean> {
  return new Promise((resoudre) => {
    let confirme = false;
    const { boite, fermer } = ouvrirBoite("Module Étudiants : votre mot de passe", () => {
      resoudre(confirme);
    });
    boite.classList.add("mot-de-passe-eleves");
    const contenu = creer("form", "compte-formulaire");
    const message = creer("p", "echange-erreur");
    message.setAttribute("role", "alert");
    message.hidden = true;
    const dire = (texte: string): void => {
      message.textContent = texte;
      message.hidden = false;
    };
    const valider = creer("button", "btn primary", "Continuer");
    valider.type = "submit";
    const actions = creer("div", "echange-actions");
    actions.append(creerBouton("Annuler", "btn", fermer), valider);

    const actuel = creerChampMotDePasse("Mot de passe actuel", "current-password");
    const nouveau = creerChampMotDePasse(`Nouveau mot de passe (${LONGUEUR} caractères au moins)`, "new-password");
    const confirmation = creerChampMotDePasse("Nouveau mot de passe, une seconde fois", "new-password");
    /** Vrai une fois l'ancien mot de passe vérifié et jugé trop court : place au choix du nouveau. */
    let choixDuNouveau = false;

    const montrerChoixDuNouveau = (): void => {
      choixDuNouveau = true;
      contenu.replaceChildren(
        creer(
          "p",
          "",
          `Votre mot de passe compte moins de ${LONGUEUR} caractères. Choisissez-en un plus long : une courte phrase facile à retenir convient très bien. Votre code de secours reste le même.`,
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

    const terminer = (): void => {
      confirme = true;
      fermer();
    };

    const etape = async (): Promise<void> => {
      if (!choixDuNouveau) {
        await verifierMotDePasse(actuel.champ.value);
        if (estAssezLong(actuel.champ.value, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)) {
          terminer();
        } else {
          montrerChoixDuNouveau();
        }
        return;
      }
      const defaut = verifierNouveauMotDePasse(nouveau.champ.value, confirmation.champ.value, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES);
      if (defaut !== null) {
        dire(
          defaut === "trop-court"
            ? `Le nouveau mot de passe doit compter au moins ${LONGUEUR} caractères.`
            : "Les deux saisies du nouveau mot de passe ne sont pas identiques.",
        );
        return;
      }
      await enregistrerMaintenant();
      await changerMotDePasse(actuel.champ.value, nouveau.champ.value);
      terminer();
    };

    contenu.addEventListener("submit", (evenement) => {
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

    contenu.append(
      creer(
        "p",
        "",
        `Avec le module Étudiants, DNMAX exige un mot de passe de ${LONGUEUR} caractères au moins et se verrouille après une période sans activité. Confirmez d'abord votre mot de passe.`,
      ),
      actuel.ligne,
      message,
      actions,
    );
    boite.append(contenu);
    actuel.champ.focus();
  });
}
