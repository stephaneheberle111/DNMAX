// SPDX-License-Identifier: AGPL-3.0-or-later
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Entrees } from "./domaine/magasin-memoire";
import { estJeuEntrees } from "./domaine/saisie-coffre";

/** En-tête lu par la commande `enregistrer_fichier` de l'enveloppe. */
const ENTETE_NOM_FICHIER = "x-nom-fichier";

/**
 * Ouvre la boîte de dialogue « Enregistrer sous » du système et y écrit le fichier.
 *
 * @returns `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
 * @throws si l'écriture échoue ou si l'application tourne hors de l'enveloppe.
 */
export async function enregistrerFichier(nomPropose: string, octets: Uint8Array): Promise<boolean> {
  // Les en-têtes n'acceptent que de l'ASCII : le nom est encodé, l'enveloppe le décode.
  return await invoke<boolean>("enregistrer_fichier", octets, {
    headers: { [ENTETE_NOM_FICHIER]: encodeURIComponent(nomPropose) },
  });
}

export type EtatCoffre = "absent" | "verrouille" | "ouvert";

/** Codes d'erreur rendus par les commandes du coffre (voir `ErreurCommande` côté enveloppe). */
const CODES_ERREUR_COFFRE = [
  "mot-de-passe-trop-court",
  "acces-refuse",
  "fichier-illisible",
  "version-inconnue",
  "coffre-deja-present",
  "coffre-absent",
  "coffre-verrouille",
  "disque-inaccessible",
  "interne",
] as const;

export type CodeErreurCoffre = (typeof CODES_ERREUR_COFFRE)[number];

/** Erreur d'une commande du coffre, avec son code stable. */
export class ErreurCoffre extends Error {
  readonly code: CodeErreurCoffre;

  constructor(code: CodeErreurCoffre) {
    super(`erreur du coffre : ${code}`);
    this.code = code;
  }
}

function estCodeErreurCoffre(valeur: unknown): valeur is CodeErreurCoffre {
  return CODES_ERREUR_COFFRE.some((code) => code === valeur);
}

/** Appelle une commande du coffre et ramène toute erreur à une `ErreurCoffre`. */
async function appelerCoffre(commande: string, parametres?: Record<string, unknown>): Promise<unknown> {
  try {
    return await invoke<unknown>(commande, parametres);
  } catch (erreur: unknown) {
    throw new ErreurCoffre(estCodeErreurCoffre(erreur) ? erreur : "interne");
  }
}

function exigerEntrees(valeur: unknown): Entrees {
  if (!estJeuEntrees(valeur)) {
    throw new ErreurCoffre("fichier-illisible");
  }
  return valeur;
}

/** Indique si l'application tourne dans son enveloppe de bureau (et non dans un simple navigateur). */
export function estDansEnveloppe(): boolean {
  return isTauri();
}

export async function lireEtatCoffre(): Promise<EtatCoffre> {
  const etat = await appelerCoffre("etat_coffre");
  if (etat !== "absent" && etat !== "verrouille" && etat !== "ouvert") {
    throw new ErreurCoffre("interne");
  }
  return etat;
}

/** Crée le coffre et rend le code de secours, à montrer une seule fois. */
export async function creerCoffre(motDePasse: string): Promise<string> {
  const reponse = await appelerCoffre("creer_coffre", { motDePasse });
  if (typeof reponse !== "object" || reponse === null || !("codeSecours" in reponse)) {
    throw new ErreurCoffre("interne");
  }
  const { codeSecours } = reponse;
  if (typeof codeSecours !== "string") {
    throw new ErreurCoffre("interne");
  }
  return codeSecours;
}

export async function ouvrirCoffre(motDePasse: string): Promise<Entrees> {
  return exigerEntrees(await appelerCoffre("ouvrir_coffre", { motDePasse }));
}

export async function ouvrirCoffreParSecours(codeSecours: string, nouveauMotDePasse: string): Promise<Entrees> {
  return exigerEntrees(await appelerCoffre("ouvrir_coffre_par_secours", { codeSecours, nouveauMotDePasse }));
}

export async function lireCoffre(): Promise<Entrees> {
  return exigerEntrees(await appelerCoffre("lire_coffre"));
}

export async function enregistrerCoffre(entrees: Entrees): Promise<void> {
  await appelerCoffre("enregistrer_coffre", { entrees });
}

/**
 * Fait exécuter `avantFermeture` quand l'enseignant ferme la fenêtre, et
 * n'autorise la fermeture qu'une fois ce travail terminé.
 */
export async function attendreAvantFermeture(avantFermeture: () => Promise<void>): Promise<void> {
  await getCurrentWindow().onCloseRequested(async () => {
    await avantFermeture();
  });
}
