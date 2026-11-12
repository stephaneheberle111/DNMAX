// SPDX-License-Identifier: AGPL-3.0-or-later
/*
 * Documents à imprimer quand l'enseignant active le module Élèves : la note
 * d'information des étudiants (avec un accusé de réception à signer) et la
 * note pour le chef d'établissement et le délégué à la protection des données.
 *
 * Ils reprennent les rubriques « RGPD » de la documentation du site, qui en
 * garde sa propre copie : l'application les produit sans connexion.
 * L'accusé de réception atteste que l'information a été remise ; ce n'est pas
 * un consentement (voir DECISIONS.md, « Durée de conservation des données d'élèves »).
 */

/** Ce qui personnalise les documents ; un champ vide laisse une zone à compléter à la main. */
export interface ChampsDocumentsRgpd {
  /** Nom de l'établissement. */
  etablissement: string;
  /** Nom de l'enseignant qui remet les documents. */
  enseignant: string;
  /** Années de conservation après la sortie de la promotion. */
  anneesConservation: number;
}

/** Document prêt à imprimer : un titre (aussi proposé comme nom du PDF) et son corps HTML. */
export interface DocumentImprimable {
  titre: string;
  html: string;
}

const ENTITES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Échappe un texte pour l'insérer dans du HTML, contenu ou valeur d'attribut. */
export function echapperHtml(texte: string): string {
  return texte.replace(/[&<>"']/g, (caractere) => ENTITES[caractere] ?? caractere);
}

/** Valeur saisie, échappée ; à défaut, la zone à compléter, entre crochets. */
function champ(valeur: string, aCompleter: string): string {
  const propre = valeur.replace(/\s+/g, " ").trim();
  return propre === ""
    ? `<span class="a-completer">[${echapperHtml(aCompleter)}]</span>`
    : `<strong>${echapperHtml(propre)}</strong>`;
}

/** « un an », « 2 ans » ; une durée invalide revient à la durée par défaut d'un an. */
export function ecrireDuree(annees: number): string {
  const entier = Number.isInteger(annees) && annees > 0 ? annees : 1;
  return entier === 1 ? "un an" : `${String(entier)} ans`;
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Note d'information des étudiants, suivie d'un accusé de réception à découper et à rendre signé. */
export function composerFicheEleves(champs: ChampsDocumentsRgpd): DocumentImprimable {
  const etablissement = champ(champs.etablissement, "nom de l'établissement");
  const enseignant = champ(champs.enseignant, "nom de l'enseignant");
  const html = `
<h1>Vos données dans le suivi de vos évaluations</h1>
<p class="contexte">Établissement : ${etablissement} · Enseignant : ${enseignant}</p>
<p>Pour évaluer vos compétences tout au long du DN MADE, vos enseignants peuvent utiliser l'application DNMAX. Elle enregistre votre prénom, votre nom, votre promotion, vos niveaux par compétence, leurs observations et leurs appréciations, et les dates de rendu de vos travaux.</p>
<p>Ces données servent uniquement à votre évaluation et au suivi de votre progression. Le responsable de ce traitement est ${etablissement}, représenté par son chef d'établissement, dans le cadre de sa mission d'enseignement. Vous n'avez donc pas à donner votre accord : cette note vous en informe.</p>
<p>Elles restent sur l'ordinateur de votre enseignant, chiffrées et protégées par un mot de passe. Elles ne sont ni envoyées sur Internet ni confiées à une entreprise. Votre enseignant peut les transmettre à un collègue de l'équipe pédagogique, dans un fichier protégé par un mot de passe.</p>
<p>Elles sont conservées jusqu'à ${ecrireDuree(champs.anneesConservation)} après la fin de votre diplôme, puis anonymisées ou effacées.</p>
<p>Vous pouvez demander à consulter vos données, à les faire corriger ou, dans les cas prévus par la loi, à les faire effacer, auprès de votre enseignant, de <span class="a-completer">[service ou personne à contacter]</span> ou du délégué à la protection des données de l'établissement : <span class="a-completer">[contact du délégué]</span>. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr).</p>
<p class="decoupe">Partie à découper et à rendre signée à votre enseignant. Gardez la note ci-dessus.</p>
<section class="accuse">
<h2>Accusé de réception</h2>
<p>Je reconnais avoir reçu la note d'information « Vos données dans le suivi de vos évaluations » (application DNMAX, ${etablissement}, enseignant : ${enseignant}).</p>
<p class="nuance">Cet accusé atteste seulement que l'information m'a été remise ; il ne s'agit pas d'un consentement.</p>
<table>
<tr><th>Prénom et nom de l'étudiant</th><td></td></tr>
<tr><th>Promotion</th><td></td></tr>
<tr><th>Date</th><td></td></tr>
<tr class="signature"><th>Signature de l'étudiant</th><td></td></tr>
<tr class="signature"><th>Signature du représentant légal, si l'étudiant est mineur</th><td></td></tr>
</table>
</section>`;
  return { titre: "Information des étudiants - DNMAX", html };
}

/** Note pour le chef d'établissement et le délégué à la protection des données. */
export function composerNoteEtablissement(champs: ChampsDocumentsRgpd): DocumentImprimable {
  const etablissement = champ(champs.etablissement, "nom de l'établissement");
  const enseignant = champ(champs.enseignant, "nom de l'enseignant");
  const html = `
<h1>DNMAX et le RGPD : note pour le chef d'établissement</h1>
<p class="contexte">Établissement : ${etablissement} · Transmise par : ${enseignant} · Date : <span class="a-completer">[date]</span></p>
<p>Cette note s'adresse au chef d'établissement et au délégué à la protection des données. ${enseignant} active le <strong>module Élèves</strong> de DNMAX pour évaluer ses étudiants ; sans ce module, DNMAX ne contient que des grilles d'évaluation et des référentiels, sans aucune donnée personnelle d'élève. Elle peut servir à compléter le registre des activités de traitement de l'établissement. Les étudiants en sont informés par une note remise en classe, dont ils signent l'accusé de réception.</p>
<table class="fiche">
<tr><th>Traitement</th><td>Évaluation par compétences des étudiants de DN MADE, avec l'application DNMAX installée sur l'ordinateur de l'enseignant.</td></tr>
<tr><th>Responsable du traitement</th><td>${etablissement}, représenté par son chef d'établissement. L'enseignant utilise DNMAX pour son compte.</td></tr>
<tr><th>Finalités</th><td>Construire les évaluations sur le référentiel du diplôme, saisir et suivre les acquis de chaque étudiant, restituer les résultats, préparer les bilans de la formation.</td></tr>
<tr><th>Base légale</th><td>Mission d'intérêt public de l'établissement (article 6.1.e du RGPD) : l'évaluation des étudiants fait partie de sa mission d'enseignement. Le consentement des étudiants n'est donc pas la base légale ; ils sont informés.</td></tr>
<tr><th>Personnes concernées</th><td>Les étudiants des promotions suivies par l'enseignant.</td></tr>
<tr><th>Données</th><td>Prénom, nom, promotion ; niveaux atteints par compétence ; observations et appréciations ; dates de rendu et de restitution ; mentions « non rendu » ou « dispensé ». Aucune donnée sensible ne doit être saisie dans les champs de texte libre (santé, situation familiale…).</td></tr>
<tr><th>Destinataires</th><td>L'enseignant ; les collègues de l'équipe pédagogique à qui il transmet volontairement une évaluation (fichier chiffré par mot de passe, ou échange direct d'ordinateur à ordinateur) ; l'étudiant pour ses propres résultats. L'éditeur de DNMAX et l'hébergeur du site n'y ont jamais accès.</td></tr>
<tr><th>Lieu de stockage</th><td>Uniquement l'ordinateur de l'enseignant, dans un fichier chiffré (XChaCha20-Poly1305, clé dérivée du mot de passe par Argon2id), avec dix sauvegardes quotidiennes chiffrées elles aussi. Aucun stockage en ligne, aucun transfert hors de l'Union européenne des données d'élèves.</td></tr>
<tr><th>Durée de conservation</th><td>${majuscule(ecrireDuree(champs.anneesConservation))} après la sortie de la promotion (fin de l'année scolaire où s'achève le diplôme). DNMAX le rappelle ensuite et propose d'anonymiser ou d'effacer les données ; une promotion peut aussi l'être plus tôt. La durée est réglable avec l'établissement.</td></tr>
<tr><th>Droits des étudiants</th><td>Accès, rectification, effacement et limitation, à exercer auprès de l'établissement. Dans DNMAX, Paramètres → « Données des élèves » permet d'exporter toutes les données d'un étudiant, de l'effacer partout, et d'anonymiser ou d'effacer une promotion.</td></tr>
<tr><th>Sécurité</th><td>Chiffrement de toutes les données saisies ; mot de passe demandé à chaque ouverture ; code de secours remis une seule fois. Les documents exportés (Word, tableur, PDF) ne sont pas chiffrés : DNMAX le rappelle à chaque export contenant des élèves.</td></tr>
</table>
<h2>Bonnes pratiques demandées aux enseignants</h2>
<ul>
<li>utiliser DNMAX sur un ordinateur protégé par un mot de passe de session, de préférence avec le chiffrement du disque activé ;</li>
<li>ne pas l'installer sur un poste partagé entre plusieurs personnes ;</li>
<li>ranger et supprimer les documents exportés avec le même soin qu'un relevé de notes ;</li>
<li>ne jamais écrire le nom d'un étudiant dans un signalement de bug ou une suggestion.</li>
</ul>
<p>Contact de l'éditeur : contact@dnmax.fr. Détails techniques : dnmax.fr, page Confidentialité.</p>`;
  return { titre: "Note RGPD pour l'établissement - DNMAX", html };
}
