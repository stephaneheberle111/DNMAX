// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Codes texte de l'échange en direct : l'invitation de l'expéditeur et la
 * réponse du destinataire, que les enseignants se transmettent à la main
 * (messagerie, copier-coller). Ils remplacent le serveur de signalisation
 * d'une connexion WebRTC ordinaire.
 *
 * Forme : `DNMAX-DIRECT:<version>:<charge>:<contrôle>`, où la charge est un
 * JSON compact encodé en base64url et le contrôle la somme CRC-32 de la
 * charge, en hexadécimal. Le contrôle ne protège pas d'une falsification
 * volontaire : il repère un code tronqué ou mal recopié.
 */

export const PREFIXE_CODE = "DNMAX-DIRECT";
export const VERSION_CODE = 1;

const SEPARATEUR = ":";

/** Au-delà, le code ne peut pas venir de DNMAX : une description de connexion tient en quelques Ko. */
const LONGUEUR_MAXIMALE_CODE = 64 * 1024;
const LONGUEUR_MAXIMALE_DESCRIPTION = 32 * 1024;

/** Identifiant de séance : relie une réponse à l'invitation qu'elle accepte. */
const FORME_SEANCE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Seuls caractères d'un code. Tout le reste (espaces, retours à la ligne,
 * guillemets ou chevrons ajoutés par une messagerie, point final…) est ignoré ;
 * le contrôle d'intégrité dit ensuite si ce qui reste est complet.
 */
const HORS_ALPHABET = /[^A-Za-z0-9_:-]/g;

export type RoleCode = "invitation" | "reponse";

export interface ContenuCode {
  role: RoleCode;
  /** Identifiant tiré au hasard par l'expéditeur, recopié dans la réponse. */
  seance: string;
  /** Description de session WebRTC (SDP), candidats de connexion compris. */
  description: string;
}

export type ErreurCode =
  /** Rien n'a été collé. */
  | "vide"
  /** Ce n'est pas un code DNMAX. */
  | "prefixe-inconnu"
  /** Code d'une version de DNMAX plus récente (ou inconnue). */
  | "version-inconnue"
  /** Code tronqué ou mal recopié : le contrôle ne correspond pas. */
  | "incomplet"
  /** Code complet, mais dont le contenu n'a pas la forme attendue. */
  | "illisible"
  /** Une invitation collée à la place d'une réponse, ou l'inverse. */
  | "mauvais-role";

const TABLE_CRC32 = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let valeur = index;
    for (let bit = 0; bit < 8; bit += 1) {
      valeur = valeur & 1 ? 0xedb88320 ^ (valeur >>> 1) : valeur >>> 1;
    }
    table[index] = valeur >>> 0;
  }
  return table;
})();

/**
 * Somme CRC-32 (celle de zip et PNG) d'un texte lu en UTF-16 petit-boutiste,
 * sur 8 chiffres hexadécimaux minuscules. Repère une altération accidentelle,
 * pas une falsification.
 */
export function sommeControle(texte: string): string {
  let somme = 0xffffffff;
  for (let position = 0; position < texte.length; position += 1) {
    const unite = texte.charCodeAt(position);
    somme = (TABLE_CRC32[(somme ^ unite) & 0xff] ?? 0) ^ (somme >>> 8);
    somme = (TABLE_CRC32[(somme ^ (unite >>> 8)) & 0xff] ?? 0) ^ (somme >>> 8);
  }
  return ((somme ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

function versBase64Url(texte: string): string {
  const octets = new TextEncoder().encode(texte);
  let binaire = "";
  for (const octet of octets) {
    binaire += String.fromCharCode(octet);
  }
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** @returns `null` si le texte n'est pas du base64url valide ou pas de l'UTF-8. */
function depuisBase64Url(charge: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(charge) || charge.length % 4 === 1) {
    return null;
  }
  try {
    const binaire = atob(charge.replace(/-/g, "+").replace(/_/g, "/"));
    const octets = Uint8Array.from(binaire, (caractere) => caractere.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    return null;
  }
}

/** Écrit le code à transmettre à l'autre enseignant. */
export function encoderCode(contenu: ContenuCode): string {
  const charge = versBase64Url(JSON.stringify({ r: contenu.role, s: contenu.seance, d: contenu.description }));
  return [PREFIXE_CODE, String(VERSION_CODE), charge, sommeControle(charge)].join(SEPARATEUR);
}

function lireContenu(valeur: unknown): ContenuCode | null {
  if (typeof valeur !== "object" || valeur === null || Array.isArray(valeur)) {
    return null;
  }
  const { r: role, s: seance, d: description } = valeur as Record<string, unknown>;
  if (
    (role !== "invitation" && role !== "reponse") ||
    typeof seance !== "string" ||
    !FORME_SEANCE.test(seance) ||
    typeof description !== "string" ||
    description.length > LONGUEUR_MAXIMALE_DESCRIPTION ||
    // Toute description de session SDP commence ainsi (RFC 8866).
    !description.startsWith("v=0")
  ) {
    return null;
  }
  return { role, seance, description };
}

/**
 * Lit un code collé par l'enseignant. Le texte vient de l'extérieur : rien
 * n'en est gardé tant qu'il n'a pas passé toutes les vérifications.
 *
 * @param roleAttendu rôle que le code doit avoir à cette étape du parcours.
 */
export function decoderCode(texte: string, roleAttendu: RoleCode): ContenuCode | ErreurCode {
  if (texte.length > LONGUEUR_MAXIMALE_CODE * 2) {
    return "illisible";
  }
  const nettoye = texte.replace(HORS_ALPHABET, "");
  if (nettoye === "") {
    return "vide";
  }
  if (!nettoye.startsWith(PREFIXE_CODE + SEPARATEUR)) {
    return "prefixe-inconnu";
  }
  const parties = nettoye.slice(PREFIXE_CODE.length + SEPARATEUR.length).split(SEPARATEUR);
  const [version, charge, controle] = parties;
  if (version === undefined || !/^\d{1,4}$/.test(version)) {
    return "incomplet";
  }
  if (Number(version) !== VERSION_CODE) {
    return "version-inconnue";
  }
  if (parties.length !== 3 || charge === undefined || controle === undefined) {
    return "incomplet";
  }
  if (charge.length > LONGUEUR_MAXIMALE_CODE) {
    return "illisible";
  }
  if (controle.toLowerCase() !== sommeControle(charge)) {
    return "incomplet";
  }
  const json = depuisBase64Url(charge);
  if (json === null) {
    return "illisible";
  }
  let valeur: unknown;
  try {
    valeur = JSON.parse(json);
  } catch {
    return "illisible";
  }
  const contenu = lireContenu(valeur);
  if (contenu === null) {
    return "illisible";
  }
  return contenu.role === roleAttendu ? contenu : "mauvais-role";
}
