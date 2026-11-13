// SPDX-License-Identifier: AGPL-3.0-or-later
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";

/**
 * Transport de l'échange en direct : l'enveloppe de bureau trouve l'autre
 * ordinateur sur le réseau local, s'authentifie par le code de 8 chiffres et
 * transmet le contenu chiffré (commandes `envoyer_direct`, `recevoir_direct`
 * et `annuler_echange_direct`). Aucun serveur : les deux ordinateurs doivent
 * être sur le même réseau. Voir DECISIONS.md, décision 21.
 *
 * Ce module parle à l'enveloppe ; il vérifie la forme de tout ce qu'elle rend.
 */

/** Codes d'erreur rendus par l'enveloppe (voir `ErreurDirect` côté Rust). */
const CODES_ERREUR_DIRECT = [
  "code-invalide",
  "trop-volumineux",
  "reseau-indisponible",
  "expediteur-introuvable",
  "plusieurs-expediteurs",
  "connexion-impossible",
  "code-errone",
  "delai-depasse",
  "transfert-interrompu",
  "donnees-alterees",
  "version-incompatible",
  "annule",
  "interne",
] as const;

export type CodeErreurDirect = (typeof CODES_ERREUR_DIRECT)[number];

export class ErreurDirect extends Error {
  readonly code: CodeErreurDirect;

  constructor(code: CodeErreurDirect) {
    super(`échange en direct : ${code}`);
    this.code = code;
  }
}

/** Ramène une erreur rendue par l'enveloppe à une `ErreurDirect`. */
export function lireErreurDirect(valeur: unknown): ErreurDirect {
  const code = CODES_ERREUR_DIRECT.find((connu) => connu === valeur);
  return new ErreurDirect(code ?? "interne");
}

/** Étape franchie, signalée par l'enveloppe pendant l'échange. */
export type EtapeDirect =
  /** Le code à dicter, et sa durée de validité. */
  | { etape: "code"; code: string; validiteSecondes: number }
  /** Le destinataire cherche l'expéditeur sur le réseau. */
  | { etape: "recherche" }
  /** Les deux ordinateurs se sont reconnus. */
  | { etape: "connexion" }
  /** Avancement du transfert, en octets. */
  | { etape: "progression"; faits: number; total: number };

function estEntierPositif(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isSafeInteger(valeur) && valeur >= 0;
}

/** Vérifie la forme d'une étape reçue de l'enveloppe ; `null` si elle n'est pas reconnue. */
export function lireEtape(valeur: unknown): EtapeDirect | null {
  if (typeof valeur !== "object" || valeur === null) {
    return null;
  }
  const champs = valeur as Record<string, unknown>;
  switch (champs.etape) {
    case "code":
      return typeof champs.code === "string" && /^\d{4} \d{4}$/.test(champs.code) && estEntierPositif(champs.validiteSecondes)
        ? { etape: "code", code: champs.code, validiteSecondes: champs.validiteSecondes }
        : null;
    case "recherche":
    case "connexion":
      return { etape: champs.etape };
    case "progression":
      return estEntierPositif(champs.faits) && estEntierPositif(champs.total) && champs.faits <= champs.total
        ? { etape: "progression", faits: champs.faits, total: champs.total }
        : null;
    default:
      return null;
  }
}

/** Indique si l'échange en direct est possible : seulement dans l'enveloppe de bureau. */
export function echangeDirectDisponible(): boolean {
  return isTauri();
}

/** Canal par lequel l'enveloppe signale les étapes ; toute étape mal formée est ignorée. */
function creerCanal(suivi: (etape: EtapeDirect) => void): Channel {
  return new Channel((message: unknown) => {
    const etape = lireEtape(message);
    if (etape !== null) {
      suivi(etape);
    }
  });
}

async function appeler<T>(commande: string, parametres: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(commande, parametres);
  } catch (erreur: unknown) {
    throw lireErreurDirect(erreur);
  }
}

/**
 * Prépare l'envoi de `texte` et attend le collègue. Le code à lui dicter
 * arrive par `suivi` ; la promesse se résout quand il a tout reçu.
 *
 * @throws ErreurDirect si l'envoi échoue, expire ou est annulé.
 */
export async function envoyerEnDirect(texte: string, suivi: (etape: EtapeDirect) => void): Promise<void> {
  await appeler<unknown>("envoyer_direct", { texte, etapes: creerCanal(suivi) });
}

/**
 * Cherche l'envoi désigné par `code` sur le réseau local et rend le texte reçu,
 * encore à faire passer par le circuit de réception.
 *
 * @throws ErreurDirect si l'envoi est introuvable, le code erroné, le transfert interrompu…
 */
export async function recevoirEnDirect(code: string, suivi: (etape: EtapeDirect) => void): Promise<string> {
  const texte = await appeler<unknown>("recevoir_direct", { code, etapes: creerCanal(suivi) });
  if (typeof texte !== "string") {
    throw new ErreurDirect("interne");
  }
  return texte;
}

/** Annule l'échange en cours ; sans effet s'il n'y en a pas. Ne lève jamais d'erreur. */
export async function annulerEchangeDirect(): Promise<void> {
  try {
    await invoke("annuler_echange_direct");
  } catch {
    // Rien à annuler, ou enveloppe absente : il n'y a rien de plus à faire.
  }
}
