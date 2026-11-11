// SPDX-License-Identifier: AGPL-3.0-or-later
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
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
  "fichier-trop-volumineux",
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

/**
 * Fait choisir un fichier d'échange à l'enseignant et rend son texte, non interprété.
 *
 * @returns `null` si l'enseignant a annulé.
 * @throws ErreurCoffre si le fichier est trop volumineux, n'est pas du texte ou ne peut pas être lu.
 */
export async function ouvrirFichierEchange(): Promise<string | null> {
  const texte = await appelerCoffre("ouvrir_fichier_echange");
  if (texte !== null && typeof texte !== "string") {
    throw new ErreurCoffre("interne");
  }
  return texte;
}

/**
 * Chiffre le texte d'un fichier d'échange sous `motDePasse` et le fait
 * enregistrer par la boîte de dialogue du système.
 *
 * @returns `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
 * @throws ErreurCoffre si le mot de passe est trop court ou l'écriture impossible.
 */
export async function enregistrerFichierProtege(nomPropose: string, texte: string, motDePasse: string): Promise<boolean> {
  return (await appelerCoffre("enregistrer_fichier_protege", { nomPropose, texte, motDePasse })) === true;
}

/**
 * Déchiffre le texte d'un fichier d'échange protégé.
 *
 * @throws ErreurCoffre « acces-refuse » si le mot de passe n'est pas le bon.
 */
export async function dechiffrerFichierEchange(fichier: string, motDePasse: string): Promise<string> {
  const texte = await appelerCoffre("dechiffrer_fichier_echange", { fichier, motDePasse });
  if (typeof texte !== "string") {
    throw new ErreurCoffre("interne");
  }
  return texte;
}

/**
 * Fait enregistrer une copie complète et chiffrée des données, à emporter sur un autre ordinateur.
 *
 * @returns `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
 */
export async function exporterCoffre(): Promise<boolean> {
  return (await appelerCoffre("exporter_coffre")) === true;
}

/**
 * Installe sur cet ordinateur, encore sans données, un fichier de transfert choisi par l'enseignant.
 *
 * @returns `true` si les données ont été installées, `false` si l'enseignant a annulé.
 * @throws ErreurCoffre si le fichier n'est pas un fichier de transfert ou si des données existent déjà.
 */
export async function installerCoffre(): Promise<boolean> {
  return (await appelerCoffre("installer_coffre")) === true;
}

/** Une version plus récente de l'application, prête à être installée. */
export interface MiseAJour {
  version: string;
  /** Notes de version rédigées par l'auteur ; texte vide s'il n'y en a pas. */
  notes: string;
  /** Télécharge la mise à jour, vérifie sa signature, l'installe puis relance l'application. */
  installer(): Promise<void>;
}

/**
 * Cherche une version plus récente auprès du dépôt de l'application.
 * C'est le seul appel réseau de DNMAX ; aucune donnée de l'enseignant n'est transmise.
 *
 * @returns `null` s'il n'y en a pas, ou si la vérification est impossible
 *   (pas de connexion, publication en cours…) : l'application doit rester
 *   pleinement utilisable hors ligne.
 */
export async function chercherMiseAJour(): Promise<MiseAJour | null> {
  try {
    const disponible = await check();
    if (disponible === null) {
      return null;
    }
    return {
      version: disponible.version,
      notes: disponible.body ?? "",
      installer: async () => {
        await disponible.downloadAndInstall();
        await relaunch();
      },
    };
  } catch {
    return null;
  }
}
