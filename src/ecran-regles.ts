// SPDX-License-Identifier: CECILL-2.1
import { reglesAffichees } from "./domaine/regles-affichees";
import { creer } from "./ecran-echange";
import type { AccesDonnees } from "./ecran-echange";

/**
 * Réglages d'affichage de ce poste, rangés dans le coffre sous `dnmade.reglages`.
 * L'interface historique les lit au moment d'afficher (Progression).
 */
export const CLE_REGLAGES = "dnmade.reglages";

export interface Reglages {
  /** Progression étudiant : ne pas situer l'étudiant par rapport à sa promotion. */
  masquerComparaison: boolean;
}

export function lireReglages(texte: string | undefined): Reglages {
  try {
    const lu: unknown = JSON.parse(texte ?? "{}");
    return { masquerComparaison: typeof lu === "object" && lu !== null && "masquerComparaison" in lu && lu.masquerComparaison === true };
  } catch {
    return { masquerComparaison: false };
  }
}

/** Paramètres > Règles d'évaluation : les règles fixes, puis les réglages d'affichage de ce poste. */
export function installerReglesParametres(acces: AccesDonnees): void {
  const panneau = document.getElementById("panneau-regles");
  const liste = document.getElementById("liste-regles");
  const caseComparaison = document.getElementById("r-masquer-comparaison");
  if (panneau === null || liste === null || !(caseComparaison instanceof HTMLInputElement)) {
    return;
  }
  panneau.hidden = false;
  liste.replaceChildren(
    ...reglesAffichees().map(({ titre, texte }) => {
      const element = creer("li", "regle");
      element.append(creer("b", "", titre), creer("span", "", ` : ${texte}`));
      return element;
    }),
  );
  caseComparaison.checked = lireReglages(acces.lireEntrees()[CLE_REGLAGES]).masquerComparaison;
  caseComparaison.addEventListener("change", () => {
    const reglages: Reglages = { ...lireReglages(acces.lireEntrees()[CLE_REGLAGES]), masquerComparaison: caseComparaison.checked };
    acces.ecrireEntree(CLE_REGLAGES, JSON.stringify(reglages));
  });
}
