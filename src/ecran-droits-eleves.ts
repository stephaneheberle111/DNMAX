// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-droits-eleves.css";
import { ANNEES_CONSERVATION_ELEVES } from "./configuration";
import {
  etatPromotions,
  identifiantsOrphelins,
  promotionsEchues,
  traiterDonneesEchues,
  type EtatPromotion,
  type Traitement,
} from "./domaine/conservation";
import { effacerEleve, extraireEleve, listerEleves, type BilanEffacement, type EleveRepere } from "./domaine/droits-eleve";
import { messagePourErreur } from "./ecran-coffre";
import { creer, creerBouton, ouvrirBoite, type AccesDonnees } from "./ecran-echange";
import { enregistrerFichier } from "./enveloppe";

function decrireEleve(eleve: EleveRepere): string {
  return eleve.promotions.length === 0 ? `${eleve.nom} (liste saisie à la main)` : `${eleve.nom} (${eleve.promotions.join(", ")})`;
}

/** Date du jour sur le poste, AAAA-MM-JJ. */
function aujourdHui(): string {
  const maintenant = new Date();
  const deuxChiffres = (nombre: number): string => String(nombre).padStart(2, "0");
  return `${String(maintenant.getFullYear())}-${deuxChiffres(maintenant.getMonth() + 1)}-${deuxChiffres(maintenant.getDate())}`;
}

/** Nom de fichier proposé : le nom de l'élève, sans caractère refusé par les systèmes de fichiers. */
function nomFichier(eleve: EleveRepere, date: string): string {
  const nom =
    eleve.nom
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "eleve";
  return `Données DNMAX - ${nom} - ${date}.json`;
}

function decrireBilan(eleve: EleveRepere, bilan: BilanEffacement): string[] {
  return [
    `${eleve.nom} sera retiré(e) de ${String(bilan.promotions)} promotion(s) et de ${String(bilan.evaluations)} évaluation(s), brouillon en cours compris.`,
    bilan.listesSaisies > 0
      ? `Son nom sera aussi retiré de ${String(bilan.listesSaisies)} liste(s) saisie(s) à la main : vérifiez qu'il ne s'agit pas d'un homonyme.`
      : "",
    "Cet effacement est définitif. Les sauvegardes automatiques de DNMAX, chiffrées, en gardent une trace jusqu'à leur remplacement : il en reste une par jour d'utilisation, pour les dix derniers.",
    "Un nom cité dans un texte libre (appréciation, consignes) n'est pas recherché : relisez-les si besoin.",
  ].filter((phrase) => phrase !== "");
}

function confirmerEffacement(acces: AccesDonnees, eleve: EleveRepere): void {
  const { entrees, bilan } = effacerEleve(acces.lireEntrees(), eleve);
  const { boite, fermer } = ouvrirBoite(`Effacer ${eleve.nom}`);
  for (const phrase of decrireBilan(eleve, bilan)) {
    boite.append(creer("p", "", phrase));
  }
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const effacer = creerBouton("Effacer définitivement", "btn primary", () => {
    effacer.disabled = true;
    // Les données sont réécrites puis l'interface est rechargée.
    acces.remplacerEntrees(entrees).catch((erreurEffacement: unknown) => {
      erreur.textContent = messagePourErreur(erreurEffacement);
      erreur.hidden = false;
      effacer.disabled = false;
    });
  });
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Annuler", "btn ghost", fermer), effacer);
  boite.append(erreur, actions);
}

/**
 * Ouvre la boîte « Données d'un élève » : exporter tout ce qui le concerne
 * (droit d'accès) ou l'effacer partout (droit à l'effacement).
 */
export function ouvrirDroitsEleves(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Données d'un élève");
  const eleves = listerEleves(acces.lireEntrees());
  boite.append(
    creer(
      "p",
      "",
      "Un élève ou sa famille peut demander à consulter ses données ou à les faire effacer. Choisissez l'élève, puis exportez ses données pour les lui remettre, ou effacez-le de DNMAX.",
    ),
  );
  const actions = creer("div", "echange-actions");
  if (eleves.length === 0) {
    boite.append(creer("p", "", "Aucun élève n'est enregistré dans DNMAX."));
    actions.append(creerBouton("Fermer", "btn ghost", fermer));
    boite.append(actions);
    return;
  }
  const choix = creer("select");
  choix.setAttribute("aria-label", "Élève");
  eleves.forEach((eleve, position) => {
    const option = creer("option", "", decrireEleve(eleve));
    option.value = String(position);
    choix.append(option);
  });
  const eleveChoisi = (): EleveRepere => eleves[Number(choix.value)] ?? (eleves[0] as EleveRepere);
  const message = creer("p", "compte-message");
  message.setAttribute("role", "status");
  message.hidden = true;
  const dire = (texte: string, estErreur: boolean): void => {
    message.textContent = texte;
    message.className = estErreur ? "compte-message echange-erreur" : "compte-message";
    message.hidden = false;
  };
  const exporter = creerBouton("Exporter ses données…", "btn", () => {
    const eleve = eleveChoisi();
    const date = aujourdHui();
    const extrait = extraireEleve(acces.lireEntrees(), eleve, date);
    const octets = new TextEncoder().encode(JSON.stringify(extrait, null, 2));
    enregistrerFichier(nomFichier(eleve, date), octets)
      .then((ecrit) => {
        if (ecrit) {
          dire(
            `Données de ${eleve.nom} enregistrées (${String(extrait.evaluations.length)} évaluation(s)). Ce fichier n'est pas protégé : remettez-le directement à l'élève ou à sa famille.`,
            false,
          );
        }
      })
      .catch((erreurExport: unknown) => {
        dire(messagePourErreur(erreurExport), true);
      });
  });
  const effacer = creerBouton("Effacer cet élève…", "btn ghost", () => {
    confirmerEffacement(acces, eleveChoisi());
  });
  const boutons = creer("div", "compte-liens");
  boutons.append(exporter, effacer);
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(
    choix,
    boutons,
    message,
    creer("p", "", "Pour corriger le nom d'un élève, utilisez l'écran Promotions : la correction s'applique à toutes ses évaluations."),
    actions,
  );
}

function ecrireJour(jourIso: string): string {
  const [annee, mois, jour] = jourIso.split("-");
  return `${jour ?? ""}/${mois ?? ""}/${annee ?? ""}`;
}

function decrirePromotion(promotion: EtatPromotion): string {
  const eleves = `${String(promotion.eleves)} élève(s)`;
  if (promotion.sortie === "") {
    return `${promotion.nom} : ${eleves}, année d'entrée inconnue`;
  }
  return promotion.echue
    ? `${promotion.nom} : ${eleves}, sortie le ${ecrireJour(promotion.sortie)}, durée de conservation dépassée depuis le ${ecrireJour(promotion.echeance)}`
    : `${promotion.nom} : ${eleves}, sortie le ${ecrireJour(promotion.sortie)}, à conserver jusqu'au ${ecrireJour(promotion.echeance)}`;
}

/**
 * Ouvre la boîte « Anonymiser ou effacer des promotions ». Toutes les
 * promotions qui comptent des élèves identifiables y figurent ; celles dont
 * la durée de conservation est dépassée sont cochées d'office. Les
 * redoublants probables sont proposés à garder, et les résultats restés sans
 * élève peuvent être traités de même. Traiter une promotion encore dans sa
 * durée de conservation demande une seconde confirmation.
 */
export function ouvrirConservation(acces: AccesDonnees): void {
  const entrees = acces.lireEntrees();
  const promotions = etatPromotions(entrees, aujourdHui(), ANNEES_CONSERVATION_ELEVES);
  const orphelins = identifiantsOrphelins(entrees);
  const { boite, fermer } = ouvrirBoite("Anonymiser ou effacer des promotions");
  boite.append(
    creer(
      "p",
      "",
      `Les données d'élèves sont gardées ${String(ANNEES_CONSERVATION_ELEVES)} an(s) après la sortie de leur promotion ; DNMAX le rappelle ensuite. Vous pouvez aussi anonymiser ou effacer une promotion plus tôt. Les évaluations elles-mêmes (grilles, consignes) sont conservées.`,
    ),
  );
  const actions = creer("div", "echange-actions");
  if (promotions.length === 0 && orphelins.length === 0) {
    boite.append(creer("p", "", "Aucune promotion ne compte d'élève identifiable."));
    actions.append(creerBouton("Fermer", "btn ghost", fermer));
    boite.append(actions);
    return;
  }
  const creerCase = (texteLigne: string, coche: boolean, classe = "conservation-ligne"): HTMLInputElement => {
    const ligne = creer("label", classe);
    const caseACocher = creer("input");
    caseACocher.type = "checkbox";
    caseACocher.checked = coche;
    ligne.append(caseACocher, ` ${texteLigne}`);
    boite.append(ligne);
    return caseACocher;
  };
  const promotionsCochees: { id: string; echue: boolean; caseACocher: HTMLInputElement }[] = [];
  const gardes: { id: string; caseACocher: HTMLInputElement }[] = [];
  for (const promotion of promotions) {
    promotionsCochees.push({
      id: promotion.id,
      echue: promotion.echue,
      caseACocher: creerCase(decrirePromotion(promotion), promotion.echue),
    });
    for (const redoublant of promotion.redoublants) {
      gardes.push({
        id: redoublant.id,
        caseACocher: creerCase(
          `Garder ${redoublant.nom} : redoublement probable, son nom figure aussi en ${redoublant.autrePromotion}`,
          true,
          "conservation-ligne conservation-garde",
        ),
      });
    }
  }
  const caseOrphelins =
    orphelins.length > 0
      ? creerCase(`Résultats de ${String(orphelins.length)} élève(s) retiré(s) de toute promotion, restés dans des évaluations`, true)
      : null;
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  // Traitement déjà demandé une fois pour des promotions encore dans leur durée de conservation.
  let confirmationDemandee: Traitement | null = null;
  const traiter = (traitement: Traitement, bouton: HTMLButtonElement): void => {
    const cochees = promotionsCochees.filter((element) => element.caseACocher.checked);
    const choisies = cochees.map((element) => element.id);
    const avecOrphelins = caseOrphelins?.checked === true;
    if (choisies.length === 0 && !avecOrphelins) {
      erreur.textContent = "Cochez au moins une promotion ou les résultats sans élève.";
      erreur.hidden = false;
      return;
    }
    const enCours = cochees.filter((element) => !element.echue).length;
    if (enCours > 0 && confirmationDemandee !== traitement) {
      confirmationDemandee = traitement;
      erreur.textContent = `${String(enCours)} promotion(s) cochée(s) sont encore dans leur durée de conservation. Cliquez de nouveau sur « ${bouton.textContent} » pour confirmer.`;
      erreur.hidden = false;
      return;
    }
    bouton.disabled = true;
    const { entrees: traitees } = traiterDonneesEchues(acces.lireEntrees(), {
      promotions: choisies,
      gardes: gardes.filter((element) => element.caseACocher.checked).map((element) => element.id),
      orphelins: avecOrphelins,
      traitement,
    });
    // Les données sont réécrites puis l'interface est rechargée.
    acces.remplacerEntrees(traitees).catch((erreurTraitement: unknown) => {
      erreur.textContent = messagePourErreur(erreurTraitement);
      erreur.hidden = false;
      bouton.disabled = false;
    });
  };
  boite.append(
    creer(
      "p",
      "",
      "Anonymiser : chaque élève devient « Élève anonyme 1, 2… » ; ses niveaux et ses dates restent, ses observations et son appréciation sont retirées. Effacer : tout disparaît. Dans les deux cas c'est définitif : exportez auparavant ce que vous devez remettre. Les sauvegardes automatiques en gardent une trace jusqu'à leur remplacement.",
    ),
    erreur,
  );
  const anonymiser: HTMLButtonElement = creerBouton("Anonymiser", "btn", () => {
    traiter("anonymiser", anonymiser);
  });
  const effacer: HTMLButtonElement = creerBouton("Effacer définitivement", "btn primary", () => {
    traiter("effacer", effacer);
  });
  actions.append(creerBouton("Fermer", "btn ghost", fermer), anonymiser, effacer);
  boite.append(actions);
}

/**
 * Au lancement, signale discrètement des données d'élèves échues. Ne fait
 * rien d'autre : l'effacement reste une décision de l'enseignant.
 */
export function rappelerConservation(acces: AccesDonnees): void {
  // Une promotion dont il ne reste que des redoublants gardés ne fait plus l'objet d'un rappel.
  const echues = promotionsEchues(acces.lireEntrees(), aujourdHui(), ANNEES_CONSERVATION_ELEVES).filter(
    (promotion) => promotion.eleves > promotion.redoublants.length,
  );
  if (echues.length === 0) {
    return;
  }
  const annonce = creer("div", "annonce-conservation");
  annonce.setAttribute("role", "status");
  const voir = creerBouton("Voir", "btn primary", () => {
    annonce.remove();
    ouvrirConservation(acces);
  });
  const plusTard = creerBouton("Plus tard", "btn ghost", () => {
    annonce.remove();
  });
  const boutons = creer("div", "annonce-actions");
  boutons.append(plusTard, voir);
  annonce.append(
    creer(
      "p",
      "",
      `${String(echues.length)} promotion(s) sont sorties depuis plus de ${String(ANNEES_CONSERVATION_ELEVES)} an(s) : leurs données d'élèves sont à effacer ou à anonymiser.`,
    ),
    boutons,
  );
  document.body.append(annonce);
}

const IDENTIFIANT_PANNEAU = "panneau-donnees-eleves";
/** Clé des modules de l'interface historique ; `eleves` vaut vrai quand le module Élèves est actif. */
const CLE_MODULES = "dnmade.modules";

/** Vrai si le module Élèves est actif, ou si des élèves sont encore enregistrés. */
function moduleElevesActif(texte: string | undefined): boolean {
  try {
    const modules: unknown = JSON.parse(texte ?? "{}");
    return typeof modules === "object" && modules !== null && (modules as Record<string, unknown>).eleves === true;
  } catch {
    return false;
  }
}

function donneesElevesConcernees(acces: AccesDonnees): boolean {
  const entrees = acces.lireEntrees();
  return moduleElevesActif(entrees[CLE_MODULES]) || listerEleves(entrees).length > 0;
}

/**
 * Branche le panneau « Données des élèves » de l'onglet Paramètres. Il ne
 * s'affiche que si le module Élèves est actif ou si des élèves sont encore
 * enregistrés : sans élève, il n'y a pas de donnée personnelle à gérer.
 */
export function installerDonneesEleves(acces: AccesDonnees): void {
  const panneau = document.getElementById(IDENTIFIANT_PANNEAU);
  if (panneau === null) {
    return;
  }
  const actualiser = (): void => {
    panneau.hidden = !donneesElevesConcernees(acces);
  };
  document.getElementById("bouton-donnees-eleve")?.addEventListener("click", () => {
    ouvrirDroitsEleves(acces);
  });
  document.getElementById("bouton-donnees-promotions")?.addEventListener("click", () => {
    ouvrirConservation(acces);
  });
  // L'interface historique active ou coupe le module Élèves dans Paramètres, et peut charger l'exemple.
  document.addEventListener("change", () => {
    window.setTimeout(actualiser, 0);
  });
  document.addEventListener("click", () => {
    window.setTimeout(actualiser, 0);
  });
  actualiser();
}
