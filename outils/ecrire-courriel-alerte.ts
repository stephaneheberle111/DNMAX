// SPDX-License-Identifier: CECILL-2.1

/**
 * Écrit le courriel d'alerte de l'atelier « Surveillance » à partir des
 * fichiers de détail laissés par les vérifications qui ont échoué.
 *
 * Usage : node outils/ecrire-courriel-alerte.ts <dossier des détails> <courriel à écrire>
 * Réglages lus dans l'environnement : EXPEDITEUR, DESTINATAIRE, LIEN.
 * Chaque fichier `<sorte>.txt` du dossier (cherché aussi un niveau plus bas) vaut une alerte.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { composerCourriel, type Alerte } from "./courriel-alerte.ts";

/** Ce que chaque vérification veut dire quand elle échoue, et quoi faire. */
const SORTES: Readonly<Record<string, Omit<Alerte, "detail">>> = {
  installeurs: {
    titre: "Un installeur en ligne sur dnmax.fr n'est pas celui de la version publiée",
    quoiFaire: [
      "Considérer l'accès à l'hébergement OVH comme compromis : changer tout de suite le mot de passe SFTP chez OVH, puis le secret OVH_SITE_MOT_DE_PASSE du dépôt.",
      "Relancer l'atelier « Téléchargements » pour remettre en ligne les bons installeurs.",
      "Relancer l'atelier « Surveillance » pour vérifier que tout est rentré dans l'ordre.",
    ],
  },
  "dependances-interface": {
    titre: "Faille connue dans une bibliothèque de l'interface livrée avec DNMAX",
    quoiFaire: [
      "Lire le détail : nom de la bibliothèque, gravité, lien vers l'avis.",
      "Mettre la bibliothèque à jour et publier une version, ou, si la faille ne concerne pas l'usage qu'en fait DNMAX, l'ajouter à ALERTES_ADMISES (outils/audit-npm.ts) avec la raison.",
    ],
  },
  "dependances-enveloppe": {
    titre: "Faille connue dans une bibliothèque de l'enveloppe de bureau (Tauri, chiffrement, réseau)",
    quoiFaire: [
      "Lire le détail : nom de la bibliothèque, identifiant RUSTSEC, version corrigée.",
      "Mettre la bibliothèque à jour (cargo update -p <nom> dans src-tauri/), relancer les tests et publier une version.",
    ],
  },
  essai: {
    titre: "Essai du courriel d'alerte : tout va bien",
    quoiFaire: ["Rien : ce message vérifie seulement que les alertes vous parviennent."],
  },
};

const [dossier, sortie] = process.argv.slice(2);
const { EXPEDITEUR, DESTINATAIRE, LIEN } = process.env;
if (dossier === undefined || sortie === undefined || !EXPEDITEUR || !DESTINATAIRE || !LIEN) {
  console.error("usage : EXPEDITEUR=… DESTINATAIRE=… LIEN=… node outils/ecrire-courriel-alerte.ts <dossier> <courriel>");
  process.exit(2);
}

/** Les détails peuvent arriver rangés par sous-dossier (un par vérification) : on regarde aussi un niveau plus bas. */
function trouver(nom: string): string | null {
  const candidats = [join(dossier as string, nom)];
  if (existsSync(dossier as string)) {
    for (const entree of readdirSync(dossier as string)) {
      const chemin = join(dossier as string, entree);
      if (statSync(chemin).isDirectory()) candidats.push(join(chemin, nom));
    }
  }
  return candidats.find((candidat) => existsSync(candidat)) ?? null;
}

const alertes: Alerte[] = [];
for (const [sorte, description] of Object.entries(SORTES)) {
  const fichier = trouver(`${sorte}.txt`);
  if (fichier !== null) {
    alertes.push({ ...description, detail: readFileSync(fichier, "utf8") });
  }
}
if (alertes.length === 0) {
  // Une vérification a échoué sans laisser de détail (panne de l'atelier lui-même) : prévenir quand même.
  alertes.push({
    titre: "La surveillance de sécurité a échoué sans dire pourquoi",
    quoiFaire: ["Ouvrir le lien ci-dessous et lire quelle étape a échoué : ce peut être une simple panne passagère de l'atelier."],
    detail: "",
  });
}
writeFileSync(sortie, composerCourriel(alertes, { expediteur: EXPEDITEUR, destinataire: DESTINATAIRE, lien: LIEN, date: new Date() }));
console.log(`${String(alertes.length)} alerte(s) dans le courriel.`);
