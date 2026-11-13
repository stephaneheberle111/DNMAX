// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-coffre.css";
import { LONGUEUR_MAXIMALE_NOM, creerIdentite, type Identite } from "./domaine/identite";
import type { Entrees } from "./domaine/magasin-memoire";
import {
  LONGUEUR_MINIMALE_MOT_DE_PASSE,
  LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES,
  estAssezLong,
  verifierNouveauMotDePasse,
  type DefautMotDePasse,
} from "./domaine/saisie-coffre";
import { moduleElevesActif } from "./domaine/securite";
import { DELAI_VERROUILLAGE_INACTIVITE_MS } from "./configuration";
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
    "Ce fichier de données est illisible, endommagé, ou n'est pas un fichier DNMAX. Pour vos propres données, des copies quotidiennes se trouvent dans le dossier « sauvegardes ».",
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

const GABARIT_BONNES_PRATIQUES = `
  <h1>Avant de commencer</h1>
  <p>DNMAX chiffre vos données par votre mot de passe. Quelques réflexes protègent le reste de l'ordinateur ;
     ce sont des conseils, rien ne vous empêche de continuer.</p>
  <ul class="coffre-pratiques">
    <li><b>Une session à vous, protégée par un mot de passe.</b> Ne partagez ni votre session ni l'ordinateur
        avec d'autres personnes, même pour un instant.</li>
    <li><b>L'écran verrouillé dès que vous vous éloignez</b>&nbsp;: Windows + L, Ctrl + Cmd + Q sur Mac, Super + L sous Linux.</li>
    <li><b>Le disque de l'ordinateur chiffré (conseillé).</b> En cas de vol ou de perte, rien n'est lisible.
      <ul>
        <li>Windows&nbsp;: BitLocker, ou «&nbsp;Chiffrement de l'appareil&nbsp;», s'active dans Paramètres › Confidentialité et sécurité.</li>
        <li>macOS&nbsp;: FileVault s'active dans Réglages Système › Confidentialité et sécurité.</li>
        <li>Linux&nbsp;: LUKS se choisit à l'installation du système («&nbsp;chiffrer le disque&nbsp;»).</li>
      </ul></li>
    <li><b>Des sauvegardes.</b> DNMAX garde chaque jour une copie chiffrée sur cet ordinateur ; de temps en temps,
        emportez-en une sur une clé ou un disque externe avec «&nbsp;Échanger… › Changer d'ordinateur&nbsp;».</li>
    <li><b>Les exports Word et Excel ne sont pas chiffrés.</b> Rangez-les à l'abri et supprimez ceux qui
        contiennent des élèves dès qu'ils ne servent plus.</li>
    <li><b>Le code de secours</b>, affiché à l'étape suivante, se garde sur papier, hors de l'ordinateur.</li>
  </ul>
  <div class="coffre-actions"><span></span><button type="submit" class="btn primary">J'ai compris, continuer</button></div>`;

const GABARIT_CREATION = `
  <h1>Protégez vos données</h1>
  <p>DNMAX chiffre tout ce que vous saisissez — évaluations, élèves, résultats — avant de l'écrire sur cet ordinateur.
     Choisissez un mot de passe : il vous sera demandé à chaque ouverture.</p>
  <label>Mot de passe (${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères au moins)
    <input type="password" name="motDePasse" autocomplete="new-password" required></label>
  <label>Mot de passe, une seconde fois
    <input type="password" name="confirmation" autocomplete="new-password" required></label>
  <p class="coffre-avertissement">Sans ce mot de passe ni le code de secours affiché à l'étape suivante, vos données
     sont définitivement illisibles : personne ne peut les récupérer.</p>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions">
    <button type="button" class="lnk" data-role="transfert">J'ai déjà mes données sur un autre ordinateur</button>
    <button type="submit" class="btn primary">Créer mon espace protégé</button></div>`;

const GABARIT_CODE_SECOURS = `
  <h1>Notez votre code de secours</h1>
  <p>Si vous oubliez votre mot de passe, ce code est le seul moyen de retrouver vos données.
     Il ne sera plus jamais affiché : recopiez-le sur papier et rangez-le hors de cet ordinateur.</p>
  <div class="coffre-code" data-role="code"></div>
  <label class="coffre-case"><input type="checkbox" name="note" required> J'ai noté ce code en lieu sûr</label>
  <div class="coffre-actions"><span></span><button type="submit" class="btn primary">Continuer</button></div>`;

const GABARIT_OUVERTURE = `
  <h1>DNMAX</h1>
  <p>Saisissez votre mot de passe pour ouvrir vos données.</p>
  <label>Mot de passe
    <input type="password" name="motDePasse" autocomplete="current-password" required></label>
  <p class="coffre-erreur" role="alert" hidden></p>
  <div class="coffre-actions">
    <button type="button" class="lnk" data-role="oubli">Mot de passe oublié ?</button>
    <button type="submit" class="btn primary">Ouvrir</button></div>`;

const GABARIT_SECOURS = `
  <h1>Mot de passe oublié</h1>
  <p>Saisissez le code de secours noté à la création, puis choisissez un nouveau mot de passe.</p>
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
  <h1>Un mot de passe plus long</h1>
  <p>Le module Élèves est actif : vos données contiennent les noms et les résultats de vos élèves.
     Il faut désormais un mot de passe de ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)} caractères au moins.
     Une courte phrase facile à retenir convient très bien.</p>
  <label>Nouveau mot de passe (${String(LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)} caractères au moins)
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

/**
 * Remplace le contenu de l'écran par `gabarit` et rend le formulaire créé.
 * Les gabarits sont des textes fixes de ce fichier : aucune donnée saisie n'y est injectée.
 */
function afficherFormulaire(ecran: HTMLElement, gabarit: string): HTMLFormElement {
  const formulaire = document.createElement("form");
  formulaire.innerHTML = gabarit;
  ecran.replaceChildren(formulaire);
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

function montrerBonnesPratiques(ecran: HTMLElement, continuer: () => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_BONNES_PRATIQUES);
  formulaire.classList.add("coffre-large");
  formulaire.querySelector<HTMLButtonElement>("button[type=submit]")?.focus();
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    continuer();
  });
}

/**
 * Termine l'ouverture des données. Si le module Élèves est actif et que le mot
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
  if (!moduleElevesActif(entrees) || estAssezLong(motDePasse, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)) {
    terminer(entrees);
    return;
  }
  const formulaire = afficherFormulaire(ecran, GABARIT_RENFORCEMENT);
  brancherSoumission(formulaire, async () => {
    if (signalerDefautMotDePasse(formulaire, LONGUEUR_MINIMALE_MOT_DE_PASSE_ELEVES)) {
      return;
    }
    await changerMotDePasse(motDePasse, lireChamp(formulaire, "motDePasse"));
    terminer(entrees);
  });
}

function montrerCreation(ecran: HTMLElement, terminer: (entrees: Entrees) => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_CREATION);
  brancherSoumission(formulaire, async () => {
    if (signalerDefautMotDePasse(formulaire)) {
      return;
    }
    const codeSecours = await creerCoffre(lireChamp(formulaire, "motDePasse"));
    montrerCodeSecours(ecran, codeSecours, terminer);
  });
  formulaire.querySelector("[data-role=transfert]")?.addEventListener("click", () => {
    installerCoffre()
      .then((installe) => {
        if (installe) {
          // Les données transférées s'ouvrent avec le mot de passe de l'ancien ordinateur.
          montrerOuverture(ecran, terminer);
        }
      })
      .catch((erreur: unknown) => {
        afficherErreur(formulaire, messagePourErreur(erreur));
      });
  });
}

function montrerCodeSecours(ecran: HTMLElement, codeSecours: string, terminer: (entrees: Entrees) => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_CODE_SECOURS);
  const zoneCode = formulaire.querySelector("[data-role=code]");
  if (zoneCode !== null) {
    zoneCode.textContent = codeSecours;
  }
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    // Un coffre qui vient d'être créé est vide.
    terminer({});
  });
}

function montrerOuverture(ecran: HTMLElement, terminer: (entrees: Entrees) => void, verrouilleParInactivite = false): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_OUVERTURE);
  if (verrouilleParInactivite) {
    const avis = document.createElement("p");
    avis.className = "coffre-avis";
    avis.setAttribute("role", "status");
    avis.textContent = MESSAGE_VERROUILLAGE;
    formulaire.querySelector("h1")?.after(avis);
  }
  brancherSoumission(formulaire, async () => {
    const motDePasse = lireChamp(formulaire, "motDePasse");
    terminerOuverture(ecran, motDePasse, await ouvrirCoffre(motDePasse), terminer);
  });
  formulaire.querySelector("[data-role=oubli]")?.addEventListener("click", () => {
    montrerSecours(ecran, terminer);
  });
}

function montrerSecours(ecran: HTMLElement, terminer: (entrees: Entrees) => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_SECOURS);
  brancherSoumission(formulaire, async () => {
    if (signalerDefautMotDePasse(formulaire)) {
      return;
    }
    const motDePasse = lireChamp(formulaire, "motDePasse");
    terminerOuverture(ecran, motDePasse, await ouvrirCoffreParSecours(lireChamp(formulaire, "codeSecours"), motDePasse), terminer);
  });
  formulaire.querySelector("[data-role=retour]")?.addEventListener("click", () => {
    montrerOuverture(ecran, terminer);
  });
}

/**
 * Affiche l'écran de création ou d'ouverture du coffre et rend les données
 * de l'enseignant une fois le coffre ouvert. L'écran se retire alors de la page.
 *
 * Au tout premier lancement (pas encore de coffre), une page de bonnes
 * pratiques précède le choix du mot de passe.
 *
 * @param verrouilleParInactivite explique à l'enseignant pourquoi le mot de passe est redemandé
 */
export function demanderOuvertureCoffre(coffreExiste: boolean, verrouilleParInactivite = false): Promise<Entrees> {
  return new Promise((resoudre) => {
    const ecran = document.createElement("div");
    ecran.className = "ecran-coffre";
    document.body.prepend(ecran);
    const terminer = (entrees: Entrees): void => {
      ecran.remove();
      resoudre(entrees);
    };
    if (coffreExiste) {
      montrerOuverture(ecran, terminer, verrouilleParInactivite);
    } else {
      montrerBonnesPratiques(ecran, () => {
        montrerCreation(ecran, terminer);
      });
    }
  });
}

const GABARIT_IDENTITE = `
  <h1>Qui êtes-vous ?</h1>
  <p>Votre prénom et votre nom accompagnent ce que vous modifiez et signent les fichiers que vous envoyez à d'autres enseignants :
     chacun voit ainsi qui a écrit quoi.</p>
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
    const ecran = document.createElement("div");
    ecran.className = "ecran-coffre";
    document.body.prepend(ecran);
    const formulaire = afficherFormulaire(ecran, GABARIT_IDENTITE);
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
