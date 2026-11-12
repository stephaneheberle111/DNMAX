// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-sauvegardes.css";
import { decrireSauvegarde, ecrireDateSauvegarde, ecrireTaille, type Sauvegarde } from "./domaine/sauvegardes";
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { listerSauvegardes, restaurerSauvegarde } from "./enveloppe";

const IDENTIFIANT_PANNEAU = "panneau-sauvegardes";
const IDENTIFIANT_LISTE = "liste-sauvegardes";
const IDENTIFIANT_NOMBRE = "nombre-sauvegardes";
const IDENTIFIANT_MESSAGE = "message-sauvegardes";

function paragraphesConfirmation(sauvegarde: Sauvegarde): string[] {
  const date = ecrireDateSauvegarde(sauvegarde);
  return [
    `Vos données actuelles vont être remplacées par celles du ${date}. Ce que vous avez saisi depuis n'apparaîtra plus dans DNMAX.`,
    "Rien n'est perdu pour autant : l'état actuel est d'abord mis de côté dans les sauvegardes (« État mis de côté avant la restauration… »). Vous pourrez y revenir de la même façon.",
    `DNMAX se rechargera ensuite et vous demandera le mot de passe qui était en vigueur le ${date} : celui d'aujourd'hui si vous ne l'avez pas changé depuis. Votre code de secours reste valable.`,
  ];
}

function confirmerRestauration(acces: AccesDonnees, sauvegarde: Sauvegarde, actualiserListe: () => void): void {
  const { boite, fermer } = ouvrirBoite("Restaurer une sauvegarde");
  for (const texte of paragraphesConfirmation(sauvegarde)) {
    boite.append(creer("p", "", texte));
  }
  const erreur = creer("p", "echange-erreur");
  erreur.setAttribute("role", "alert");
  erreur.hidden = true;
  const restaurer = creerBouton("Restaurer et recharger", "btn primary", () => {
    restaurer.disabled = true;
    erreur.hidden = true;
    // Ce qui attend encore d'être écrit l'est d'abord : la copie mise de côté est ainsi complète.
    acces
      .enregistrerMaintenant()
      .then(() => restaurerSauvegarde(sauvegarde.nom))
      .then(() => {
        // Les données sont verrouillées : le rechargement ramène à la demande du mot de passe.
        window.location.reload();
      })
      .catch((echec: unknown) => {
        erreur.textContent = messagePourErreur(echec);
        erreur.hidden = false;
        restaurer.disabled = false;
        // Une sauvegarde disparue (remplacée par la rotation, par exemple) ne doit plus être proposée.
        actualiserListe();
      });
  });
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Annuler", "btn ghost", fermer), restaurer);
  boite.append(erreur, actions);
}

function afficherListe(acces: AccesDonnees, liste: HTMLElement, sauvegardes: Sauvegarde[], actualiserListe: () => void): void {
  liste.replaceChildren();
  if (sauvegardes.length === 0) {
    liste.append(creer("li", "sauvegardes-vide", "Aucune sauvegarde pour l'instant : la première sera faite à la prochaine ouverture de DNMAX."));
    return;
  }
  for (const sauvegarde of sauvegardes) {
    const ligne = creer("li", "sauvegardes-ligne");
    const libelle = creer("span", "sauvegardes-libelle", decrireSauvegarde(sauvegarde));
    const taille = creer("span", "sauvegardes-taille", ecrireTaille(sauvegarde.taille));
    const bouton = creerBouton("Restaurer…", "btn ghost", () => {
      confirmerRestauration(acces, sauvegarde, actualiserListe);
    });
    ligne.append(libelle, taille, bouton);
    liste.append(ligne);
  }
}

/**
 * Rend visible le panneau « Sauvegardes » de l'onglet Paramètres et le remplit.
 * N'est appelée que dans l'enveloppe de bureau : ailleurs, le panneau reste caché.
 */
export function installerSauvegardes(acces: AccesDonnees): void {
  const panneau = document.getElementById(IDENTIFIANT_PANNEAU);
  const liste = document.getElementById(IDENTIFIANT_LISTE);
  const nombre = document.getElementById(IDENTIFIANT_NOMBRE);
  const message = document.getElementById(IDENTIFIANT_MESSAGE);
  if (panneau === null || liste === null || nombre === null || message === null) {
    return;
  }
  panneau.hidden = false;
  const actualiser = (): void => {
    listerSauvegardes()
      .then((sauvegardes) => {
        message.hidden = true;
        nombre.textContent = String(sauvegardes.length);
        afficherListe(acces, liste, sauvegardes, actualiser);
      })
      .catch((echec: unknown) => {
        message.textContent = `La liste des sauvegardes n'a pas pu être lue. ${messagePourErreur(echec)}`;
        message.className = "sauvegardes-message echange-erreur";
        message.hidden = false;
      });
  };
  actualiser();
}
