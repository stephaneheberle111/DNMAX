// SPDX-License-Identifier: CECILL-2.1
import { defautsRobustesse, expliquerDefauts, motsInterditsDe } from "./domaine/robustesse-mot-de-passe";
import "./ecran-coffre.css";
import { deduireSysteme } from "./domaine/adresse-retours";
import { conseilsSelonSysteme } from "./domaine/bonnes-pratiques";
import { LONGUEUR_MAXIMALE_NOM, creerIdentite, type Identite } from "./domaine/identite";
import type { Entrees } from "./domaine/magasin-memoire";
import {
  LONGUEUR_MINIMALE_MOT_DE_PASSE,
  LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES,
  verifierNouveauMotDePasse,
  type DefautMotDePasse,
} from "./domaine/saisie-coffre";
import { moduleElevesActif } from "./domaine/securite";
import { DELAI_VERROUILLAGE_INACTIVITE_MS } from "./configuration";
import { svgDN, svgLogotype } from "./identite-pieces";
import {
  changerMotDePasse,
  creerCoffre,
  installerCoffre,
  ErreurCoffre,
  ouvrirCoffre,
  ouvrirCoffreParSecours,
  type CodeErreurCoffre,
} from "./enveloppe";

const MESSAGES_ERREUR: Record<CodeErreurCoffre, string> = {
  "mot-de-passe-trop-court": `Le mot de passe doit compter au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères.`,
  "acces-refuse": "Mot de passe ou code de secours incorrect.",
  "fichier-illisible":
    "Ce fichier de données est illisible, endommagé, ou n'est pas un fichier DNMAX. Pour vos propres données, des copies de sauvegarde se trouvent dans le dossier « sauvegardes ».",
  "version-inconnue":
    "Ces données ont été enregistrées par une version plus récente de DNMAX. Mettez l'application à jour pour les ouvrir.",
  "coffre-deja-present": "Des données protégées existent déjà sur cet ordinateur. Relancez l'application.",
  "coffre-absent": "Aucune donnée protégée n'a été trouvée sur cet ordinateur. Relancez l'application.",
  "coffre-verrouille": "Les données sont verrouillées. Relancez l'application.",
  "disque-inaccessible": "Impossible de lire ou d'écrire sur le disque. Vérifiez l'espace libre et réessayez.",
  "fichier-trop-volumineux": "Ce fichier est trop volumineux pour être un fichier d'échange DNMAX.",
  "sauvegarde-inconnue": "Cette sauvegarde n'est plus disponible. La liste a été mise à jour : choisissez-en une autre.",
  interne: "Une erreur inattendue s'est produite. Réessayez.",
};

const MESSAGES_DEFAUT_MOT_DE_PASSE: Record<DefautMotDePasse, string> = {
  "trop-court": MESSAGES_ERREUR["mot-de-passe-trop-court"],
  "confirmation-differente": "Les deux saisies du mot de passe ne sont pas identiques.",
};

export function messagePourErreur(erreur: unknown): string {
  return MESSAGES_ERREUR[erreur instanceof ErreurCoffre ? erreur.code : "interne"];
}

/** Nombre d'étapes de la page de bienvenue ; la dernière (la mention) suit l'ouverture des données (src/ecran-bienvenue.ts). */
export const NOMBRE_ETAPES_BIENVENUE = 4;

function marqueEtape(rang: number): string {
  return `<p class="bienvenue-etape">Étape ${String(rang)} sur ${String(NOMBRE_ETAPES_BIENVENUE)}</p>`;
}

/** Longueur maximale du nom de l'établissement saisi à la bienvenue. */
const LONGUEUR_MAXIMALE_ETABLISSEMENT = 120;

/**
 * Première page de bienvenue. Elle doit tenir dans la fenêtre sans défiler, à sa
 * taille minimale comprise : chaque conseil tient en une phrase, et ceux qui
 * dépendent du système (`data-role`) sont écrits à l'affichage pour l'ordinateur
 * utilisé seulement (src/domaine/bonnes-pratiques.ts).
 */
const GABARIT_BONNES_PRATIQUES = `
  ${marqueEtape(1)}
  <h1>Bienvenue dans DNMAX</h1>
  <p>En quatre étapes, DNMAX se prépare pour vous : votre nom et celui de votre établissement, un mot de passe
     qui chiffre vos données, puis votre mention, avec son référentiel et les trois promotions en cours.
     La visite guidée prendra ensuite le relais.</p>
  <p>Quelques réflexes protègent le reste de l'ordinateur&nbsp;; ce sont des conseils, rien ne vous empêche de continuer.</p>
  <ul class="coffre-pratiques">
    <li><b>Une session à vous, protégée par un mot de passe</b>, que vous ne partagez avec personne, même pour un instant.</li>
    <li><b>L'écran verrouillé dès que vous vous éloignez</b>&nbsp;: <span data-role="verrouillage"></span>.</li>
    <li><b>Le disque de l'ordinateur chiffré (conseillé)</b>, pour que rien ne soit lisible en cas de vol ou de perte.
        <span data-role="chiffrement"></span>.</li>
    <li><b>Des sauvegardes.</b> DNMAX fait chaque jour d'utilisation une copie chiffrée sur cet ordinateur&nbsp;; de temps en temps,
        emportez-en une sur une clé ou un disque externe avec «&nbsp;Échanger… &gt; Changer d'ordinateur&nbsp;».</li>
    <li><b>Les exports Word, Excel et OpenDocument ne sont pas chiffrés.</b> Rangez-les à l'abri et supprimez ceux qui
        contiennent des étudiant·es dès qu'ils ne servent plus.</li>
    <li><b>Le code de secours</b>, affiché après le choix du mot de passe, se garde sur papier, hors de l'ordinateur.</li>
  </ul>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions">
    <button type="button" class="lnk" data-role="transfert">J'ai déjà mes données sur un autre ordinateur</button>
    <button type="submit" class="btn primary">Commencer</button></div>`;

const GABARIT_PROFIL = `
  ${marqueEtape(2)}
  <h1>Vous et votre établissement</h1>
  <p>Votre prénom et votre nom signent les fichiers que vous envoyez à d'autres enseignant·es : chacun·e voit ainsi qui a écrit quoi.
     Le nom de l'établissement figure dans les documents remis aux étudiant·es.</p>
  <label>Votre prénom
    <input type="text" name="prenom" autocomplete="given-name" maxlength="${String(LONGUEUR_MAXIMALE_NOM)}" required></label>
  <label>Votre nom
    <input type="text" name="nom" autocomplete="family-name" maxlength="${String(LONGUEUR_MAXIMALE_NOM)}" required></label>
  <label>Nom de l'établissement
    <input type="text" name="etablissement" autocomplete="organization" maxlength="${String(LONGUEUR_MAXIMALE_ETABLISSEMENT)}" placeholder="Lycée …" required></label>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions"><button type="button" class="lnk" data-role="retour">← Retour</button>
    <button type="submit" class="btn primary">Continuer</button></div>`;

const GABARIT_CREATION = `
  ${marqueEtape(3)}
  <h1>Protégez vos données</h1>
  <p>DNMAX chiffre tout ce que vous saisissez — évaluations, étudiant·es, résultats — avant de l'écrire sur cet ordinateur.
     Choisissez un mot de passe : il vous sera demandé à chaque ouverture.</p>
  <label>Mot de passe (${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères au moins)
    <input type="password" name="motDePasse" autocomplete="new-password" required></label>
  <label>Mot de passe, une seconde fois
    <input type="password" name="confirmation" autocomplete="new-password" required></label>
  <p class="coffre-avertissement">Sans ce mot de passe ni le code de secours affiché à l'étape suivante, vos données
     sont définitivement illisibles&nbsp;: personne ne peut les récupérer.</p>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions">
    <button type="button" class="lnk" data-role="retour">← Retour</button>
    <button type="submit" class="btn primary">Créer mon espace protégé</button></div>`;

const GABARIT_CODE_SECOURS = `
  ${marqueEtape(3)}
  <h1>Notez votre code de secours</h1>
  <p>Si vous oubliez votre mot de passe, ce code est le seul moyen de retrouver vos données.
     Il ne sera plus jamais affiché : recopiez-le sur papier et rangez-le hors de cet ordinateur.</p>
  <div class="coffre-code" data-role="code"></div>
  <label class="coffre-case"><input type="checkbox" name="note" required> J'ai noté ce code en lieu sûr</label>
  <div class="coffre-actions"><span></span><button type="submit" class="btn primary">Continuer</button></div>`;

/** Planche 44 : le logotype au-dessus suffit à titrer l'écran, le titre reste pour les lecteurs d'écran. */
const GABARIT_OUVERTURE = `
  <h1 class="coffre-cache">Ouvrir DNMAX</h1>
  <label>Mot de passe
    <input type="password" name="motDePasse" autocomplete="current-password" required></label>
  <p class="coffre-erreur" role="alert" hidden></p>
  <button type="submit" class="btn primary">Ouvrir</button>
  <button type="button" class="lnk" data-role="oubli">Mot de passe oublié ?</button>`;

const GABARIT_SECOURS = `
  <h1>Mot de passe oublié</h1>
  <p>Saisissez votre code de secours (le dernier qui vous a été remis), puis choisissez un nouveau mot de passe.</p>
  <label>Code de secours
    <input type="text" name="codeSecours" autocomplete="off" spellcheck="false" required></label>
  <label>Nouveau mot de passe (${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères au moins)
    <input type="password" name="motDePasse" autocomplete="new-password" required></label>
  <label>Nouveau mot de passe, une seconde fois
    <input type="password" name="confirmation" autocomplete="new-password" required></label>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions">
    <button type="button" class="lnk" data-role="retour">← Retour</button>
    <button type="submit" class="btn primary">Ouvrir et changer le mot de passe</button></div>`;

const GABARIT_RENFORCEMENT = `
  <h1>Un mot de passe plus solide</h1>
  <p>Le module Étudiant·es est actif : vos données contiennent les noms et les résultats de vos étudiant·es.
     Il faut un mot de passe de ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)} caractères au moins, avec trois types de caractères
     (minuscules, majuscules, chiffres, symboles), sans suite toute faite, sans DNMAX ni votre nom ni celui de l'établissement.
     Une courte phrase avec un chiffre convient très bien.</p>
  <label>Nouveau mot de passe
    <input type="password" name="motDePasse" autocomplete="new-password" required></label>
  <label>Nouveau mot de passe, une seconde fois
    <input type="password" name="confirmation" autocomplete="new-password" required></label>
  <p>Votre code de secours reste le même.</p>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions"><span></span><button type="submit" class="btn primary">Changer et ouvrir</button></div>`;

const MESSAGE_VERROUILLAGE = `DNMAX s'est verrouillé après ${String(
  Math.round(DELAI_VERROUILLAGE_INACTIVITE_MS / 60_000),
)} minutes sans activité. Vos modifications ont été enregistrées.`;

/** Lit un champ texte du formulaire ; un champ absent vaut une saisie vide. */
function lireChamp(formulaire: HTMLFormElement, nom: string): string {
  const champ = formulaire.elements.namedItem(nom);
  return champ instanceof HTMLInputElement ? champ.value : "";
}

function afficherErreur(formulaire: HTMLFormElement, message: string): void {
  const zone = formulaire.querySelector(".coffre-erreur");
  if (zone instanceof HTMLElement) {
    zone.textContent = message;
    zone.hidden = false;
  }
}

/** Les cinq couches du bandeau gaufré : ombres et lumières décalées, puis le texte (défini dans index.html, `#bandeau-texte`). */
const COUCHES_BANDEAU = `
  <use href="#bandeau-texte" class="gaufre-ombre-large" transform="translate(-0.45 -1.00)"/>
  <use href="#bandeau-texte" class="gaufre-lumiere-large" transform="translate(0.45 1.00)"/>
  <use href="#bandeau-texte" class="gaufre-ombre" transform="translate(-0.23 -0.50)"/>
  <use href="#bandeau-texte" class="gaufre-lumiere" transform="translate(0.23 0.50)"/>
  <use href="#bandeau-texte" class="gaufre-fond"/>`;

/** Une copie du bandeau gaufré : `classe` vaut « sur-petrole » pour celle qui se lit sur le volet. */
function svgBandeau(classe = ""): string {
  return `<svg class="bandeau-gaufre ${classe}" viewBox="0 0 1200 16" focusable="false">${COUCHES_BANDEAU}</svg>`;
}

/**
 * Écran d'ouverture de la série 8 (planche 44) : à gauche, le volet pétrole avec
 * le DN en pièces ; à droite, le logotype puis le formulaire ; en bas, le bandeau
 * gaufré, aux couleurs du volet à gauche de la coupure et du papier à droite.
 * Le bandeau est dessiné deux fois, l'un sur l'autre : les styles ne gardent de
 * chaque copie que son côté de la coupure, où qu'elle tombe (au milieu à
 * l'ouverture, plus à gauche pendant la bienvenue).
 */
const GABARIT_ECRAN = `
  <div class="coffre-volet" aria-hidden="true">
    ${svgDN("coffre-dn")}
    <p class="coffre-volet-mots"><span class="coffre-mot-art">Métiers d’art</span><span class="coffre-mot-design">Design</span></p>
  </div>
  <div class="coffre-colonne">
    ${svgLogotype("coffre-logotype")}
    <div class="coffre-place"></div>
  </div>
  <div class="coffre-bandeau" aria-hidden="true">${svgBandeau("sur-petrole")}${svgBandeau()}</div>`;

/**
 * Crée l'écran du coffre (aussi celui de la bienvenue) et rend l'écran entier,
 * à placer dans la page, et la place où vont ses formulaires successifs.
 */
export function creerEcranCoffre(): { ecran: HTMLElement; place: HTMLElement } {
  const ecran = document.createElement("div");
  ecran.className = "ecran-coffre";
  // Gabarit fixe de ce fichier, sans aucune donnée saisie.
  ecran.innerHTML = GABARIT_ECRAN;
  const place = ecran.querySelector<HTMLElement>(".coffre-place") ?? ecran;
  return { ecran, place };
}

/**
 * Remplace le formulaire affiché dans `place` par `gabarit` et rend le formulaire créé.
 * Les gabarits sont des textes fixes de ce fichier : aucune donnée saisie n'y est injectée.
 */
function afficherFormulaire(place: HTMLElement, gabarit: string): HTMLFormElement {
  const formulaire = document.createElement("form");
  formulaire.innerHTML = gabarit;
  place.replaceChildren(formulaire);
  formulaire.querySelector("input")?.focus();
  return formulaire;
}

/**
 * Branche la soumission du formulaire sur `action` : bouton désactivé pendant
 * le travail (la dérivation de clé prend volontairement du temps), message
 * d'erreur affiché en cas d'échec.
 */
function brancherSoumission(formulaire: HTMLFormElement, action: () => Promise<void>): void {
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const bouton = formulaire.querySelector("button[type=submit]");
    if (!(bouton instanceof HTMLButtonElement) || bouton.disabled) {
      return;
    }
    bouton.disabled = true;
    action()
      .catch((erreur: unknown) => {
        afficherErreur(formulaire, messagePourErreur(erreur));
      })
      .finally(() => {
        bouton.disabled = false;
      });
  });
}

/** Signale à l'enseignant un défaut du nouveau mot de passe saisi ; rend `true` s'il y en a un. */
function signalerDefautMotDePasse(
  formulaire: HTMLFormElement,
  longueurMinimale: number = LONGUEUR_MINIMALE_MOT_DE_PASSE,
): boolean {
  const defaut = verifierNouveauMotDePasse(
    lireChamp(formulaire, "motDePasse"),
    lireChamp(formulaire, "confirmation"),
    longueurMinimale,
  );
  if (defaut !== null) {
    afficherErreur(
      formulaire,
      defaut === "trop-court"
        ? `Le mot de passe doit compter au moins ${String(longueurMinimale)} caractères.`
        : MESSAGES_DEFAUT_MOT_DE_PASSE[defaut],
    );
  }
  return defaut !== null;
}

function montrerBonnesPratiques(ecran: HTMLElement, terminer: (ouverture: OuvertureCoffre) => void, profil: Profil | null = null): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_BONNES_PRATIQUES);
  formulaire.classList.add("coffre-large");
  const conseils = conseilsSelonSysteme(deduireSysteme(navigator.userAgent));
  const verrouillage = formulaire.querySelector("[data-role=verrouillage]");
  const chiffrement = formulaire.querySelector("[data-role=chiffrement]");
  if (verrouillage && chiffrement) {
    verrouillage.textContent = conseils.verrouillage;
    chiffrement.textContent = conseils.chiffrement;
  }
  formulaire.querySelector<HTMLButtonElement>("button[type=submit]")?.focus();
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    montrerProfil(ecran, terminer, profil);
  });
  formulaire.querySelector("[data-role=transfert]")?.addEventListener("click", () => {
    installerCoffre()
      .then((installe) => {
        if (installe) {
          // Les données transférées s'ouvrent avec le mot de passe de l'ancien ordinateur, et portent déjà le nom de l'enseignant.
          montrerOuverture(ecran, terminer);
        }
      })
      .catch((erreur: unknown) => {
        afficherErreur(formulaire, messagePourErreur(erreur));
      });
  });
}

/** Ce que l'enseignant a saisi à la bienvenue, avant que ses données n'existent. */
export interface Profil {
  prenom: string;
  nom: string;
  etablissement: string;
}

/** Données ouvertes ; `profil` n'est renseigné qu'à la création, quand la bienvenue l'a demandé. */
export interface OuvertureCoffre {
  entrees: Entrees;
  profil: Profil | null;
}

function remplirChamp(formulaire: HTMLFormElement, nom: string, valeur: string): void {
  const champ = formulaire.elements.namedItem(nom);
  if (champ instanceof HTMLInputElement) {
    champ.value = valeur;
  }
}

function montrerProfil(ecran: HTMLElement, terminer: (ouverture: OuvertureCoffre) => void, precedent: Profil | null): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_PROFIL);
  if (precedent !== null) {
    remplirChamp(formulaire, "prenom", precedent.prenom);
    remplirChamp(formulaire, "nom", precedent.nom);
    remplirChamp(formulaire, "etablissement", precedent.etablissement);
  }
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    const profil: Profil = {
      prenom: lireChamp(formulaire, "prenom").trim(),
      nom: lireChamp(formulaire, "nom").trim(),
      etablissement: lireChamp(formulaire, "etablissement").trim(),
    };
    if (creerIdentite(profil.prenom, profil.nom, "verification") === null || profil.etablissement === "") {
      afficherErreur(formulaire, "Indiquez votre prénom, votre nom et celui de votre établissement pour continuer.");
      return;
    }
    montrerCreation(ecran, terminer, profil);
  });
  formulaire.querySelector("[data-role=retour]")?.addEventListener("click", () => {
    montrerBonnesPratiques(ecran, terminer);
  });
}

/**
 * Termine l'ouverture des données. Si le module Étudiants est actif et que le mot
 * de passe qui vient de servir est trop court, en fait d'abord choisir un plus
 * long : c'est le seul moment où l'interface connaît ce mot de passe, qu'elle
 * ne conserve pas.
 */
function terminerOuverture(
  ecran: HTMLElement,
  motDePasse: string,
  entrees: Entrees,
  terminer: (entrees: Entrees) => void,
): void {
  const motsInterdits = motsInterditsDe(entrees);
  if (!moduleElevesActif(entrees) || defautsRobustesse(motDePasse, motsInterdits).length === 0) {
    terminer(entrees);
    return;
  }
  const formulaire = afficherFormulaire(ecran, GABARIT_RENFORCEMENT);
  brancherSoumission(formulaire, async () => {
    if (signalerDefautMotDePasse(formulaire, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)) {
      return;
    }
    const defauts = defautsRobustesse(lireChamp(formulaire, "motDePasse"), motsInterdits);
    if (defauts.length > 0) {
      afficherErreur(formulaire, expliquerDefauts(defauts));
      return;
    }
    await changerMotDePasse(motDePasse, lireChamp(formulaire, "motDePasse"));
    terminer(entrees);
  });
}

function montrerCreation(ecran: HTMLElement, terminer: (ouverture: OuvertureCoffre) => void, profil: Profil): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_CREATION);
  brancherSoumission(formulaire, async () => {
    if (signalerDefautMotDePasse(formulaire)) {
      return;
    }
    const codeSecours = await creerCoffre(lireChamp(formulaire, "motDePasse"));
    montrerCodeSecours(ecran, codeSecours, () => {
      // Un coffre qui vient d'être créé est vide.
      terminer({ entrees: {}, profil });
    });
  });
  formulaire.querySelector("[data-role=retour]")?.addEventListener("click", () => {
    montrerProfil(ecran, terminer, profil);
  });
}

function montrerCodeSecours(ecran: HTMLElement, codeSecours: string, continuer: () => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_CODE_SECOURS);
  const zoneCode = formulaire.querySelector("[data-role=code]");
  if (zoneCode !== null) {
    zoneCode.textContent = codeSecours;
  }
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    continuer();
  });
}

function montrerOuverture(ecran: HTMLElement, terminer: (ouverture: OuvertureCoffre) => void, verrouilleParInactivite = false): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_OUVERTURE);
  formulaire.classList.add("coffre-ouverture");
  if (verrouilleParInactivite) {
    const avis = document.createElement("p");
    avis.className = "coffre-avis";
    avis.setAttribute("role", "status");
    avis.textContent = MESSAGE_VERROUILLAGE;
    formulaire.querySelector("h1")?.after(avis);
  }
  brancherSoumission(formulaire, async () => {
    const motDePasse = lireChamp(formulaire, "motDePasse");
    terminerOuverture(ecran, motDePasse, await ouvrirCoffre(motDePasse), (entrees) => {
      terminer({ entrees, profil: null });
    });
  });
  formulaire.querySelector("[data-role=oubli]")?.addEventListener("click", () => {
    montrerSecours(ecran, terminer);
  });
}

function montrerSecours(ecran: HTMLElement, terminer: (ouverture: OuvertureCoffre) => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_SECOURS);
  brancherSoumission(formulaire, async () => {
    if (signalerDefautMotDePasse(formulaire)) {
      return;
    }
    const motDePasse = lireChamp(formulaire, "motDePasse");
    terminerOuverture(ecran, motDePasse, await ouvrirCoffreParSecours(lireChamp(formulaire, "codeSecours"), motDePasse), (entrees) => {
      terminer({ entrees, profil: null });
    });
  });
  formulaire.querySelector("[data-role=retour]")?.addEventListener("click", () => {
    montrerOuverture(ecran, terminer);
  });
}

/**
 * Affiche l'écran de création ou d'ouverture du coffre et rend les données
 * de l'enseignant une fois le coffre ouvert. L'écran se retire alors de la page.
 *
 * Au tout premier lancement (pas encore de coffre), c'est la page de
 * bienvenue : conseils, nom de l'enseignant et de l'établissement, puis mot
 * de passe et code de secours. Le profil saisi est rendu avec les données.
 *
 * @param verrouilleParInactivite explique à l'enseignant pourquoi le mot de passe est redemandé
 */
export function demanderOuvertureCoffre(coffreExiste: boolean, verrouilleParInactivite = false): Promise<OuvertureCoffre> {
  return new Promise((resoudre) => {
    const { ecran, place } = creerEcranCoffre();
    document.body.prepend(ecran);
    const terminer = (ouverture: OuvertureCoffre): void => {
      ecran.remove();
      resoudre(ouverture);
    };
    if (coffreExiste) {
      montrerOuverture(place, terminer, verrouilleParInactivite);
    } else {
      montrerBonnesPratiques(place, terminer);
    }
  });
}

const GABARIT_IDENTITE = `
  <h1>Qui êtes-vous ?</h1>
  <p>Votre prénom et votre nom accompagnent ce que vous modifiez et signent les fichiers que vous envoyez à d'autres enseignant·es :
     chacun·e voit ainsi qui a écrit quoi.</p>
  <label>Votre prénom
    <input type="text" name="prenom" autocomplete="given-name" maxlength="${String(LONGUEUR_MAXIMALE_NOM)}" required></label>
  <label>Votre nom
    <input type="text" name="nom" autocomplete="family-name" maxlength="${String(LONGUEUR_MAXIMALE_NOM)}" required></label>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions"><span></span><button type="submit" class="btn primary">Continuer</button></div>`;

/**
 * Demande son nom à l'enseignant et rend son identité. L'écran reste affiché
 * tant que le nom saisi est vide.
 *
 * @param genererIdentifiant fournit l'identifiant de l'installation (passé en paramètre pour rester testable).
 */
export function demanderIdentite(genererIdentifiant: () => string): Promise<Identite> {
  return new Promise((resoudre) => {
    const { ecran, place } = creerEcranCoffre();
    document.body.prepend(ecran);
    const formulaire = afficherFormulaire(place, GABARIT_IDENTITE);
    formulaire.addEventListener("submit", (evenement) => {
      evenement.preventDefault();
      const identite = creerIdentite(lireChamp(formulaire, "prenom"), lireChamp(formulaire, "nom"), genererIdentifiant());
      if (identite === null) {
        afficherErreur(formulaire, "Indiquez votre prénom et votre nom pour continuer.");
        return;
      }
      ecran.remove();
      resoudre(identite);
    });
  });
}

/** Affiche ou retire le bandeau qui prévient que les dernières modifications ne sont pas sur le disque. */
export function signalerEnregistrement(reussi: boolean, erreur?: unknown): void {
  const existant = document.querySelector(".bandeau-enregistrement");
  if (reussi) {
    existant?.remove();
    return;
  }
  const bandeau = existant ?? document.createElement("div");
  bandeau.className = "bandeau-enregistrement";
  bandeau.setAttribute("role", "alert");
  bandeau.textContent = `Vos dernières modifications ne sont pas enregistrées. ${messagePourErreur(erreur)}`;
  if (existant === null) {
    document.body.prepend(bandeau);
  }
}
