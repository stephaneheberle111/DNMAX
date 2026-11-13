// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  ErreurDirect,
  annulerEchangeDirect,
  echangeDirectDisponible,
  envoyerEnDirect,
  recevoirEnDirect,
  type CodeErreurDirect,
  type EtapeDirect,
} from "./canal-direct";
import { formaterSaisieCode, lireSaisieCode, type ErreurSaisieCode } from "./domaine/echange/code-direct";
import { messagePourErreur } from "./ecran-coffre";
import {
  afficherMessage,
  creer,
  creerBouton,
  montrerExport,
  ouvrirBoite,
  ouvrirTexteRecu,
  type AccesDonnees,
} from "./ecran-echange";

/**
 * Écrans de l'échange en direct : l'expéditeur dicte un code de 8 chiffres,
 * le destinataire le saisit, puis le contenu passe d'un ordinateur à l'autre
 * sur le réseau local. Le contenu est le même texte qu'un fichier d'échange,
 * et la réception suit le même circuit.
 */

const RECOURS_FICHIER = "L'échange par fichier reste disponible : « Échanger… » > « Envoyer » ou « Recevoir ».";

const MEME_RESEAU =
  "Vos deux ordinateurs doivent être sur le même réseau (même wifi ou même réseau local) : " +
  "l'échange en direct ne fonctionne pas d'un réseau à un autre. Certains réseaux d'établissement isolent " +
  "les postes les uns des autres ; l'échange en direct y est alors impossible.";

const MESSAGES_SAISIE: Record<ErreurSaisieCode, string> = {
  vide: "Saisissez le code de 8 chiffres que votre collègue vous dicte.",
  "caractere-interdit": "Le code ne contient que des chiffres.",
  "trop-court": "Il manque des chiffres : le code en compte 8.",
  "trop-long": "Il y a trop de chiffres : le code en compte 8.",
};

const MESSAGES_DIRECT: Record<CodeErreurDirect, string> = {
  "code-invalide": MESSAGES_SAISIE["trop-court"],
  "trop-volumineux": "Le contenu dépasse la taille admise pour un échange (20 Mo).",
  "reseau-indisponible":
    "Cet ordinateur ne semble relié à aucun réseau local, ou le système empêche DNMAX de s'y annoncer. " +
    "Vérifiez la connexion wifi, et autorisez DNMAX si le système le demande (pare-feu, « réseau local »).",
  "expediteur-introuvable":
    "Aucun envoi portant ce code n'a été trouvé. Vérifiez le code, et que l'envoi est toujours affiché chez votre collègue. " +
    MEME_RESEAU,
  "plusieurs-expediteurs":
    "Plusieurs envois en cours sur ce réseau commencent par les mêmes chiffres. " +
    "Demandez à votre collègue d'annuler et de relancer l'envoi pour obtenir un autre code.",
  "connexion-impossible":
    "L'ordinateur de votre collègue a été trouvé, mais la connexion a échoué : le réseau isole sans doute les postes, " +
    "ou un pare-feu bloque DNMAX. Rien n'a été transmis.",
  "code-errone":
    "Le code ne correspond pas. Par sécurité, il ne peut plus servir : votre collègue doit relancer l'envoi pour obtenir un nouveau code.",
  "delai-depasse": "Le code a expiré sans que votre collègue ne se connecte. Relancez l'envoi quand vous êtes prêts tous les deux.",
  "transfert-interrompu": "La connexion s'est interrompue pendant le transfert. Rien n'a été modifié chez le destinataire.",
  "donnees-alterees": "Le contenu a été altéré en route : il a été refusé, rien n'a été modifié.",
  "version-incompatible": "Vos deux ordinateurs n'ont pas la même version de DNMAX. Mettez-les à jour, ou passez par un fichier.",
  annule: "Échange annulé.",
  interne: "L'échange en direct a rencontré une erreur inattendue.",
};

/** Message vu par l'expéditeur quand une connexion a présenté un mauvais code. */
const MESSAGE_TENTATIVE_REFUSEE =
  "Quelqu'un s'est connecté avec un code erroné. Par sécurité, ce code est annulé : relancez l'envoi pour en obtenir un nouveau.";

/** Erreurs après lesquelles l'échange par fichier mérite d'être proposé. */
const ERREURS_RESEAU: ReadonlySet<CodeErreurDirect> = new Set([
  "reseau-indisponible",
  "expediteur-introuvable",
  "connexion-impossible",
  "transfert-interrompu",
  "delai-depasse",
  "version-incompatible",
]);

/** Message à montrer à l'enseignant pour une erreur de l'échange en direct, ou de chiffrement. */
export function messagePourErreurDirect(erreur: unknown, cote: "envoi" | "reception" = "reception"): string {
  if (!(erreur instanceof ErreurDirect)) {
    return messagePourErreur(erreur);
  }
  const message = cote === "envoi" && erreur.code === "code-errone" ? MESSAGE_TENTATIVE_REFUSEE : MESSAGES_DIRECT[erreur.code];
  return ERREURS_RESEAU.has(erreur.code) ? `${message} ${RECOURS_FICHIER}` : message;
}

/** Message d'une saisie de code incomplète ou fautive. */
export function messagePourSaisie(erreur: ErreurSaisieCode): string {
  return MESSAGES_SAISIE[erreur];
}

function decrireProgression(verbe: string, etape: Extract<EtapeDirect, { etape: "progression" }>): string {
  if (etape.total === 0) {
    return `${verbe}…`;
  }
  const pourcentage = Math.floor((etape.faits * 100) / etape.total);
  return `${verbe} : ${String(pourcentage)} %`;
}

function decrireValidite(secondes: number): string {
  const minutes = Math.round(secondes / 60);
  return minutes <= 1 ? "une minute" : `${String(minutes)} minutes`;
}

/**
 * Montre le parcours de l'expéditeur pour un texte déjà prêt (même texte qu'un
 * fichier d'échange, chiffré si `protege`).
 */
export function montrerEnvoiDirect(texte: string, protege: boolean): void {
  let termine = false;
  const { boite, fermer } = ouvrirBoite("Envoyer en direct", () => {
    termine = true;
    void annulerEchangeDirect();
  });
  const etat = creer("p", "echange-etat", "Préparation du code…");
  etat.setAttribute("role", "status");
  const etapes = creer("div", "echange-etapes");
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const actions = creer("div", "echange-actions");
  const boutonAnnuler = creerBouton("Annuler", "btn ghost", fermer);
  actions.append(boutonAnnuler);
  boite.append(etat, etapes, erreur, actions);

  const terminer = (): void => {
    boutonAnnuler.textContent = "Fermer";
    boutonAnnuler.className = "btn primary";
  };

  envoyerEnDirect(texte, (etape) => {
    if (termine) {
      return;
    }
    if (etape.etape === "code") {
      etat.textContent = "Dictez ce code à votre collègue :";
      const code = creer("p", "echange-code-court", etape.code);
      code.setAttribute("aria-label", `Code : ${etape.code.split("").join(" ")}`);
      const consigne = creer(
        "p",
        "",
        "Il le saisit dans « Échanger… » > « Échange en direct » > « Recevoir en direct », sur le même réseau (même wifi). " +
          `Le code est valable ${decrireValidite(etape.validiteSecondes)}, pour un seul essai. Gardez cette fenêtre ouverte.`,
      );
      const motDePasse = creer(
        "p",
        "echange-detail alerte",
        "Le contenu comprend des étudiants : il part en plus chiffré par le mot de passe choisi, que votre collègue saisira à la réception.",
      );
      motDePasse.hidden = !protege;
      etapes.replaceChildren(code, consigne, motDePasse);
    } else if (etape.etape === "connexion") {
      etat.textContent = "Votre collègue est connecté : envoi en cours…";
      etapes.replaceChildren();
    } else if (etape.etape === "progression") {
      etat.textContent = decrireProgression("Envoi", etape);
    }
  })
    .then(() => {
      if (termine) {
        return;
      }
      etapes.replaceChildren();
      etat.textContent = "Envoyé. Votre collègue voit maintenant ce que l'envoi changerait chez lui, et choisit ce qu'il garde.";
      terminer();
    })
    .catch((raison: unknown) => {
      if (termine) {
        return;
      }
      etat.textContent = "L'échange en direct a échoué.";
      erreur.textContent = messagePourErreurDirect(raison, "envoi");
      erreur.hidden = false;
      etapes.replaceChildren();
      terminer();
    });
}

/**
 * Montre le parcours du destinataire. Le texte reçu est passé à `traiterTexte`
 * (le circuit de réception des fichiers) une fois la boîte refermée.
 */
export function montrerReceptionDirecte(traiterTexte: (texte: string) => Promise<void>): void {
  let termine = false;
  let enCours = false;
  const { boite, fermer } = ouvrirBoite("Recevoir en direct", () => {
    termine = true;
    if (enCours) {
      void annulerEchangeDirect();
    }
  });
  const etat = creer("p", "echange-etat", "Saisissez le code de 8 chiffres que votre collègue vous dicte.");
  etat.setAttribute("role", "status");
  const saisie = creer("input", "echange-saisie-code");
  saisie.type = "text";
  saisie.inputMode = "numeric";
  saisie.autocomplete = "off";
  saisie.spellcheck = false;
  saisie.placeholder = "0000 0000";
  saisie.maxLength = 12;
  saisie.setAttribute("aria-label", "Code de 8 chiffres");
  saisie.addEventListener("input", () => {
    saisie.value = formaterSaisieCode(saisie.value);
  });
  const etapes = creer("div", "echange-etapes");
  etapes.append(
    saisie,
    creer("p", "echange-detail", "Les deux ordinateurs doivent être sur le même réseau (même wifi ou même réseau local)."),
  );
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const actions = creer("div", "echange-actions");
  const boutonAnnuler = creerBouton("Annuler", "btn ghost", fermer);

  const echouer = (raison: unknown): void => {
    enCours = false;
    if (termine) {
      return;
    }
    etat.textContent = "L'échange en direct a échoué.";
    erreur.textContent = messagePourErreurDirect(raison);
    erreur.hidden = false;
    etapes.replaceChildren();
    actions.replaceChildren(boutonAnnuler);
    boutonAnnuler.textContent = "Fermer";
  };

  const boutonRecevoir = creerBouton("Recevoir", "btn primary", () => {
    const lecture = lireSaisieCode(saisie.value);
    if ("erreur" in lecture) {
      erreur.textContent = messagePourSaisie(lecture.erreur);
      erreur.hidden = false;
      saisie.focus();
      return;
    }
    const { code } = lecture;
    enCours = true;
    boutonRecevoir.disabled = true;
    saisie.readOnly = true;
    erreur.hidden = true;
    recevoirEnDirect(code, (etape) => {
      if (termine) {
        return;
      }
      if (etape.etape === "recherche") {
        etat.textContent = "Recherche de l'ordinateur de votre collègue sur le réseau…";
      } else if (etape.etape === "connexion") {
        etat.textContent = "Connecté : réception en cours…";
      } else if (etape.etape === "progression") {
        etat.textContent = decrireProgression("Réception", etape);
      }
    })
      .then((texte) => {
        enCours = false;
        if (termine) {
          return;
        }
        fermer();
        traiterTexte(texte).catch((raison: unknown) => {
          afficherMessage("Recevoir en direct", messagePourErreur(raison));
        });
      })
      .catch(echouer);
  });
  saisie.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Enter") {
      boutonRecevoir.click();
    }
  });
  actions.append(boutonAnnuler, boutonRecevoir);
  boite.append(etat, etapes, erreur, actions);
  saisie.focus();
}

/** Boîte d'entrée de l'échange en direct : présentation, puis envoyer ou recevoir. */
export function montrerChoixDirect(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Échange en direct");
  boite.append(
    creer(
      "p",
      "",
      "D'ordinateur à ordinateur, sans fichier ni serveur, avec un code de 8 chiffres à dicter. " +
        "Les deux ordinateurs doivent être sur le même réseau (même wifi ou même réseau local).",
    ),
  );
  const disponible = echangeDirectDisponible();
  if (!disponible) {
    boite.append(
      creer("p", "echange-erreur", `L'échange en direct n'est possible que dans l'application de bureau. ${RECOURS_FICHIER}`),
    );
  }
  const choix = creer("div", "echange-choix");
  const envoyer = creerBouton("", "", () => {
    fermer();
    const entrees = acces.lireEntrees();
    acces
      .dresserCatalogue(entrees)
      .then((catalogue) => {
        montrerExport(acces, entrees, catalogue, "direct");
      })
      .catch((raison: unknown) => {
        afficherMessage("Envoyer en direct", messagePourErreur(raison));
      });
  });
  envoyer.append(
    creer("b", "", "Envoyer en direct"),
    creer("span", "", "Choisir ce que vous envoyez, comme pour un fichier, puis dicter le code affiché à votre collègue."),
  );
  const recevoir = creerBouton("", "", () => {
    fermer();
    montrerReceptionDirecte((texte) => ouvrirTexteRecu(acces, texte));
  });
  recevoir.append(
    creer("b", "", "Recevoir en direct"),
    creer("span", "", "Saisir le code que votre collègue vous dicte, puis choisir ce que vous gardez."),
  );
  envoyer.disabled = !disponible;
  recevoir.disabled = !disponible;
  choix.append(envoyer, recevoir);
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(choix, actions);
}
