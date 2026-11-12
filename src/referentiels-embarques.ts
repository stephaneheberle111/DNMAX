// SPDX-License-Identifier: AGPL-3.0-or-later
// Les fichiers sont ceux que le site propose au téléchargement : une seule source pour les deux.
import espace from "../site/referentiels/dn-made-espace.dnmax?raw";
import objet from "../site/referentiels/dn-made-objet.dnmax?raw";

/**
 * Référentiels livrés avec l'application, pour s'installer sans connexion.
 * Ils ne sont pas installés d'office : l'enseignant en choisit un, et DNMAX
 * lui montre ce qu'il ajouterait avant de l'installer (circuit de réception).
 */
export const REFERENTIELS_EMBARQUES: readonly { mention: string; nom: string; texte: string }[] = [
  { mention: "Objet", nom: "DN MADE mention Objet", texte: objet },
  { mention: "Espace", nom: "DN MADE mention Espace", texte: espace },
];
