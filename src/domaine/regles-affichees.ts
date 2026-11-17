// SPDX-License-Identifier: CECILL-2.1
import { bornesNiveaux } from "./saisie-resultats";
import { ECHELLE, RANG_ACQUIS } from "./evaluation";

/**
 * Règles de DNMAX montrées dans Paramètres > Règles d'évaluation, pour que
 * l'enseignant les connaisse sans lire le code. Elles sont les mêmes pour
 * tous les enseignants et ne se règlent pas (décision 36). Les textes sont
 * tirés des valeurs mêmes qu'appliquent les règles : ils ne peuvent pas
 * s'en écarter.
 */
export interface RegleAffichee {
  titre: string;
  texte: string;
}

function pourcent(valeur: number): string {
  return `${String(Math.round(valeur))} %`;
}

/** Zones de la jauge, « Insuffisant de 0 à 15 % », dans l'ordre des niveaux. */
export function zonesDeLaJauge(): string[] {
  const bornes = bornesNiveaux(ECHELLE.niveaux.length);
  return ECHELLE.niveaux.map((niveau, rang) => `${niveau} de ${pourcent(bornes[rang] ?? 0)} à ${pourcent(bornes[rang + 1] ?? 100)}`);
}

/** Les règles fixes, dans l'ordre où elles se rencontrent : composer, évaluer, suivre. */
export function reglesAffichees(): RegleAffichee[] {
  const acquis = ECHELLE.niveaux[RANG_ACQUIS];
  return [
    {
      titre: "Échelle",
      texte: `Une seule échelle pour tous, les ${ECHELLE.nom.toLowerCase()} : ${ECHELLE.niveaux.join(", ")}.`,
    },
    {
      titre: "Enregistrer une évaluation",
      texte:
        "Il faut un intitulé, une promotion, une consigne, au moins un EC et au moins une compétence. Une UE cochée vaut tous ses EC.",
    },
    { titre: "Seuils de la jauge", texte: `${zonesDeLaJauge().join(" ; ")}.` },
    { titre: "Rendu", texte: "Saisir un niveau pour un étudiant le marque « Rendu »." },
    { titre: "Non rendu, dispensé", texte: "Marquer un étudiant « non rendu » ou « dispensé » efface une saisie commencée." },
    {
      titre: "Compétence acquise",
      texte: `Une compétence est acquise quand le dernier niveau obtenu est « ${acquis} » ou mieux.`,
    },
    {
      titre: "Suivi d'une évaluation",
      texte:
        "Préparée, Distribuée, Rendus à évaluer, Évaluation en cours, Évaluée, Restituée en partie, Restituée ; ou Annulée.",
    },
  ];
}

/** Niveaux d'acquisition du DN MADE, de la 1re à la 3e année. */
export const NIVEAUX_ACQUISITION = ["Initié", "Guidé", "Autonome"] as const;

/**
 * Règle du module Niveaux d'acquisition, montrée dans sa carte de
 * Paramètres > Modules, sans réglage possible (décision 36).
 */
export function regleNiveauxAcquisition(): string {
  const acquis = ECHELLE.niveaux[RANG_ACQUIS];
  const parAnnee = NIVEAUX_ACQUISITION.map((niveau, rang) => `${niveau} en ${String(rang + 1)}${rang === 0 ? "re" : "e"} année`);
  return `Facultatifs, absents du référentiel du diplôme : ${parAnnee.join(", ")}. Le niveau de l'année est validé dès qu'une évaluation de cette année donne « ${acquis} » ou mieux.`;
}
