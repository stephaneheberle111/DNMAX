// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Composition du manifeste de mise à jour (`latest.json`) que l'application
 * consulte pour savoir si une version plus récente existe.
 *
 * Ce fichier ne lit ni le disque ni le réseau : on lui passe la liste des
 * fichiers produits par la construction, il rend le manifeste.
 */

/** Un fichier produit par la construction : son nom et, pour une signature, son contenu. */
export interface FichierConstruit {
  nom: string;
  /** Contenu du fichier `.sig` ; absent pour les autres fichiers. */
  signature?: string;
}

export interface Manifeste {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}

/**
 * Pour chaque plateforme connue de l'application, ce qui reconnaît son
 * fichier de mise à jour. La construction macOS est universelle : le même
 * fichier sert aux Mac Intel et Apple Silicon.
 */
const FICHIERS_PAR_PLATEFORME: readonly { plateformes: readonly string[]; suffixe: string }[] = [
  { plateformes: ["windows-x86_64"], suffixe: "-setup.exe" },
  { plateformes: ["linux-x86_64"], suffixe: ".AppImage" },
  { plateformes: ["darwin-aarch64", "darwin-x86_64"], suffixe: ".app.tar.gz" },
];

const SUFFIXE_SIGNATURE = ".sig";
const FORMAT_VERSION = /^\d+\.\d+\.\d+$/;

/**
 * Compose le manifeste d'une version.
 *
 * @param adresseTelechargement adresse du dossier où les fichiers seront publiés, sans barre finale
 * @throws si la version est mal formée, ou si le fichier ou la signature d'une plateforme manque :
 *   mieux vaut refuser de publier qu'annoncer une mise à jour que certains postes ne pourraient pas installer.
 */
export function composerManifeste(
  version: string,
  notes: string,
  date: Date,
  adresseTelechargement: string,
  fichiers: readonly FichierConstruit[],
): Manifeste {
  if (!FORMAT_VERSION.test(version)) {
    throw new Error(`version mal formée : « ${version} » (attendu : 1.2.3)`);
  }
  const platforms: Manifeste["platforms"] = {};
  for (const { plateformes, suffixe } of FICHIERS_PAR_PLATEFORME) {
    const fichier = fichiers.find((candidat) => candidat.nom.endsWith(suffixe));
    const signature = fichiers.find((candidat) => candidat.nom === `${fichier?.nom ?? ""}${SUFFIXE_SIGNATURE}`)?.signature;
    if (fichier === undefined || signature === undefined || signature.trim() === "") {
      throw new Error(`fichier de mise à jour ou signature manquant pour ${plateformes.join(", ")} (« *${suffixe} »)`);
    }
    for (const plateforme of plateformes) {
      platforms[plateforme] = {
        signature: signature.trim(),
        url: `${adresseTelechargement}/${encodeURIComponent(fichier.nom)}`,
      };
    }
  }
  return { version, notes, pub_date: date.toISOString(), platforms };
}
