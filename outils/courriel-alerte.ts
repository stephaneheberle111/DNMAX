// SPDX-License-Identifier: CECILL-2.1

/**
 * Compose le courriel d'alerte de l'atelier « Surveillance » : un message
 * texte, marqué urgent, qui dit d'abord ce qui se passe et quoi faire.
 */

export interface Alerte {
  /** Ce qui a été trouvé, en une ligne : repris dans l'objet. */
  titre: string;
  /** Ce qu'il faut faire, en quelques lignes. */
  quoiFaire: readonly string[];
  /** Détail brut (sortie des outils), pour qui veut creuser. */
  detail: string;
}

export interface Envoi {
  expediteur: string;
  destinataire: string;
  /** Adresse de l'exécution de l'atelier, pour lire le détail complet. */
  lien: string;
  date: Date;
}

/** Longueur maximale du détail recopié : le reste se lit sur la page de l'exécution. */
const LONGUEUR_MAXIMALE_DETAIL = 6000;

/** Une adresse simple, sans rien qui puisse ajouter un en-tête ou un second destinataire. */
const FORME_ADRESSE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Encode un en-tête qui contient des accents (RFC 2047), par mots de longueur admise. */
function encoderEnTete(texte: string): string {
  const morceaux: string[] = [];
  // 9 caractères au plus par mot encodé : même à quatre octets chacun, la ligne reste sous 78, « Subject: » compris.
  for (const morceau of texte.match(/.{1,9}/gsu) ?? []) {
    morceaux.push(`=?UTF-8?B?${Buffer.from(morceau, "utf8").toString("base64")}?=`);
  }
  return morceaux.join("\r\n ");
}

/** Retire tout retour à la ligne d'une valeur destinée à un en-tête. */
function surUneLigne(texte: string): string {
  return texte.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Message complet, prêt à être remis à un serveur d'envoi.
 *
 * @throws Error si une adresse n'a pas la forme d'une adresse : elle viendrait
 *   d'un réglage mal saisi, et ne doit pas pouvoir glisser un en-tête.
 */
export function composerCourriel(alertes: readonly Alerte[], envoi: Envoi): string {
  for (const adresse of [envoi.expediteur, envoi.destinataire]) {
    if (!FORME_ADRESSE.test(adresse)) {
      throw new Error("adresse de courriel invalide dans les réglages de l'alerte");
    }
  }
  const objet =
    alertes.length === 1
      ? `URGENT - DNMAX : ${surUneLigne(alertes[0]?.titre ?? "")}`
      : `URGENT - DNMAX : ${String(alertes.length)} alertes de sécurité`;
  const corps: string[] = ["=".repeat(60), "  URGENT - ALERTE DE SÉCURITÉ DNMAX", "=".repeat(60), ""];
  alertes.forEach((alerte, rang) => {
    corps.push(`${String(rang + 1)}. ${surUneLigne(alerte.titre).toUpperCase()}`, "", "   QUE FAIRE :");
    for (const ligne of alerte.quoiFaire) {
      corps.push(`   - ${surUneLigne(ligne)}`);
    }
    corps.push("", "   DÉTAIL :");
    const detail = alerte.detail.trim().slice(0, LONGUEUR_MAXIMALE_DETAIL);
    for (const ligne of (detail === "" ? "(aucun détail)" : detail).split(/\r?\n/)) {
      corps.push(`   ${ligne}`);
    }
    corps.push("");
  });
  corps.push("-".repeat(60), "Détail complet de la vérification :", surUneLigne(envoi.lien), "", "Message envoyé par l'atelier « Surveillance » du dépôt DNMAX.");
  // Un point seul sur une ligne terminerait le message chez le serveur : il est doublé (RFC 5321).
  const texte = corps.map((ligne) => (ligne.startsWith(".") ? `.${ligne}` : ligne)).join("\r\n");
  const enTetes = [
    `From: DNMAX Surveillance <${envoi.expediteur}>`,
    `To: <${envoi.destinataire}>`,
    `Subject: ${encoderEnTete(objet)}`,
    `Date: ${envoi.date.toUTCString().replace("GMT", "+0000")}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    // Les trois façons dont les logiciels de courriel reconnaissent un message urgent.
    "X-Priority: 1 (Highest)",
    "Importance: high",
    "Priority: urgent",
  ];
  const encode = Buffer.from(`${texte}\r\n`, "utf8").toString("base64").match(/.{1,76}/g) ?? [];
  return `${enTetes.join("\r\n")}\r\n\r\n${encode.join("\r\n")}\r\n`;
}
