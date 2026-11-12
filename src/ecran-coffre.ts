// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-coffre.css";
import { LONGUEUR_MAXIMALE_NOM, creerIdentite, type Identite } from "./domaine/identite";
import type { Entrees } from "./domaine/magasin-memoire";
import {
  LONGUEUR_MINIMALE_MOT_DE_PASSE,
  verifierNouveauMotDePasse,
  type DefautMotDePasse,
} from "./domaine/saisie-coffre";
import {
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
  interne: "Une erreur inattendue s'est produite. Réessayez.",
};

const MESSAGES_DEFAUT_MOT_DE_PASSE: Record<DefautMotDePasse, string> = {
  "trop-court": MESSAGES_ERREUR["mot-de-passe-trop-court"],
  "confirmation-differente": "Les deux saisies du mot de passe ne sont pas identiques.",
};

export function messagePourErreur(erreur: unknown): string {
  return MESSAGES_ERREUR[erreur instanceof ErreurCoffre ? erreur.code : "interne"];
}

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
function signalerDefautMotDePasse(formulaire: HTMLFormElement): boolean {
  const defaut = verifierNouveauMotDePasse(lireChamp(formulaire, "motDePasse"), lireChamp(formulaire, "confirmation"));
  if (defaut !== null) {
    afficherErreur(formulaire, MESSAGES_DEFAUT_MOT_DE_PASSE[defaut]);
  }
  return defaut !== null;
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

function montrerOuverture(ecran: HTMLElement, terminer: (entrees: Entrees) => void): void {
  const formulaire = afficherFormulaire(ecran, GABARIT_OUVERTURE);
  brancherSoumission(formulaire, async () => {
    terminer(await ouvrirCoffre(lireChamp(formulaire, "motDePasse")));
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
    terminer(await ouvrirCoffreParSecours(lireChamp(formulaire, "codeSecours"), lireChamp(formulaire, "motDePasse")));
  });
  formulaire.querySelector("[data-role=retour]")?.addEventListener("click", () => {
    montrerOuverture(ecran, terminer);
  });
}

/**
 * Affiche l'écran de création ou d'ouverture du coffre et rend les données
 * de l'enseignant une fois le coffre ouvert. L'écran se retire alors de la page.
 */
export function demanderOuvertureCoffre(coffreExiste: boolean): Promise<Entrees> {
  return new Promise((resoudre) => {
    const ecran = document.createElement("div");
    ecran.className = "ecran-coffre";
    document.body.prepend(ecran);
    const terminer = (entrees: Entrees): void => {
      ecran.remove();
      resoudre(entrees);
    };
    if (coffreExiste) {
      montrerOuverture(ecran, terminer);
    } else {
      montrerCreation(ecran, terminer);
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
