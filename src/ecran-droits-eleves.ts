// SPDX-License-Identifier: AGPL-3.0-or-later
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
  const nom = eleve.nom.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "eleve";
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
