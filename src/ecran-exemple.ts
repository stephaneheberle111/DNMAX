// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CLE_INSTANTANE_EXEMPLE,
  composerInstantane,
  lireInstantane,
  retirerExemple,
  type BilanRetrait,
} from "./domaine/retrait-exemple";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { messagePourErreur } from "./ecran-coffre";

/** Boutons de l'interface historique qui chargent l'exemple. */
const SELECTEUR_BOUTONS_EXEMPLE = "#bDemo, #bDemo2";
/** Boutons à côté desquels « Retirer l'exemple » est proposé. */
const IDENTIFIANTS_VOISINS = ["bNew", "bDemo"];
const CLASSE_BOUTON_RETRAIT = "retrait-exemple";
const SELECTEUR_ENCART_ACCUEIL = ".accueil-vide";

function decrireBilan(bilan: BilanRetrait): string[] {
  const phrases = [
    `${String(bilan.evaluationsRetirees)} évaluation(s) d'exemple et ${String(bilan.promotionsRetirees)} promotion(s) d'exemple seront retirées.`,
    "Tout ce que vous avez créé vous-même est conservé.",
  ];
  if (bilan.promotionsGardees > 0) {
    phrases.push(
      `${String(bilan.promotionsGardees)} promotion(s) d'exemple sont gardées, car vos évaluations s'y rattachent.`,
    );
  }
  phrases.push(
    bilan.etablissementConserve
      ? "Vous avez modifié l'établissement ou le référentiel depuis : ceux de l'exemple restent en place, à ajuster à la main."
      : "L'établissement et le référentiel reviennent à leur état d'avant l'exemple.",
  );
  return phrases;
}

function demanderRetrait(acces: AccesDonnees): void {
  const entrees = acces.lireEntrees();
  const instantane = lireInstantane(entrees[CLE_INSTANTANE_EXEMPLE]);
  if (instantane === null) {
    return;
  }
  const { entrees: sansExemple, bilan } = retirerExemple(entrees, instantane);
  const { boite, fermer } = ouvrirBoite("Retirer l'exemple");
  for (const phrase of decrireBilan(bilan)) {
    boite.append(creer("p", "", phrase));
  }
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const retirer = creerBouton("Retirer l'exemple", "btn primary", () => {
    retirer.disabled = true;
    acces.remplacerEntrees(sansExemple).catch((erreurRetrait: unknown) => {
      erreur.textContent = messagePourErreur(erreurRetrait);
      erreur.hidden = false;
      retirer.disabled = false;
    });
  });
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Annuler", "btn ghost", fermer), retirer);
  boite.append(erreur, actions);
}

/** Affiche ou retire les boutons « Retirer l'exemple », selon qu'un exemple est chargé. */
function actualiserBoutons(acces: AccesDonnees): void {
  const exempleCharge = lireInstantane(acces.lireEntrees()[CLE_INSTANTANE_EXEMPLE]) !== null;
  document.querySelectorAll(`.${CLASSE_BOUTON_RETRAIT}`).forEach((bouton) => {
    bouton.remove();
  });
  if (!exempleCharge) {
    return;
  }
  for (const identifiant of IDENTIFIANTS_VOISINS) {
    const bouton = creerBouton("Retirer l'exemple", `btn ghost ${CLASSE_BOUTON_RETRAIT}`, () => {
      demanderRetrait(acces);
    });
    document.getElementById(identifiant)?.after(bouton);
  }
}

/**
 * Note l'état des données avant et après chaque chargement de l'exemple, pour
 * pouvoir ensuite retirer ce qu'il a apporté, et propose ce retrait.
 */
export function suivreExemple(acces: AccesDonnees): void {
  document.addEventListener(
    "click",
    (evenement) => {
      if (!(evenement.target instanceof Element) || evenement.target.closest(SELECTEUR_BOUTONS_EXEMPLE) === null) {
        return;
      }
      // Phase de capture : l'interface historique n'a pas encore chargé l'exemple.
      const avant = acces.lireEntrees();
      // Son chargement est synchrone : au prochain tour, les données sont celles d'après.
      window.setTimeout(() => {
        const instantane = composerInstantane(avant, acces.lireEntrees(), lireInstantane(avant[CLE_INSTANTANE_EXEMPLE]));
        acces.ecrireEntree(CLE_INSTANTANE_EXEMPLE, JSON.stringify(instantane));
        actualiserBoutons(acces);
        // L'exemple apporte son référentiel : l'encart des premiers pas n'a plus lieu d'être.
        document.querySelector(SELECTEUR_ENCART_ACCUEIL)?.remove();
      }, 0);
    },
    true,
  );
  actualiserBoutons(acces);
}
