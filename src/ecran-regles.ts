// SPDX-License-Identifier: CECILL-2.1
import { reglesAffichees } from "./domaine/regles-affichees";
import { creer } from "./ecran-echange";
import type { AccesDonnees } from "./ecran-echange";

/**
 * Réglages d'affichage de ce poste, rangés dans le coffre sous `dnmade.reglages`.
 * L'interface historique les lit au moment d'afficher (Progression).
 */
export const CLE_REGLAGES = "dnmade.reglages";

/** Tous les réglages du poste rangés sous `dnmade.reglages`, tels quels ; un objet vide s'ils sont illisibles. */
export function lireReglagesBruts(acces: Pick<AccesDonnees, "lireEntrees">): Record<string, unknown> {
  try {
    const lu: unknown = JSON.parse(acces.lireEntrees()[CLE_REGLAGES] ?? "{}");
    return typeof lu === "object" && lu !== null && !Array.isArray(lu) ? (lu as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Change un seul réglage du poste, sans toucher aux autres. */
export function ecrireReglage(acces: Pick<AccesDonnees, "lireEntrees" | "ecrireEntree">, cle: string, valeur: unknown): void {
  acces.ecrireEntree(CLE_REGLAGES, JSON.stringify({ ...lireReglagesBruts(acces), [cle]: valeur }));
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
  caseComparaison.checked = lireReglagesBruts(acces).masquerComparaison === true;
  caseComparaison.addEventListener("change", () => {
    ecrireReglage(acces, "masquerComparaison", caseComparaison.checked);
  });
}
