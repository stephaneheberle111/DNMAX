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
export const SYSTEMES = ["windows", "linux", "macos"] as const;
export type Systeme = (typeof SYSTEMES)[number];

const FICHIERS_PAR_PLATEFORME: readonly { systeme: Systeme; plateformes: readonly string[]; suffixe: string }[] = [
  { systeme: "windows", plateformes: ["windows-x86_64"], suffixe: "-setup.exe" },
  { systeme: "linux", plateformes: ["linux-x86_64"], suffixe: ".AppImage" },
  { systeme: "macos", plateformes: ["darwin-aarch64", "darwin-x86_64"], suffixe: ".app.tar.gz" },
];

/** Lit une liste de systèmes séparés par des virgules (« windows,linux ») ; refuse un nom inconnu ou une liste vide. */
export function lireSystemes(texte: string): Systeme[] {
  const noms = texte
    .split(",")
    .map((nom) => nom.trim())
    .filter((nom) => nom !== "");
  const inconnus = noms.filter((nom) => !SYSTEMES.some((systeme) => systeme === nom));
  if (noms.length === 0 || inconnus.length > 0) {
    throw new Error(`systèmes attendus parmi ${SYSTEMES.join(", ")} ; reçu « ${texte} »`);
  }
  return SYSTEMES.filter((systeme) => noms.includes(systeme));
}

const SUFFIXE_SIGNATURE = ".sig";
const FORMAT_VERSION = /^\d+\.\d+\.\d+$/;

/**
 * Compose le manifeste d'une version.
 *
 * @param adresseTelechargement adresse du dossier où les fichiers seront publiés, sans barre finale
 * @param systemes systèmes que cette construction couvre ; les autres sont absents du manifeste
 *   (leurs postes ne se voient pas proposer la mise à jour tant qu'il n'est pas complété)
 * @throws si la version est mal formée, ou si le fichier ou la signature d'un système attendu manque :
 *   mieux vaut refuser de publier qu'annoncer une mise à jour que certains postes ne pourraient pas installer.
 */
export function composerManifeste(
  version: string,
  notes: string,
  date: Date,
  adresseTelechargement: string,
  fichiers: readonly FichierConstruit[],
  systemes: readonly Systeme[] = SYSTEMES,
): Manifeste {
  if (!FORMAT_VERSION.test(version)) {
    throw new Error(`version mal formée : « ${version} » (attendu : 1.2.3)`);
  }
  const platforms: Manifeste["platforms"] = {};
  for (const { systeme, plateformes, suffixe } of FICHIERS_PAR_PLATEFORME) {
    if (!systemes.includes(systeme)) {
      continue;
    }
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

/**
 * Ajoute à un manifeste déjà publié les plateformes d'un complément de la même
 * version (par exemple les Mac, construits après coup). La date et les notes
 * du manifeste d'origine sont gardées.
 *
 * @throws si les deux manifestes ne portent pas la même version : on ne mêle
 *   pas les fichiers de deux versions.
 */
export function completerManifeste(publie: Manifeste, complement: Manifeste): Manifeste {
  if (publie.version !== complement.version) {
    throw new Error(`versions différentes : manifeste publié ${publie.version}, complément ${complement.version}`);
  }
  return { ...publie, platforms: { ...publie.platforms, ...complement.platforms } };
}

/** Vérifie qu'un texte JSON a la forme d'un manifeste ; rend `null` sinon. */
export function lireManifeste(texte: string): Manifeste | null {
  let valeur: unknown;
  try {
    valeur = JSON.parse(texte);
  } catch {
    return null;
  }
  if (typeof valeur !== "object" || valeur === null) {
    return null;
  }
  const { version, notes, pub_date: date, platforms } = valeur as Record<string, unknown>;
  if (
    typeof version !== "string" ||
    typeof notes !== "string" ||
    typeof date !== "string" ||
    typeof platforms !== "object" ||
    platforms === null
  ) {
    return null;
  }
  const plateformes: Manifeste["platforms"] = {};
  for (const [nom, entree] of Object.entries(platforms)) {
    const { signature, url } = (entree ?? {}) as Record<string, unknown>;
    if (typeof signature !== "string" || typeof url !== "string") {
      return null;
    }
    plateformes[nom] = { signature, url };
  }
  return { version, notes, pub_date: date, platforms: plateformes };
}
