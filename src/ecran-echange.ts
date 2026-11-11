// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-echange.css";
import { CLE_EVALUATIONS, lireEvaluations, type Evaluation } from "./domaine/echange/modele";
import {
  EXTENSION_FICHIER,
  construirePaquet,
  lirePaquet,
  estFichierProtege,
  type ErreurPaquet,
  type Paquet,
} from "./domaine/echange/paquet";
import { appliquerResultats, calculerPlanResultats, type LigneResultats } from "./domaine/echange/plan-resultats";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE, verifierNouveauMotDePasse } from "./domaine/saisie-coffre";
import { appliquerPlan, calculerPlan, type Action, type LignePlan } from "./domaine/echange/plan";
import {
  appliquerReferentiels,
  calculerPlanReferentiels,
  rattacherAuxVersionsCreees,
  type ActionReferentiel,
  type LigneReferentiel,
} from "./domaine/echange/plan-referentiels";
import {
  trouverReferentielDeReference,
  type ComparaisonBase,
  type ReferentielLocal,
} from "./domaine/echange/referentiel";
import type { Differences } from "./domaine/echange/referentiel-echange";
import {
  CLE_DATES_MODIFICATION,
  MODIFICATION_INCONNUE,
  lireDatesModification,
  type Modification,
} from "./domaine/echange/suivi-modifications";
import type { Identite } from "./domaine/identite";
import type { Entrees } from "./domaine/magasin-memoire";
import { messagePourErreur } from "./ecran-coffre";
import {
  dechiffrerFichierEchange,
  exporterCoffre,
  enregistrerFichier,
  enregistrerFichierProtege,
  ouvrirFichierEchange,
} from "./enveloppe";

/** Ce dont l'écran d'échange a besoin de l'application. */
export interface AccesDonnees {
  /** L'enseignant qui utilise l'application : son nom signe les fichiers qu'il envoie. */
  identite: Identite;
  lireEntrees(): Entrees;
  /** Référentiels présents sur ce poste, avec leur empreinte. */
  dresserCatalogue(entrees: Entrees): Promise<ReferentielLocal[]>;
  /** Écrit sur le disque, sans attendre, les modifications encore en attente. */
  enregistrerMaintenant(): Promise<void>;
  /** Enregistre les nouvelles entrées puis recharge l'interface pour qu'elle les affiche. */
  remplacerEntrees(entrees: Entrees): Promise<void>;
}

const IDENTIFIANT_BOUTON = "bouton-echange";

/** Nombre de caractères aléatoires des identifiants créés à l'import. */
const LONGUEUR_IDENTIFIANT_GENERE = 8;

const MESSAGES_PAQUET: Record<ErreurPaquet, string> = {
  illisible: "Ce fichier n'est pas un fichier d'échange DNMAX, ou il est endommagé.",
  "format-inconnu": "Ce fichier n'est pas un fichier d'échange DNMAX.",
  "version-trop-recente":
    "Ce fichier a été créé par une version plus récente de DNMAX. Mettez l'application à jour pour l'ouvrir.",
};

const LIBELLES_ACTION: Record<Action, string> = { creer: "Nouvelle", modifier: "Modifiée", aucune: "Identique" };

const MESSAGES_REFERENTIEL: Record<ComparaisonBase["etat"], { texte: string; alerte: boolean }> = {
  identique: { texte: "Même référentiel que le vôtre.", alerte: false },
  different: {
    texte: "Référentiel différent du vôtre : certaines compétences peuvent ne pas correspondre.",
    alerte: true,
  },
  "diplome-absent": { texte: "Ce diplôme ou cette mention n'existe pas dans votre établissement.", alerte: true },
  inconnue: { texte: "Le fichier ne précise pas sur quel référentiel elle a été construite.", alerte: true },
};

/** Crée un élément ; le texte passe par `textContent`, jamais interprété comme du HTML. */
function creer<Balise extends keyof HTMLElementTagNameMap>(
  balise: Balise,
  classe = "",
  texte = "",
): HTMLElementTagNameMap[Balise] {
  const element = document.createElement(balise);
  element.className = classe;
  element.textContent = texte;
  return element;
}

function creerBouton(texte: string, classe: string, action: () => void): HTMLButtonElement {
  const bouton = creer("button", classe, texte);
  bouton.type = "button";
  bouton.addEventListener("click", action);
  return bouton;
}

/** Écrit une date ISO sous une forme lisible ; une date absente ou invalide devient « date inconnue ». */
function ecrireDate(dateIso: string): string {
  const date = new Date(dateIso);
  if (dateIso === "" || Number.isNaN(date.getTime())) {
    return "date inconnue";
  }
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

/** Écrit le jour d'une date ISO, sans l'heure : pour les dates de validation, qui n'en ont pas. */
function ecrireJour(dateIso: string): string {
  const date = new Date(dateIso);
  if (dateIso === "" || Number.isNaN(date.getTime())) {
    return "date inconnue";
  }
  return date.toLocaleDateString("fr-FR", { dateStyle: "long" });
}

function lireTexte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/** Ouvre une boîte de dialogue vide et rend de quoi la remplir et la fermer. */
function ouvrirBoite(titre: string): { boite: HTMLElement; fermer: () => void } {
  const fond = creer("div", "echange-fond");
  const boite = creer("div", "echange-boite");
  boite.setAttribute("role", "dialog");
  boite.setAttribute("aria-modal", "true");
  boite.append(creer("h2", "", titre));
  fond.append(boite);
  const surTouche = (evenement: KeyboardEvent): void => {
    if (evenement.key === "Escape") {
      fermer();
    }
  };
  const fermer = (): void => {
    document.removeEventListener("keydown", surTouche);
    fond.remove();
  };
  document.addEventListener("keydown", surTouche);
  document.body.append(fond);
  return { boite, fermer };
}

function afficherMessage(titre: string, message: string): void {
  const { boite, fermer } = ouvrirBoite(titre);
  boite.append(creer("p", "echange-erreur", message));
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn primary", fermer));
  boite.append(actions);
}

/** Écrit « date, par Untel » ; l'auteur est omis quand il est inconnu. */
function ecrireModification(modification: Modification): string {
  const date = ecrireDate(modification.le);
  return modification.par === "" ? date : `${date}, par ${modification.par}`;
}

/** Décrit une évaluation en une ligne : promotions, semestre, dernière modification. */
function decrireEvaluation(evaluation: Evaluation, modification: Modification): string {
  const classes = Array.isArray(evaluation.classes) ? evaluation.classes.filter((classe) => typeof classe === "string") : [];
  const parties = [classes.join(", "), lireTexte(evaluation.semestre), `modifiée le ${ecrireModification(modification)}`];
  return parties.filter((partie) => partie !== "").join(" · ");
}

/** Les diplômes du poste, chacun avec le référentiel qui serait envoyé pour lui. */
function listerDiplomes(catalogue: readonly ReferentielLocal[]): ReferentielLocal[] {
  const identifiants = [...new Set(catalogue.map((referentiel) => referentiel.diplomeId))];
  return identifiants
    .map((diplomeId) => trouverReferentielDeReference(catalogue, diplomeId))
    .filter((referentiel) => referentiel !== null);
}

function montrerExport(acces: AccesDonnees, entrees: Entrees, catalogue: readonly ReferentielLocal[]): void {
  const evaluations = lireEvaluations(entrees[CLE_EVALUATIONS]);
  const diplomes = listerDiplomes(catalogue);
  if (evaluations.length === 0 && diplomes.length === 0) {
    afficherMessage("Envoyer", "Vous n'avez encore ni évaluation enregistrée ni référentiel à envoyer.");
    return;
  }
  const dates = lireDatesModification(entrees[CLE_DATES_MODIFICATION]);
  const choisies = new Set<string>();
  const diplomesChoisis = new Set<string>();
  const { boite, fermer } = ouvrirBoite("Envoyer des évaluations et des référentiels");
  boite.append(
    creer(
      "p",
      "",
      `Cochez ce que vous envoyez. Le fichier sera signé de votre nom (${acces.identite.nom}) et ne contient ni noms d'élèves, ni résultats, ni votre suivi, sauf si vous cochez l'option en bas de cette fenêtre. ` +
        "Chaque évaluation emporte l'empreinte de son référentiel, que vous envoyiez le référentiel ou non.",
    ),
  );

  const filtre = creer("input");
  filtre.type = "search";
  filtre.placeholder = "Filtrer par intitulé ou promotion";
  const liste = creer("div", "echange-liste");
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const boutonCreer = creerBouton("", "btn primary", () => {
    boutonCreer.disabled = true;
    const avecEleves = caseEleves.checked;
    if (avecEleves && verifierNouveauMotDePasse(motDePasse.value, confirmation.value) !== null) {
      erreur.textContent = `Choisissez un mot de passe d'au moins ${String(LONGUEUR_MINIMALE_MOT_DE_PASSE)} caractères et saisissez-le deux fois à l'identique.`;
      erreur.hidden = false;
      boutonCreer.disabled = false;
      return;
    }
    erreur.hidden = true;
    const texte = JSON.stringify(
      construirePaquet(entrees, choisies, new Date(), acces.identite.nom, catalogue, diplomesChoisis, avecEleves),
    );
    const nom = `evaluations${EXTENSION_FICHIER}`;
    const enregistrement = avecEleves
      ? enregistrerFichierProtege(nom, texte, motDePasse.value)
      : enregistrerFichier(nom, new TextEncoder().encode(texte));
    enregistrement
      .then((fichierEcrit) => {
        if (fichierEcrit) {
          fermer();
        }
      })
      .catch((erreurEnregistrement: unknown) => {
        erreur.textContent = messagePourErreur(erreurEnregistrement);
        erreur.hidden = false;
      })
      .finally(() => {
        actualiser();
      });
  });

  const caseEleves = creer("input");
  caseEleves.type = "checkbox";
  const motDePasse = creer("input");
  motDePasse.type = "password";
  motDePasse.placeholder = "Mot de passe du fichier";
  motDePasse.autocomplete = "new-password";
  const confirmation = creer("input");
  confirmation.type = "password";
  confirmation.placeholder = "Mot de passe, une seconde fois";
  confirmation.autocomplete = "new-password";
  const optionEleves = creer("label", "echange-option");
  optionEleves.append(
    caseEleves,
    creer(
      "span",
      "",
      "Inclure les élèves et leurs résultats. Le fichier est alors chiffré : communiquez son mot de passe par un autre moyen que le fichier.",
    ),
  );
  const zoneMotDePasse = creer("div", "echange-outils");
  zoneMotDePasse.hidden = true;
  zoneMotDePasse.append(motDePasse, confirmation);
  caseEleves.addEventListener("change", () => {
    zoneMotDePasse.hidden = !caseEleves.checked;
  });

  for (const diplome of diplomes) {
    const ligne = creer("label", "echange-ligne");
    const case_ = creer("input");
    case_.type = "checkbox";
    const texte = creer("div");
    const titre = creer("div", "echange-titre");
    titre.append(creer("span", "echange-pastille", "Référentiel"), creer("span", "", `${diplome.diplome} — ${diplome.mention}`));
    texte.append(
      titre,
      creer(
        "div",
        "echange-detail",
        diplome.versionId === ""
          ? "Référentiel de travail, non validé."
          : `Version en vigueur, validée le ${ecrireJour(diplome.dateVersion)}.`,
      ),
    );
    ligne.append(case_, texte);
    case_.addEventListener("change", () => {
      if (case_.checked) {
        diplomesChoisis.add(diplome.diplomeId);
      } else {
        diplomesChoisis.delete(diplome.diplomeId);
      }
      actualiser();
    });
    liste.append(ligne);
  }

  const lignes = evaluations.map((evaluation) => {
    const ligne = creer("label", "echange-ligne");
    const case_ = creer("input");
    case_.type = "checkbox";
    const texte = creer("div");
    const description = decrireEvaluation(evaluation, dates[evaluation.id] ?? MODIFICATION_INCONNUE);
    texte.append(
      creer("div", "echange-titre", lireTexte(evaluation.titre) || "(sans intitulé)"),
      creer("div", "echange-detail", description),
    );
    ligne.append(case_, texte);
    case_.addEventListener("change", () => {
      if (case_.checked) {
        choisies.add(evaluation.id);
      } else {
        choisies.delete(evaluation.id);
      }
      actualiser();
    });
    liste.append(ligne);
    return { ligne, case_, recherche: `${lireTexte(evaluation.titre)} ${description}`.toLowerCase(), id: evaluation.id };
  });

  const actualiser = (): void => {
    const nombre = choisies.size + diplomesChoisis.size;
    boutonCreer.textContent = `Créer le fichier (${String(nombre)})`;
    boutonCreer.disabled = nombre === 0;
  };
  const cocherVisibles = (coche: boolean): void => {
    for (const { ligne, case_, id } of lignes) {
      if (!ligne.hidden) {
        case_.checked = coche;
        if (coche) {
          choisies.add(id);
        } else {
          choisies.delete(id);
        }
      }
    }
    actualiser();
  };
  filtre.addEventListener("input", () => {
    const cherche = filtre.value.trim().toLowerCase();
    for (const { ligne, recherche } of lignes) {
      ligne.hidden = !recherche.includes(cherche);
    }
  });

  const outils = creer("div", "echange-outils");
  outils.append(
    filtre,
    creerBouton("Toutes les évaluations", "btn ghost", () => {
      cocherVisibles(true);
    }),
    creerBouton("Aucune", "btn ghost", () => {
      cocherVisibles(false);
    }),
  );
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Annuler", "btn ghost", fermer), boutonCreer);
  boite.append(outils, liste, optionEleves, zoneMotDePasse, erreur, actions);
  actualiser();
}

function compterParAction(plan: readonly LignePlan[], action: Action): number {
  return plan.filter((ligne) => ligne.action === action).length;
}

/** Choix de l'enseignant sur les résultats d'élèves du fichier. */
interface ChoixResultats {
  lignes: ReadonlyMap<string, LigneResultats>;
  /** Évaluations dont les résultats du fichier sont acceptés. */
  acceptes: Set<string>;
  /** Évaluations dont les résultats différents du fichier remplacent ceux d'ici. */
  aRemplacer: Set<string>;
}

function creerCase(texte: string, cochee: boolean, surChangement: (cochee: boolean) => void): HTMLElement {
  const option = creer("label", "echange-option");
  const case_ = creer("input");
  case_.type = "checkbox";
  case_.checked = cochee;
  case_.addEventListener("change", () => {
    surChangement(case_.checked);
  });
  option.append(case_, creer("span", "", texte));
  return option;
}

/** Ajoute à une ligne d'évaluation ce qui concerne les résultats de ses élèves. */
function ajouterResultats(texte: HTMLElement, resultats: LigneResultats, choix: ChoixResultats, actualiser: () => void): void {
  if (!resultats.possible) {
    texte.append(
      creer(
        "div",
        "echange-detail alerte",
        "Résultats d'élèves non importables : la promotion concernée relève d'un diplôme absent de votre établissement.",
      ),
    );
    return;
  }
  const { nouveaux, differents, identiques } = resultats.bilan;
  const complements = [
    resultats.promotionCreee ? "la promotion sera créée" : "",
    !resultats.promotionCreee && resultats.elevesAjoutes > 0
      ? `${String(resultats.elevesAjoutes)} élève(s) ajouté(s) à votre promotion`
      : "",
  ].filter((complement) => complement !== "");
  const bilan = `${String(nouveaux)} élève(s) sans résultat chez vous, ${String(differents)} aux résultats différents des vôtres, ${String(identiques)} identiques`;
  texte.append(
    creerCase(
      `Recevoir les résultats des élèves : ${bilan}${complements.length > 0 ? ` · ${complements.join(" · ")}` : ""}.`,
      choix.acceptes.has(resultats.identifiant),
      (cochee) => {
        if (cochee) {
          choix.acceptes.add(resultats.identifiant);
        } else {
          choix.acceptes.delete(resultats.identifiant);
        }
        actualiser();
      },
    ),
  );
  if (differents > 0) {
    texte.append(
      creerCase("Remplacer mes résultats différents par ceux du fichier (sinon les miens sont gardés).", false, (cochee) => {
        if (cochee) {
          choix.aRemplacer.add(resultats.identifiant);
        } else {
          choix.aRemplacer.delete(resultats.identifiant);
        }
      }),
    );
  }
}

function creerLignePlan(
  ligne: LignePlan,
  choisies: Set<string>,
  choixResultats: ChoixResultats,
  actualiser: () => void,
): HTMLElement {
  const element = creer("label", ligne.action === "aucune" ? "echange-ligne inactive" : "echange-ligne");
  const case_ = creer("input");
  case_.type = "checkbox";
  case_.checked = ligne.proposee;
  case_.disabled = ligne.action === "aucune";
  case_.addEventListener("change", () => {
    if (case_.checked) {
      choisies.add(ligne.identifiant);
    } else {
      choisies.delete(ligne.identifiant);
    }
    actualiser();
  });

  const texte = creer("div");
  const titre = creer("div", "echange-titre");
  titre.append(creer("span", `echange-pastille ${ligne.action}`, LIBELLES_ACTION[ligne.action]), creer("span", "", ligne.titre));
  texte.append(titre);

  const dansFichier = `Dans le fichier : ${ecrireModification({ le: ligne.modifieDansFichierLe, par: ligne.modifieDansFichierPar })}`;
  const chezVous = `Chez vous : ${ecrireModification({ le: ligne.modifieIciLe, par: ligne.modifieIciPar })}`;
  texte.append(creer("div", "echange-detail", ligne.action === "creer" ? dansFichier : `${chezVous} · ${dansFichier}`));
  if (ligne.rubriquesModifiees.length > 0) {
    texte.append(creer("div", "echange-detail", `Ce qui change : ${ligne.rubriquesModifiees.join(", ")}.`));
  }
  if (ligne.action === "modifier") {
    texte.append(creer("div", "echange-detail", "Vos élèves, leurs résultats et votre suivi sont conservés."));
  }
  if (ligne.versionLocalePlusRecente) {
    texte.append(
      creer("div", "echange-detail alerte", "Votre version est plus récente que celle du fichier : elle serait remplacée."),
    );
  }
  if (ligne.action !== "aucune") {
    const referentiel = MESSAGES_REFERENTIEL[ligne.referentiel.etat];
    texte.append(creer("div", referentiel.alerte ? "echange-detail alerte" : "echange-detail", referentiel.texte));
  }
  const resultats = choixResultats.lignes.get(ligne.identifiant);
  if (resultats !== undefined) {
    ajouterResultats(texte, resultats, choixResultats, actualiser);
  }
  element.append(case_, texte);
  return element;
}

const LIBELLES_ACTION_REFERENTIEL: Record<ActionReferentiel, string> = {
  ajouter: "Nouvelle version",
  aucune: "Identique",
  "creer-diplome": "Nouveau diplôme",
};

const LIBELLES_PARTIES: Record<keyof Differences, string> = {
  blocs: "Blocs",
  ues: "Unités d'enseignement",
  ecs: "Enseignements constitutifs",
  competences: "Compétences",
};

/** Nombre de codes ou de noms cités avant de résumer par « … ». */
const NOMBRE_MAXIMAL_CITES = 6;

function citer(elements: readonly string[]): string {
  const cites = elements.slice(0, NOMBRE_MAXIMAL_CITES).join(", ");
  return elements.length > NOMBRE_MAXIMAL_CITES ? `${cites}…` : cites;
}

/** Décrit en phrases les écarts d'un référentiel reçu avec celui d'ici. */
function decrireDifferences(differences: Differences): string[] {
  const phrases: string[] = [];
  for (const partie of ["competences", "ecs", "ues", "blocs"] as const) {
    const { ajoutes, retires, modifies } = differences[partie];
    const morceaux = [
      ajoutes.length > 0 ? `${String(ajoutes.length)} en plus (${citer(ajoutes)})` : "",
      retires.length > 0 ? `${String(retires.length)} en moins (${citer(retires)})` : "",
      modifies.length > 0 ? `${String(modifies.length)} modifié(s) (${citer(modifies)})` : "",
    ].filter((morceau) => morceau !== "");
    if (morceaux.length > 0) {
      phrases.push(`${LIBELLES_PARTIES[partie]} : ${morceaux.join(" · ")}.`);
    }
  }
  return phrases;
}

function creerLigneReferentiel(ligne: LigneReferentiel, choisis: Set<string>, actualiser: () => void): HTMLElement {
  const element = creer("label", ligne.action === "aucune" ? "echange-ligne inactive" : "echange-ligne");
  const case_ = creer("input");
  case_.type = "checkbox";
  case_.checked = ligne.action !== "aucune";
  case_.disabled = ligne.action === "aucune";
  case_.addEventListener("change", () => {
    if (case_.checked) {
      choisis.add(ligne.identifiant);
    } else {
      choisis.delete(ligne.identifiant);
    }
    actualiser();
  });
  const texte = creer("div");
  const titre = creer("div", "echange-titre");
  titre.append(
    creer("span", `echange-pastille ${ligne.action === "aucune" ? "" : "creer"}`, LIBELLES_ACTION_REFERENTIEL[ligne.action]),
    creer("span", "", `Référentiel ${ligne.diplome} — ${ligne.mention}`),
  );
  texte.append(titre);
  texte.append(
    creer(
      "div",
      "echange-detail",
      ligne.dateVersion === "" ? "Référentiel de travail, non validé par son auteur." : `Version validée le ${ecrireJour(ligne.dateVersion)}.`,
    ),
  );
  if (ligne.action === "ajouter" && ligne.differences !== null) {
    const phrases = decrireDifferences(ligne.differences);
    for (const phrase of phrases.length > 0 ? phrases : ["Écarts limités aux niveaux ou aux réglages du diplôme."]) {
      texte.append(creer("div", "echange-detail", `Par rapport au vôtre — ${phrase}`));
    }
    texte.append(
      creer(
        "div",
        "echange-detail",
        "Il sera ajouté comme nouvelle version, sans être activé : votre référentiel et vos promotions ne changent pas.",
      ),
    );
  }
  if (ligne.action === "creer-diplome") {
    texte.append(
      creer(
        "div",
        "echange-detail",
        "Ce diplôme n'existe pas encore chez vous : il sera créé avec ce référentiel, prêt à l'emploi.",
      ),
    );
  }
  element.append(case_, texte);
  return element;
}

function montrerPlan(
  acces: AccesDonnees,
  entrees: Entrees,
  paquet: Paquet,
  plan: readonly LignePlan[],
  planReferentiels: readonly LigneReferentiel[],
  catalogue: readonly ReferentielLocal[],
): void {
  const { boite, fermer } = ouvrirBoite("Ce que ce fichier changerait");
  if (plan.length === 0 && planReferentiels.length === 0) {
    fermer();
    afficherMessage("Recevoir", "Ce fichier ne contient ni évaluation ni référentiel.");
    return;
  }
  const choisies = new Set(plan.filter((ligne) => ligne.proposee).map((ligne) => ligne.identifiant));
  const referentielsChoisis = new Set(
    planReferentiels.filter((ligne) => ligne.action !== "aucune").map((ligne) => ligne.identifiant),
  );
  const lignesResultats = calculerPlanResultats(entrees, paquet, catalogue);
  const choixResultats: ChoixResultats = {
    lignes: lignesResultats,
    // Par défaut : accepter ce qui complète sans rien écraser.
    acceptes: new Set(
      [...lignesResultats.values()]
        .filter((ligne) => ligne.possible && ligne.bilan.nouveaux > 0)
        .map((ligne) => ligne.identifiant),
    ),
    aRemplacer: new Set(),
  };
  const expediteur = paquet.expediteur === "" ? "un enseignant non identifié" : paquet.expediteur;
  boite.append(creer("p", "", `Fichier créé par ${expediteur} le ${ecrireDate(paquet.creeLe)}.`));
  boite.append(
    creer(
      "p",
      "",
      `${String(compterParAction(plan, "creer"))} nouvelle(s) · ${String(compterParAction(plan, "modifier"))} modifiée(s) · ` +
        `${String(compterParAction(plan, "aucune"))} identique(s). Rien n'est changé tant que vous n'avez pas validé. ` +
        "Vos évaluations absentes de ce fichier ne sont pas touchées.",
    ),
  );
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const boutonAppliquer = creerBouton("", "btn primary", () => {
    boutonAppliquer.disabled = true;
    const maintenant = new Date();
    const { entrees: avecReferentiels, versionsCreees } = appliquerReferentiels(entrees, planReferentiels, referentielsChoisis, {
      dateDuJour: maintenant.toISOString().slice(0, "AAAA-MM-JJ".length),
      note: `Reçu de ${expediteur} le ${ecrireDate(maintenant.toISOString())}`,
      genererIdentifiant: (partie) => `${partie.charAt(0)}${crypto.randomUUID().slice(0, LONGUEUR_IDENTIFIANT_GENERE)}`,
    });
    const aAppliquer = appliquerPlan(avecReferentiels, rattacherAuxVersionsCreees(plan, versionsCreees), choisies, maintenant);
    const avecResultats = appliquerResultats(
      aAppliquer,
      paquet,
      catalogue,
      choixResultats.acceptes,
      choixResultats.aRemplacer,
      () => `s${crypto.randomUUID().slice(0, LONGUEUR_IDENTIFIANT_GENERE)}`,
    );
    acces.remplacerEntrees(avecResultats).catch((erreurApplication: unknown) => {
      erreur.textContent = messagePourErreur(erreurApplication);
      erreur.hidden = false;
      boutonAppliquer.disabled = false;
    });
  });
  const actualiser = (): void => {
    const nombre = choisies.size + referentielsChoisis.size + choixResultats.acceptes.size;
    boutonAppliquer.textContent = `Appliquer (${String(nombre)})`;
    boutonAppliquer.disabled = nombre === 0;
  };
  const liste = creer("div", "echange-liste");
  for (const ligne of planReferentiels) {
    liste.append(creerLigneReferentiel(ligne, referentielsChoisis, actualiser));
  }
  // Ce qui demande une décision d'abord : nouvelles, puis modifiées, puis identiques.
  const ordre: Record<Action, number> = { creer: 0, modifier: 1, aucune: 2 };
  for (const ligne of [...plan].sort((a, b) => ordre[a.action] - ordre[b.action])) {
    liste.append(creerLignePlan(ligne, choisies, choixResultats, actualiser));
  }
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Annuler", "btn ghost", fermer), boutonAppliquer);
  boite.append(liste, erreur, actions);
  actualiser();
}

/**
 * Demande le mot de passe d'un fichier protégé et rend son contenu déchiffré.
 * La boîte reste ouverte tant que le mot de passe est refusé.
 *
 * @returns `null` si l'enseignant renonce.
 */
function demanderMotDePasseFichier(fichier: string): Promise<string | null> {
  return new Promise((resoudre) => {
    const { boite, fermer } = ouvrirBoite("Fichier protégé");
    boite.append(
      creer(
        "p",
        "",
        "Ce fichier contient des élèves et leurs résultats. Saisissez le mot de passe que son expéditeur vous a communiqué.",
      ),
    );
    const formulaire = creer("form", "echange-outils");
    const motDePasse = creer("input");
    motDePasse.type = "password";
    motDePasse.placeholder = "Mot de passe du fichier";
    motDePasse.required = true;
    const erreur = creer("p", "echange-erreur");
    erreur.hidden = true;
    const ouvrir = creer("button", "btn primary", "Ouvrir");
    ouvrir.type = "submit";
    formulaire.append(motDePasse, ouvrir);
    formulaire.addEventListener("submit", (evenement) => {
      evenement.preventDefault();
      ouvrir.disabled = true;
      dechiffrerFichierEchange(fichier, motDePasse.value)
        .then((clair) => {
          fermer();
          resoudre(clair);
        })
        .catch((erreurOuverture: unknown) => {
          erreur.textContent = messagePourErreur(erreurOuverture);
          erreur.hidden = false;
          ouvrir.disabled = false;
        });
    });
    const actions = creer("div", "echange-actions");
    actions.append(
      creerBouton("Renoncer", "btn ghost", () => {
        fermer();
        resoudre(null);
      }),
    );
    boite.append(formulaire, erreur, actions);
    motDePasse.focus();
  });
}

async function lancerImport(acces: AccesDonnees): Promise<void> {
  const texte = await ouvrirFichierEchange();
  if (texte === null) {
    return;
  }
  const protege = estFichierProtege(texte);
  const clair = protege ? await demanderMotDePasseFichier(texte) : texte;
  if (clair === null) {
    return;
  }
  const paquet = lirePaquet(clair, protege);
  if (typeof paquet === "string") {
    afficherMessage("Recevoir", MESSAGES_PAQUET[paquet]);
    return;
  }
  const entrees = acces.lireEntrees();
  const catalogue = await acces.dresserCatalogue(entrees);
  montrerPlan(
    acces,
    entrees,
    paquet,
    calculerPlan(entrees, paquet, catalogue),
    calculerPlanReferentiels(paquet, catalogue),
    catalogue,
  );
}

function montrerTransfert(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Changer d'ordinateur");
  boite.append(
    creer(
      "p",
      "",
      "Le fichier de transfert contient toutes vos données. Il reste chiffré : il s'ouvre avec votre mot de passe actuel, ou votre code de secours.",
    ),
    creer(
      "p",
      "",
      "Sur le nouvel ordinateur, installez DNMAX puis, au premier lancement, choisissez « J'ai déjà mes données sur un autre ordinateur ». " +
        "Cela n'est possible que sur une installation qui ne contient encore rien.",
    ),
  );
  const erreur = creer("p", "echange-erreur");
  erreur.hidden = true;
  const boutonCreer = creerBouton("Créer le fichier de transfert", "btn primary", () => {
    boutonCreer.disabled = true;
    acces
      .enregistrerMaintenant()
      .then(() => exporterCoffre())
      .then((fichierEcrit) => {
        if (fichierEcrit) {
          fermer();
        }
      })
      .catch((erreurTransfert: unknown) => {
        erreur.textContent = messagePourErreur(erreurTransfert);
        erreur.hidden = false;
      })
      .finally(() => {
        boutonCreer.disabled = false;
      });
  });
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer), boutonCreer);
  boite.append(erreur, actions);
}

function montrerChoix(acces: AccesDonnees): void {
  const { boite, fermer } = ouvrirBoite("Échanger avec d'autres enseignants");
  const choix = creer("div", "echange-choix");
  const envoyer = creerBouton("", "", () => {
    fermer();
    const entrees = acces.lireEntrees();
    acces
      .dresserCatalogue(entrees)
      .then((catalogue) => {
        montrerExport(acces, entrees, catalogue);
      })
      .catch((erreur: unknown) => {
        afficherMessage("Envoyer", messagePourErreur(erreur));
      });
  });
  envoyer.append(
    creer("b", "", "Envoyer"),
    creer("span", "", "Créer un fichier d'évaluations et de référentiels à transmettre par courriel, clé USB ou l'ENT. Élèves et résultats sur option, dans un fichier chiffré."),
  );
  const recevoir = creerBouton("", "", () => {
    fermer();
    lancerImport(acces).catch((erreur: unknown) => {
      afficherMessage("Recevoir", messagePourErreur(erreur));
    });
  });
  recevoir.append(
    creer("b", "", "Recevoir"),
    creer("span", "", "Ouvrir un fichier reçu et choisir, ligne par ligne, ce que vous en gardez."),
  );
  const transferer = creerBouton("", "", () => {
    fermer();
    montrerTransfert(acces);
  });
  transferer.append(
    creer("b", "", "Changer d'ordinateur"),
    creer("span", "", "Emporter toutes vos données, élèves et résultats compris, vers une nouvelle installation de DNMAX."),
  );
  choix.append(envoyer, recevoir, transferer);
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  boite.append(choix, actions);
}

/** Rend visible le bouton « Échanger… » de l'en-tête et le branche. */
export function installerEchange(acces: AccesDonnees): void {
  const bouton = document.getElementById(IDENTIFIANT_BOUTON);
  if (bouton === null) {
    return;
  }
  bouton.hidden = false;
  bouton.title = `Vous êtes identifié·e comme ${acces.identite.nom}`;
  bouton.addEventListener("click", () => {
    montrerChoix(acces);
  });
}
