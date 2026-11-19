// SPDX-License-Identifier: CECILL-2.1
import "./ecran-coffre.css";
import "./ecran-bienvenue.css";
import {
  anneesEntreePromotionsEnCours,
  debutAnneeScolaire,
  diplomeDeVersion,
  doitProposerBienvenue,
  installerPremierEtablissement,
} from "./domaine/bienvenue";
import { CLE_DONNEES, analyserJson, estObjet } from "./domaine/echange/modele";
import { lirePaquet } from "./domaine/echange/paquet";
import { appliquerReferentiels, calculerPlanReferentiels } from "./domaine/echange/plan-referentiels";
import { estReferentielVide } from "./domaine/echange/referentiel";
import type { Entrees } from "./domaine/magasin-memoire";
import { NOMBRE_ETAPES_BIENVENUE, creerEcranCoffre, messagePourErreur } from "./ecran-coffre";
import type { AccesDonnees } from "./ecran-echange";
import { REFERENTIELS_EMBARQUES } from "./referentiels-embarques";

/** Choix « autre mention » : aucun référentiel livré ne convient. */
const AUTRE_MENTION = "autre";
const LONGUEUR_IDENTIFIANT = 9;
const LONGUEUR_MAXIMALE_ETABLISSEMENT = 120;

const RANGS = ["1re", "2e", "3e", "4e", "5e"];
/** Les référentiels livrés sont ceux du DN MADE, en trois ans. */
const DUREE_DN_MADE = 3;

function genererIdentifiant(prefixe = ""): string {
  return `${prefixe}${crypto.randomUUID().replaceAll("-", "").slice(0, LONGUEUR_IDENTIFIANT)}`;
}

function creer<K extends keyof HTMLElementTagNameMap>(balise: K, classe = "", texte = ""): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  if (classe !== "") {
    element.className = classe;
  }
  if (texte !== "") {
    element.textContent = texte;
  }
  return element;
}

function nomEtablissementEnregistre(entrees: Entrees): string {
  const donnees = analyserJson(entrees[CLE_DONNEES]);
  const etablissement = estObjet(donnees) && estObjet(donnees.etab) ? donnees.etab : {};
  return typeof etablissement.nom === "string" ? etablissement.nom : "";
}

/** Phrase qui dit ce que le choix va installer, avant de cliquer. */
function decrireChoix(choix: string, debutAnnee: number): string {
  const referentiel = REFERENTIELS_EMBARQUES.find((candidat) => candidat.mention === choix);
  if (referentiel === undefined) {
    return (
      "Votre mention n'est pas encore livrée avec DNMAX. La visite guidée vous montrera comment recevoir le référentiel " +
      "d'un collègue ou construire le vôtre dans l'onglet « Référentiel » ; vos promotions se déclarent ensuite dans « Mon établissement »."
    );
  }
  const annees = anneesEntreePromotionsEnCours(debutAnnee, DUREE_DN_MADE).map(
    (annee, rang) => `${String(annee)} (${RANGS[rang] ?? ""} année)`,
  );
  const promotions = `${annees.slice(0, -1).join(", ")} et ${annees.at(-1) ?? ""}`;
  return (
    `DNMAX installe le référentiel ${referentiel.nom}, livré avec l'application, et crée vos trois promotions en cours, ` +
    `entrées en ${promotions}, encore sans étudiants. Vous vérifierez et validerez le référentiel pendant la visite guidée, avant votre première évaluation.`
  );
}

/**
 * Installe le référentiel livré de la mention choisie (même circuit qu'un
 * fichier reçu, tout accepté), puis l'établissement et ses promotions en cours.
 * Rend les entrées à enregistrer.
 */
async function preparerEntrees(acces: AccesDonnees, choix: string, nomEtablissement: string, maintenant: Date): Promise<Entrees> {
  const entrees = acces.lireEntrees();
  const referentiel = REFERENTIELS_EMBARQUES.find((candidat) => candidat.mention === choix);
  let avecReferentiel = entrees;
  let diplomeId: string | null = null;
  if (referentiel !== undefined) {
    const paquet = lirePaquet(referentiel.texte);
    if (typeof paquet === "string") {
      throw new Error(`référentiel ${referentiel.nom} illisible (${paquet})`);
    }
    const catalogue = await acces.dresserCatalogue(entrees);
    const lignes = calculerPlanReferentiels(paquet, catalogue);
    const { entrees: apres, versionsCreees } = appliquerReferentiels(
      entrees,
      lignes,
      new Set(lignes.filter((ligne) => ligne.action !== "aucune").map((ligne) => ligne.identifiant)),
      {
        dateDuJour: maintenant.toISOString().slice(0, "AAAA-MM-JJ".length),
        note: "Livré avec DNMAX, installé à la bienvenue",
        genererIdentifiant: (partie) => genererIdentifiant(partie.charAt(0)),
      },
    );
    avecReferentiel = apres;
    const version = [...versionsCreees.values()][0];
    diplomeId = version === undefined ? (lignes[0]?.diplomeId || null) : diplomeDeVersion(apres, version);
  }
  return installerPremierEtablissement(avecReferentiel, {
    nomEtablissement,
    diplomeId,
    debutAnnee: debutAnneeScolaire(maintenant),
    genererIdentifiant: () => genererIdentifiant(),
  });
}

function afficher(acces: AccesDonnees, etablissementSaisi: string): void {
  const { ecran, place } = creerEcranCoffre();
  ecran.classList.add("ecran-bienvenue");
  ecran.setAttribute("role", "dialog");
  ecran.setAttribute("aria-modal", "true");
  ecran.setAttribute("aria-labelledby", "bienvenue-titre");
  const formulaire = creer("form", "coffre-large");
  const titre = creer("h1", "", "Votre mention");
  titre.id = "bienvenue-titre";
  const debutAnnee = debutAnneeScolaire(new Date());

  const choix = creer("div", "bienvenue-mentions");
  choix.setAttribute("role", "radiogroup");
  choix.setAttribute("aria-label", "Mention");
  const options = [
    ...REFERENTIELS_EMBARQUES.map((referentiel) => ({ valeur: referentiel.mention, libelle: referentiel.mention, detail: referentiel.nom })),
    { valeur: AUTRE_MENTION, libelle: "Autre mention", detail: "référentiel à recevoir ou à construire" },
  ];
  for (const [rang, option] of options.entries()) {
    const carte = creer("label", "bienvenue-mention");
    const radio = creer("input");
    radio.type = "radio";
    radio.name = "mention";
    radio.value = option.valeur;
    radio.checked = rang === 0;
    const textes = creer("span");
    textes.append(creer("b", "", option.libelle), creer("small", "", option.detail));
    carte.append(radio, textes);
    choix.append(carte);
  }

  const champ = creer("label", "", "Nom de l'établissement");
  const saisie = creer("input");
  saisie.type = "text";
  saisie.name = "etablissement";
  saisie.maxLength = LONGUEUR_MAXIMALE_ETABLISSEMENT;
  saisie.autocomplete = "organization";
  saisie.value = etablissementSaisi || nomEtablissementEnregistre(acces.lireEntrees());
  champ.append(saisie);
  // Saisi à l'étape 2 : inutile de le redemander. Le champ ne revient que si la bienvenue reprend après une fermeture de DNMAX.
  champ.hidden = etablissementSaisi.trim() !== "";

  const resume = creer("p", "bienvenue-resume");
  resume.setAttribute("aria-live", "polite");
  const erreur = creer("p", "coffre-erreur");
  erreur.setAttribute("role", "alert");
  erreur.hidden = true;
  const bouton = creer("button", "btn primary");
  bouton.type = "submit";
  const actions = creer("div", "coffre-actions");
  actions.append(creer("span"), bouton);

  const choixCourant = (): string =>
    formulaire.querySelector<HTMLInputElement>('input[name="mention"]:checked')?.value ?? AUTRE_MENTION;
  const actualiser = (): void => {
    const valeur = choixCourant();
    resume.textContent = decrireChoix(valeur, debutAnnee);
    bouton.textContent = valeur === AUTRE_MENTION ? "Continuer sans référentiel" : "Installer et commencer";
  };
  choix.addEventListener("change", actualiser);

  formulaire.append(
    creer("p", "bienvenue-etape", `Étape ${String(NOMBRE_ETAPES_BIENVENUE)} sur ${String(NOMBRE_ETAPES_BIENVENUE)}`),
    titre,
    creer(
      "p",
      "",
      "Choisissez votre mention : son référentiel et vos trois promotions en cours sont installés d'office. " +
        "Le reste (collègues, répartition de service, évaluations, préférences) se découvre ensuite avec la visite guidée.",
    ),
    choix,
    champ,
    resume,
    erreur,
    actions,
  );
  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    if (bouton.disabled) {
      return;
    }
    bouton.disabled = true;
    erreur.hidden = true;
    preparerEntrees(acces, choixCourant(), saisie.value, new Date())
      // L'interface ne relit ses données qu'au chargement : la page se recharge, puis la visite démarre.
      .then((entrees) => acces.remplacerEntrees(entrees))
      .catch((echec: unknown) => {
        erreur.textContent =
          echec instanceof Error && echec.message.startsWith("référentiel")
            ? "Le référentiel livré n'a pas pu être lu. Choisissez « Autre mention » pour continuer, et signalez le problème."
            : messagePourErreur(echec);
        erreur.hidden = false;
        bouton.disabled = false;
      });
  });
  actualiser();
  place.append(formulaire);
  document.body.append(ecran);
  formulaire.querySelector<HTMLInputElement>('input[name="mention"]:checked')?.focus();
}

/**
 * Dernière étape de la page de bienvenue, une fois les données ouvertes :
 * choix de la mention. Ne s'affiche que sur une installation encore sans
 * référentiel ni évaluation, tant qu'elle n'a pas été suivie.
 *
 * Rend `true` si elle s'affiche : elle recharge alors la page une fois faite.
 */
export async function proposerBienvenue(acces: AccesDonnees, etablissementSaisi: string): Promise<boolean> {
  const entrees = acces.lireEntrees();
  const catalogue = await acces.dresserCatalogue(entrees);
  const aUnReferentiel = catalogue.some((referentiel) => !estReferentielVide(referentiel.contenu));
  if (!doitProposerBienvenue(entrees, aUnReferentiel)) {
    return false;
  }
  afficher(acces, etablissementSaisi);
  return true;
}
