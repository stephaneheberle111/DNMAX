// SPDX-License-Identifier: CECILL-2.1
/*
 * Bas de page et documents consultables hors ligne : ce qu'affiche l'indicateur
 * de mise à jour, et ce que devient chaque lien de la documentation reprise du site.
 * Calculs seuls.
 */

/**
 * État de la recherche de mise à jour. DNMAX ne se connecte qu'à la demande :
 * `inconnu` tant que l'enseignant n'a pas lancé de recherche.
 */
export type EtatMiseAJour = "inconnu" | "en-cours" | "a-jour" | "disponible" | "impossible";

/** Indication courte placée à côté de la version, dans le bas de page ; texte vide quand il n'y a rien à dire. */
export function indicationMiseAJour(etat: EtatMiseAJour): string {
  switch (etat) {
    case "en-cours":
      return "recherche…";
    case "a-jour":
      return "à jour";
    case "disponible":
      return "nouvelle version disponible";
    case "impossible":
      return "vérification impossible";
    case "inconnu":
      return "";
  }
}

/** Bulle d'aide du bouton de version, qui lance la recherche. */
export function aideMiseAJour(etat: EtatMiseAJour): string {
  return etat === "disponible"
    ? "Une nouvelle version vous est proposée : cliquez pour revoir l'annonce."
    : "Rechercher une mise à jour : DNMAX interroge alors le site dnmax.fr, sans rien transmettre de vos données.";
}

/** Ce que devient un lien de la documentation affichée dans l'application. */
export type DestinationLien =
  | { type: "rubrique"; rubrique: string }
  | { type: "confidentialite" }
  | { type: "externe"; adresse: string }
  | { type: "inerte" };

/**
 * Classe un lien repris du site : les renvois à une autre rubrique ou à la page
 * Confidentialité restent dans l'application ; une adresse web ou un courriel
 * s'ouvre à part, sur demande ; le reste (ancres du site) ne mène nulle part.
 */
export function classerLien(href: string, rubrique: string | undefined): DestinationLien {
  if (rubrique !== undefined && rubrique !== "") {
    return { type: "rubrique", rubrique };
  }
  if (href === "#confidentialite") {
    return { type: "confidentialite" };
  }
  if (/^https:\/\//.test(href) || /^mailto:/.test(href)) {
    return { type: "externe", adresse: href };
  }
  return { type: "inerte" };
}

/**
 * Vrai si la recherche automatique, activée par l'enseignant, doit partir
 * maintenant : une fois par jour au plus, à la première ouverture.
 *
 * @param derniere date (AAAA-MM-JJ) de la dernière recherche automatique, texte vide si aucune
 * @param aujourdHui date du jour, AAAA-MM-JJ
 */
export function rechercheAutomatiqueDue(activee: boolean, derniere: string, aujourdHui: string): boolean {
  return activee && derniere !== aujourdHui;
}
