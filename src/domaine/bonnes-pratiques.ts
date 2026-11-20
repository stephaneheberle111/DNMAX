// SPDX-License-Identifier: CECILL-2.1
/*
 * Conseils de la première page de bienvenue qui dépendent du système : le
 * raccourci qui verrouille l'écran et l'endroit où s'active le chiffrement du
 * disque. Ne citer que ceux de l'ordinateur utilisé garde la page assez courte
 * pour tenir dans la fenêtre. Calculs seuls : rend du texte, sans accès à la page.
 */
import type { Systeme } from "./adresse-retours";

export interface ConseilsSysteme {
  /** Raccourci clavier qui verrouille l'écran. */
  readonly verrouillage: string;
  /** Où s'active le chiffrement du disque. */
  readonly chiffrement: string;
}

const CONSEILS: Readonly<Record<Systeme, ConseilsSysteme>> = {
  Windows: {
    verrouillage: "Windows + L",
    chiffrement: "BitLocker, ou « Chiffrement de l'appareil », s'active dans Paramètres > Confidentialité et sécurité",
  },
  macOS: {
    verrouillage: "Ctrl + Cmd + Q",
    chiffrement: "FileVault s'active dans Réglages Système > Confidentialité et sécurité",
  },
  Linux: {
    verrouillage: "Super + L",
    chiffrement: "LUKS se choisit à l'installation du système (« chiffrer le disque »)",
  },
};

const ORDRE: readonly Systeme[] = ["Windows", "macOS", "Linux"];

/**
 * Conseils à afficher : ceux du système reconnu, sinon ceux des trois systèmes,
 * chacun précédé de son nom, pour ne jamais donner un conseil faux.
 */
export function conseilsSelonSysteme(systeme: Systeme | null): ConseilsSysteme {
  if (systeme !== null) {
    return CONSEILS[systeme];
  }
  return {
    verrouillage: ORDRE.map((nom) => `${CONSEILS[nom].verrouillage} (${nom})`).join(", "),
    chiffrement: ORDRE.map((nom) => `${nom} : ${CONSEILS[nom].chiffrement}`).join(" ; "),
  };
}
