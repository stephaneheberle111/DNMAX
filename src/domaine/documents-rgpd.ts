// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Documents à remettre quand l'enseignant active le module Élèves : la note
 * d'information aux étudiants (avec un accusé de réception à signer) et la
 * note au chef d'établissement et au délégué à la protection des données.
 *
 * Ils reprennent les rubriques « RGPD » de la documentation du site, qui en
 * garde sa propre copie : l'application les produit sans connexion.
 * Aucun nom de personne n'y figure : ils engagent l'établissement, pas un
 * enseignant ni un chef d'établissement nommé. L'accusé de réception atteste
 * que l'information a été remise ; ce n'est pas un consentement (voir
 * DECISIONS.md, « Durée de conservation des données d'élèves »).
 */
import { ecrireDateLongue } from "./date-longue";
import { gras, lien, texte, type Bloc, type DocumentImprimable } from "./document-imprimable";
import { estObjet } from "./echange/modele";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES } from "./saisie-coffre";

/** Ce que l'enseignant a saisi dans Mon établissement > Établissement. */
export interface SaisieEtablissement {
  /** Nom de l'établissement. */
  nom: string;
  /** Contact du délégué à la protection des données : adresse, téléphone ou service. */
  contactDelegue: string;
}

/** Champ de « Mon établissement » sans lequel les documents ne sont pas produits. */
export type ChampManquant = keyof SaisieEtablissement;

/** Tout ce qui remplit les documents. */
export interface ChampsDocumentsRgpd extends SaisieEtablissement {
  /** Années de conservation après la sortie de la promotion. */
  anneesConservation: number;
  /** Date imprimée sur les documents. */
  date: Date;
  /** Adresse du code source de DNMAX, citée dans la note au chef d'établissement. */
  adresseCodeSource: string;
  /** Minutes sans activité après lesquelles DNMAX se verrouille, avec le module Élèves. */
  minutesVerrouillage: number;
}

/**
 * Lit les champs utiles aux documents dans l'objet `etab` de l'interface
 * historique (`nom`, `contactDpo`), qui n'est pas typé : ce qui n'est pas une
 * chaîne compte pour vide.
 */
export function lireSaisieEtablissement(valeur: unknown): SaisieEtablissement {
  const lire = (cle: string): string => {
    const champ = estObjet(valeur) ? valeur[cle] : undefined;
    return typeof champ === "string" ? champ : "";
  };
  return { nom: lire("nom"), contactDelegue: lire("contactDpo") };
}

/** Espaces multiples et retours à la ligne ramenés à une espace, bords retirés. */
function nettoyer(valeur: string): string {
  return valeur.replace(/\s+/g, " ").trim();
}

/** Les champs obligatoires restés vides (ou blancs), dans l'ordre du formulaire. */
export function champsManquants(saisie: SaisieEtablissement): ChampManquant[] {
  const manquants: ChampManquant[] = [];
  if (nettoyer(saisie.nom) === "") {
    manquants.push("nom");
  }
  if (nettoyer(saisie.contactDelegue) === "") {
    manquants.push("contactDelegue");
  }
  return manquants;
}

/** Champs nettoyés ; lève une erreur si un champ obligatoire manque, pour ne jamais produire un document à trous. */
function exigerChamps(champs: ChampsDocumentsRgpd): { etablissement: string; delegue: string; date: string } {
  const manquants = champsManquants(champs);
  if (manquants.length > 0) {
    throw new Error(`champs manquants : ${manquants.join(", ")}`);
  }
  return { etablissement: nettoyer(champs.nom), delegue: nettoyer(champs.contactDelegue), date: ecrireDateLongue(champs.date) };
}

/** « un an », « 2 ans » ; une durée invalide revient à la durée par défaut d'un an. */
export function ecrireDuree(annees: number): string {
  const entier = Number.isInteger(annees) && annees > 0 ? annees : 1;
  return entier === 1 ? "un an" : `${String(entier)} ans`;
}

function majuscule(valeur: string): string {
  return valeur.charAt(0).toUpperCase() + valeur.slice(1);
}

export const TITRE_FICHE_ELEVES = "Information aux étudiants";
export const TITRE_NOTE_ETABLISSEMENT = "Note au chef d'établissement";

/** Note d'information aux étudiants, suivie d'un accusé de réception à découper et à rendre signé : une seule page. */
export function composerFicheEleves(champs: ChampsDocumentsRgpd): DocumentImprimable {
  const { etablissement, delegue, date } = exigerChamps(champs);
  const page: Bloc[] = [
    { type: "titre", texte: TITRE_FICHE_ELEVES },
    { type: "sous-titre", texte: "Vos données dans le suivi de vos évaluations" },
    { type: "contexte", contenu: [texte("Établissement : "), gras(etablissement), texte(` · ${date}`)] },
    {
      type: "paragraphe",
      contenu: [
        texte(
          "Pour évaluer vos compétences tout au long du DN MADE, vos enseignants peuvent utiliser l'application DNMAX. Elle enregistre votre prénom, votre nom, votre promotion, vos niveaux par compétence, leurs observations et leurs appréciations, et les dates de rendu de vos travaux.",
        ),
      ],
    },
    {
      type: "paragraphe",
      contenu: [
        texte(
          "Ces données servent uniquement à votre évaluation et au suivi de votre progression. Le responsable de ce traitement est ",
        ),
        gras(etablissement),
        texte(
          ", représenté par son chef d'établissement, dans le cadre de sa mission d'enseignement. Vous n'avez donc pas à donner votre accord : cette note vous en informe.",
        ),
      ],
    },
    {
      type: "paragraphe",
      contenu: [
        texte(
          "Elles restent sur l'ordinateur de votre enseignant, chiffrées et protégées par un mot de passe. Elles ne sont ni envoyées sur Internet ni confiées à une entreprise. Votre enseignant peut les transmettre à un collègue de l'équipe pédagogique, dans un fichier protégé par un mot de passe ou directement d'ordinateur à ordinateur sur le réseau local, protégées de la même façon.",
        ),
      ],
    },
    {
      type: "paragraphe",
      contenu: [
        texte(
          `Elles sont conservées jusqu'à ${ecrireDuree(champs.anneesConservation)} après la fin de votre diplôme, puis anonymisées ou effacées.`,
        ),
      ],
    },
    {
      type: "paragraphe",
      contenu: [
        texte(
          "Vous pouvez demander à consulter vos données, à les faire corriger ou, dans les cas prévus par la loi, à les faire effacer, auprès de votre enseignant ou du délégué à la protection des données de l'établissement : ",
        ),
        gras(delegue),
        texte(". Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr)."),
      ],
    },
    { type: "decoupe", texte: "Partie à découper et à rendre signée à votre enseignant. Gardez la note ci-dessus." },
    {
      type: "insecable",
      blocs: [
        { type: "intertitre", texte: "Accusé de réception" },
        {
          type: "paragraphe",
          contenu: [
            texte(`Je reconnais avoir reçu la note « ${TITRE_FICHE_ELEVES} » sur le suivi de mes évaluations avec l'application DNMAX (`),
            gras(etablissement),
            texte(")."),
          ],
        },
        {
          type: "tableau",
          lignes: [
            { intitule: "Prénom et nom de l'étudiant", contenu: [], aRemplir: "ligne" },
            { intitule: "Promotion", contenu: [], aRemplir: "ligne" },
            { intitule: "Date", contenu: [], aRemplir: "ligne" },
            { intitule: "Signature de l'étudiant", contenu: [], aRemplir: "signature" },
            {
              intitule: "Signature du représentant légal, si l'étudiant est mineur",
              contenu: [],
              aRemplir: "signature",
            },
          ],
        },
      ],
    },
  ];
  return { titre: TITRE_FICHE_ELEVES, nomFichier: `DNMAX - ${TITRE_FICHE_ELEVES}.pdf`, pages: [page] };
}

/** Note au chef d'établissement et au délégué à la protection des données : deux pages. */
export function composerNoteEtablissement(champs: ChampsDocumentsRgpd): DocumentImprimable {
  const { etablissement, delegue, date } = exigerChamps(champs);
  const premiere: Bloc[] = [
    { type: "titre", texte: TITRE_NOTE_ETABLISSEMENT },
    { type: "sous-titre", texte: "DNMAX et le RGPD : les données des étudiants" },
    { type: "contexte", contenu: [texte("Établissement : "), gras(etablissement), texte(` · ${date}`)] },
    {
      type: "paragraphe",
      contenu: [
        texte(
          "Cette note s'adresse au chef d'établissement et au délégué à la protection des données. Un enseignant de l'établissement active le module Élèves de DNMAX pour évaluer ses étudiants ; sans ce module, DNMAX ne contient que des grilles d'évaluation et des référentiels, sans aucune donnée personnelle d'élève. Elle peut servir à compléter le registre des activités de traitement de l'établissement. Les étudiants en sont informés par une note remise en classe, dont ils signent l'accusé de réception.",
        ),
      ],
    },
    {
      type: "tableau",
      lignes: [
        {
          intitule: "Traitement",
          contenu: [
            texte(
              "Évaluation par compétences des étudiants de DN MADE, avec l'application DNMAX installée sur l'ordinateur de l'enseignant.",
            ),
          ],
        },
        {
          intitule: "Responsable du traitement",
          contenu: [
            gras(etablissement),
            texte(", représenté par son chef d'établissement. L'enseignant utilise DNMAX pour son compte."),
          ],
        },
        { intitule: "Délégué à la protection des données", contenu: [gras(delegue)] },
        {
          intitule: "Finalités",
          contenu: [
            texte(
              "Construire les évaluations sur le référentiel du diplôme, saisir et suivre les acquis de chaque étudiant, restituer les résultats, préparer les bilans de la formation.",
            ),
          ],
        },
        {
          intitule: "Base légale",
          contenu: [
            texte(
              "Mission d'intérêt public de l'établissement (article 6.1.e du RGPD) : l'évaluation des étudiants fait partie de sa mission d'enseignement. Le consentement des étudiants n'est donc pas la base légale ; ils sont informés.",
            ),
          ],
        },
        { intitule: "Personnes concernées", contenu: [texte("Les étudiants des promotions suivies par l'enseignant.")] },
        {
          intitule: "Données",
          contenu: [
            texte(
              "Prénom, nom, promotion ; niveaux atteints par compétence ; observations et appréciations ; dates de rendu et de restitution ; mentions « non rendu » ou « dispensé ». Aucune donnée sensible ne doit être saisie dans les champs de texte libre (santé, situation familiale…).",
            ),
          ],
        },
        {
          intitule: "Destinataires",
          contenu: [
            texte(
              "L'enseignant ; les collègues de l'équipe pédagogique à qui il transmet volontairement une évaluation (fichier chiffré par mot de passe, ou échange direct d'ordinateur à ordinateur) ; l'étudiant pour ses propres résultats. L'éditeur de DNMAX et l'hébergeur du site n'y ont jamais accès.",
            ),
          ],
        },
      ],
    },
  ];
  const seconde: Bloc[] = [
    {
      type: "tableau",
      lignes: [
        {
          intitule: "Lieu de stockage",
          contenu: [
            texte(
              "Uniquement l'ordinateur de l'enseignant, dans un fichier chiffré (XChaCha20-Poly1305, clé dérivée du mot de passe par Argon2id), avec dix sauvegardes quotidiennes chiffrées elles aussi. Aucun stockage en ligne, aucun transfert hors de l'Union européenne des données d'élèves.",
            ),
          ],
        },
        {
          intitule: "Durée de conservation",
          contenu: [
            texte(
              `${majuscule(ecrireDuree(champs.anneesConservation))} après la sortie de la promotion (fin de l'année scolaire où s'achève le diplôme). DNMAX le rappelle ensuite et propose d'anonymiser ou d'effacer les données ; une promotion peut aussi l'être plus tôt. La durée est réglable avec l'établissement.`,
            ),
          ],
        },
        {
          intitule: "Droits des étudiants",
          contenu: [
            texte(
              "Accès, rectification, effacement et limitation, à exercer auprès de l'enseignant ou du délégué à la protection des données. Dans DNMAX, Paramètres > Données des élèves permet d'exporter toutes les données d'un étudiant, de l'effacer partout, et d'anonymiser ou d'effacer une promotion.",
            ),
          ],
        },
        {
          intitule: "Sécurité",
          contenu: [
            texte(
              `Chiffrement de toutes les données saisies ; mot de passe d'au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)} caractères, demandé à chaque ouverture ; verrouillage après ${String(champs.minutesVerrouillage)} minutes sans activité ; code de secours remis une seule fois. Les documents exportés (Word, tableur, PDF) ne sont pas chiffrés : DNMAX le rappelle à chaque export contenant des élèves.`,
            ),
          ],
        },
      ],
    },
    { type: "intertitre", texte: "Bonnes pratiques demandées aux enseignants" },
    {
      type: "liste",
      elements: [
        [
          texte(
            "utiliser DNMAX sur un ordinateur protégé par un mot de passe de session, de préférence avec le chiffrement du disque activé ;",
          ),
        ],
        [texte("ne pas l'installer sur un poste partagé entre plusieurs personnes ;")],
        [texte("ranger et supprimer les documents exportés avec le même soin qu'un relevé de notes ;")],
        [texte("ne jamais écrire le nom d'un étudiant dans un signalement de bug ou une suggestion.")],
      ],
    },
    { type: "intertitre", texte: "Pour en savoir plus" },
    {
      type: "paragraphe",
      contenu: [
        texte(
          "DNMAX est un logiciel libre (licence AGPL-3.0-or-later) : son code source est public et peut être vérifié par l'établissement ou par toute personne qu'il mandate.",
        ),
      ],
    },
    { type: "paragraphe", contenu: [texte("Code source : "), lien(champs.adresseCodeSource)] },
    {
      type: "paragraphe",
      contenu: [texte("Contact de l'éditeur : contact@dnmax.fr. Détails techniques : dnmax.fr, page Confidentialité.")],
    },
  ];
  return {
    titre: TITRE_NOTE_ETABLISSEMENT,
    nomFichier: `DNMAX - ${TITRE_NOTE_ETABLISSEMENT}.pdf`,
    pages: [premiere, seconde],
  };
}
