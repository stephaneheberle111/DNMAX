// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 4 de l'éditeur d'évaluation : la saisie des résultats des étudiants
 * (module Étudiants), en grille ou étudiant par étudiant. Les règles sont dans
 * `domaine/saisie-resultats` ; ce module affiche et transmet ce qui est saisi.
 */
import {
  avancementEtudiant,
  bilanSaisie,
  changerRendu,
  noterNiveau,
  pourcentageAffiche,
  statutRendu,
  type AvancementEtudiant,
  type StatutRendu,
} from "../domaine/saisie-resultats";
import { creer, creerBouton } from "../ecran-echange";
import { creerJauge } from "./jauge";

export interface EtudiantEvalue {
  readonly id: string;
  readonly nom: string;
}

/** Une ligne de l'évaluation : une compétence, ou un regroupement de compétences. */
export interface LigneEvaluee {
  /** Clé des résultats (`one:C4.1` ou `op:<identifiant>`). */
  readonly cle: string;
  readonly code: string;
  readonly libelle: string;
}

export type ModeSaisie = "grille" | "fiche";

export interface VueSaisie {
  readonly mode: ModeSaisie;
  /** Étudiant affiché en mode fiche ; le premier si vide ou inconnu. */
  readonly etudiant: string;
}

/** Ce que l'éditeur confie à l'étape 4. */
export interface ContexteSaisieEtudiants {
  /**
   * Résultats de l'évaluation, par identifiant d'étudiant. L'objet est modifié
   * sur place : c'est celui de l'évaluation en cours.
   */
  readonly resultats: Record<string, unknown>;
  readonly niveaux: readonly string[];
  readonly etudiants: readonly EtudiantEvalue[];
  readonly lignes: readonly LigneEvaluee[];
  readonly vue: VueSaisie;
  /** Date du jour, au format AAAA-MM-JJ. */
  aujourdhui(): string;
  /** Retient la vue choisie (grille ou fiche, étudiant affiché). */
  retenirVue(vue: VueSaisie): void;
  /** Enregistre l'évaluation en cours. */
  enregistrer(): void;
  /** Après une saisie qui change l'avancement : la barre des étapes se met à jour. */
  apresSaisie(): void;
  annoncer(message: string): void;
}

/** Résultat d'un étudiant tel que l'écran le modifie : niveaux, observations, appréciation, date de restitution. */
interface ResultatEtudiant {
  [champ: string]: unknown;
  n: Record<string, unknown>;
  obs: Record<string, unknown>;
  appr: unknown;
  rest?: unknown;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Résultat de l'étudiant, créé s'il manque, avec ses champs attendus. */
function resultatDe(resultats: Record<string, unknown>, id: string): ResultatEtudiant {
  const existant = resultats[id];
  const resultat: Record<string, unknown> = estObjet(existant) ? existant : {};
  resultats[id] = resultat;
  if (!estObjet(resultat.n)) resultat.n = {};
  if (!estObjet(resultat.obs)) resultat.obs = {};
  resultat.appr ??= "";
  return resultat as ResultatEtudiant;
}

/**
 * Les règles rendent un nouveau résultat : il est versé dans l'objet existant,
 * que tiennent encore les champs déjà posés à l'écran (observations, appréciation).
 */
function remplacer(cible: Record<string, unknown>, nouveau: Record<string, unknown>): void {
  for (const champ of Object.keys(cible)) {
    if (!(champ in nouveau)) Reflect.deleteProperty(cible, champ);
  }
  Object.assign(cible, nouveau);
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

const LIBELLES_RENDU: readonly (readonly [StatutRendu, string])[] = [
  ["", "—"],
  ["rendu", "Rendu"],
  ["nr", "Non rendu"],
  ["disp", "Dispensé·e"],
];

function pluriel(nombre: number, mot: string): string {
  return `${String(nombre)} ${mot}${nombre > 1 ? "s" : ""}`;
}

/** Compteur, avancement et conseil de l'en-tête de l'étape 4. */
export function peindreAvancement(contexte: ContexteSaisieEtudiants): void {
  const { etudiants, lignes } = contexte;
  const compte = document.getElementById("eCount");
  if (compte !== null) compte.textContent = String(etudiants.length);
  const bilan = bilanSaisie(
    contexte.resultats,
    etudiants.map((etudiant) => etudiant.id),
    lignes.map((ligne) => ligne.cle),
  );
  const avancement = document.getElementById("eProg");
  if (avancement !== null) {
    avancement.textContent =
      etudiants.length === 0
        ? ""
        : `${String(bilan.faits)} / ${pluriel(etudiants.length, "étudiant·e")} évalué·e${etudiants.length > 1 ? "s" : ""}` +
          (bilan.partiels > 0 ? ` · ${pluriel(bilan.partiels, "commencé·e")}` : "") +
          ` · ${pluriel(lignes.length, "ligne")}`;
  }
  const conseil = document.getElementById("n4hint");
  if (conseil !== null) {
    conseil.textContent =
      etudiants.length === 0
        ? ""
        : bilan.faits === etudiants.length
          ? "Tout le monde est évalué — le Word par étudiant·e et l'Excel de la promo se génèrent depuis « Mes évaluations »."
          : "Chaque saisie est enregistrée aussitôt ; les documents se génèrent depuis « Mes évaluations ».";
  }
}

/**
 * Affiche l'étape 4 dans `hote` : la grille de toute la promotion, ou la fiche
 * d'un étudiant. Toute saisie est enregistrée aussitôt.
 */
export function peindreSaisieEtudiants(hote: HTMLElement, contexte: ContexteSaisieEtudiants): void {
  const { etudiants, lignes, vue } = contexte;
  document.querySelectorAll<HTMLElement>("#eMode [data-emode]").forEach((bouton) => {
    bouton.setAttribute("aria-pressed", String(bouton.dataset.emode === vue.mode));
  });
  peindreAvancement(contexte);
  if (etudiants.length === 0) {
    hote.replaceChildren(
      creer(
        "div",
        "empty",
        "Aucun·e étudiant·e. Choisissez une promotion à l'étape 1, ou saisissez une liste de noms, puis revenez ici pour évaluer chacun·e.",
      ),
    );
    return;
  }
  if (lignes.length === 0) {
    hote.replaceChildren(creer("div", "empty", "Aucune ligne à évaluer : revenez à l'étape 2 pour choisir des compétences."));
    return;
  }
  const repeindre = (nouvelle: VueSaisie): void => {
    contexte.retenirVue(nouvelle);
    peindreSaisieEtudiants(hote, { ...contexte, vue: nouvelle });
  };
  if (vue.mode === "grille") {
    peindreGrille(hote, contexte, repeindre);
  } else {
    peindreFiche(hote, contexte, repeindre);
  }
}

function avancementDe(contexte: ContexteSaisieEtudiants, id: string): AvancementEtudiant {
  return avancementEtudiant(
    contexte.resultats[id],
    contexte.lignes.map((ligne) => ligne.cle),
  );
}

/** Liste du statut de rendu d'un étudiant. */
function choixRendu(statut: StatutRendu, etiquette: string, surChoix: (statut: string) => void): HTMLSelectElement {
  const liste = creer("select", `est${statut === "nr" || statut === "disp" ? " on" : statut === "" ? " vide" : ""}`);
  liste.setAttribute("aria-label", etiquette);
  for (const [valeur, libelle] of LIBELLES_RENDU) {
    const option = creer("option", "", libelle);
    option.value = valeur;
    option.selected = valeur === statut;
    liste.append(option);
  }
  liste.addEventListener("change", () => {
    surChoix(liste.value);
  });
  return liste;
}

/** Saisit (ou efface) un niveau et rend son effet sur le statut de rendu de l'étudiant. */
function noter(contexte: ContexteSaisieEtudiants, id: string, cle: string, pourcentage: number | null): "absence-levee" | "devenu-rendu" | "inchange" {
  const resultat = resultatDe(contexte.resultats, id);
  const suite = noterNiveau(resultat, cle, pourcentage, contexte.niveaux.length, contexte.aujourdhui());
  remplacer(resultat, suite.resultat);
  contexte.enregistrer();
  contexte.apresSaisie();
  return suite.effet;
}

function changerStatut(contexte: ContexteSaisieEtudiants, id: string, statut: string): void {
  const resultat = resultatDe(contexte.resultats, id);
  const suite = changerRendu(resultat, statut, contexte.aujourdhui());
  remplacer(resultat, suite.resultat);
  if (suite.avis === "saisie-effacee") contexte.annoncer("Niveaux, observations et appréciation de l'étudiant·e effacés.");
  if (suite.avis === "reste-rendu") contexte.annoncer("Des niveaux sont saisis pour cet·te étudiant·e : son statut reste « Rendu ».");
  contexte.enregistrer();
  contexte.apresSaisie();
}

/** Coche ou décoche « Restitué » : la date du jour est retenue. */
function marquerRestitue(contexte: ContexteSaisieEtudiants, id: string, restitue: boolean): ResultatEtudiant {
  const resultat = resultatDe(contexte.resultats, id);
  if (restitue) {
    resultat.rest = contexte.aujourdhui();
  } else {
    delete resultat.rest;
  }
  contexte.enregistrer();
  return resultat;
}

function titreRestitution(resultat: ResultatEtudiant): string {
  const date = texte(resultat.rest);
  return date === "" ? "Pas encore restitué" : `Restitué le ${date}`;
}

function peindreGrille(hote: HTMLElement, contexte: ContexteSaisieEtudiants, repeindre: (vue: VueSaisie) => void): void {
  const { etudiants, lignes, niveaux } = contexte;
  const colonnes = `minmax(150px,1.4fr) 112px repeat(${String(lignes.length)},minmax(140px,1fr)) 64px 86px`;
  const grille = creer("div", "egrid");
  const entete = creer("div", "eh");
  entete.style.gridTemplateColumns = colonnes;
  const enteteRendu = creer("span", "", "Rendu");
  enteteRendu.title =
    "Rendu, non rendu ou dispensé·e — à renseigner pour chaque étudiant·e avant de terminer l'évaluation. Un niveau saisi passe son statut à « Rendu »";
  const enteteRestitue = creer("span", "", "Restitué");
  enteteRestitue.style.textAlign = "center";
  enteteRestitue.title = "Résultat rendu à l'étudiant·e";
  const enteteFait = creer("span", "", "Fait");
  enteteFait.style.textAlign = "right";
  entete.append(
    creer("span", "", "Étudiant·e"),
    enteteRendu,
    ...lignes.map((ligne) => {
      const colonne = creer("span");
      colonne.title = ligne.libelle;
      colonne.append(creer("b", "", ligne.code));
      return colonne;
    }),
    enteteRestitue,
    enteteFait,
  );
  grille.append(entete);

  for (const etudiant of etudiants) {
    const resultat = resultatDe(contexte.resultats, etudiant.id);
    const rangee = creer("div", "er");
    rangee.style.gridTemplateColumns = colonnes;
    rangee.dataset.row = etudiant.id;
    const fait = creer("span", "n");
    const actualiser = (): void => {
      const avancement = avancementDe(contexte, etudiant.id);
      const absent = Boolean(resultat.nr) || Boolean(resultat.disp);
      rangee.classList.toggle("abs", absent);
      rangee.classList.toggle("ok", !absent && avancement.n >= avancement.tot);
      rangee.classList.toggle("part", !absent && avancement.n > 0 && avancement.n < avancement.tot);
      fait.textContent = `${String(avancement.n)}/${String(avancement.tot)}`;
    };
    const nom = creer("span", "nm");
    nom.append(
      creerBouton(etudiant.nom, "lnk", () => {
        repeindre({ mode: "fiche", etudiant: etudiant.id });
      }),
    );
    const rendu = choixRendu(statutRendu(resultat), `Rendu de ${etudiant.nom}`, (statut) => {
      changerStatut(contexte, etudiant.id, statut);
      repeindre(contexte.vue);
    });
    const caseRendu = creer("span");
    caseRendu.append(rendu);
    const jauges = lignes.map((ligne) => {
      const cellule = creer("span");
      const jauge = creerJauge({
        niveaux,
        pourcentage: pourcentageAffiche(resultat, ligne.cle, niveaux.length),
        grande: false,
        surChangement: (pourcentage) => {
          const effet = noter(contexte, etudiant.id, ligne.cle, pourcentage);
          if (effet === "absence-levee") {
            repeindre(contexte.vue);
            return;
          }
          if (effet === "devenu-rendu") {
            rendu.value = "rendu";
            rendu.classList.remove("vide", "on");
          }
          peindreAvancement(contexte);
          actualiser();
        },
      });
      cellule.append(jauge.element);
      return cellule;
    });
    const restitue = creer("input", "cbox");
    restitue.type = "checkbox";
    restitue.checked = texte(resultat.rest) !== "";
    restitue.title = titreRestitution(resultat);
    restitue.setAttribute("aria-label", `Restitué à ${etudiant.nom}`);
    restitue.addEventListener("change", () => {
      restitue.title = titreRestitution(marquerRestitue(contexte, etudiant.id, restitue.checked));
      peindreAvancement(contexte);
    });
    const caseRestitue = creer("span");
    caseRestitue.style.textAlign = "center";
    caseRestitue.append(restitue);
    rangee.append(nom, caseRendu, ...jauges, caseRestitue, fait);
    actualiser();
    grille.append(rangee);
  }
  const defilement = creer("div", "tw");
  defilement.append(grille);
  const aide = creer("div", "hint", "Une ligne par étudiant·e, une colonne par compétence évaluée. Un clic sur un nom ouvre sa fiche.");
  aide.style.padding = "10px 14px 2px";
  hote.replaceChildren(defilement, aide);
}

function peindreFiche(hote: HTMLElement, contexte: ContexteSaisieEtudiants, repeindre: (vue: VueSaisie) => void): void {
  const { etudiants, lignes, niveaux } = contexte;
  const etudiant = etudiants.find((candidat) => candidat.id === contexte.vue.etudiant) ?? etudiants[0];
  if (etudiant === undefined) return;
  const rang = etudiants.indexOf(etudiant);
  const resultat = resultatDe(contexte.resultats, etudiant.id);
  const aller = (id: string): void => {
    repeindre({ mode: "fiche", etudiant: id });
    hote.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const compteur = creer("span", "count");
  const actualiserCompteur = (): void => {
    const avancement = avancementDe(contexte, etudiant.id);
    compteur.textContent = `${String(avancement.n)}/${String(avancement.tot)}`;
  };
  const precedent = creerBouton("←", "btn ghost", () => {
    const voisin = etudiants[rang - 1];
    if (voisin !== undefined) aller(voisin.id);
  });
  precedent.id = "ePrev";
  precedent.disabled = rang <= 0;
  const suivant = creerBouton("→", "btn ghost", () => {
    const voisin = etudiants[rang + 1];
    if (voisin !== undefined) aller(voisin.id);
  });
  suivant.id = "eNext";
  suivant.disabled = rang >= etudiants.length - 1;
  const choix = creer("select");
  choix.id = "eSel";
  choix.setAttribute("aria-label", "Étudiant·e");
  for (const candidat of etudiants) {
    const avancement = avancementDe(contexte, candidat.id);
    const option = creer("option", "", `${candidat.nom} — ${String(avancement.n)}/${String(avancement.tot)}`);
    option.value = candidat.id;
    option.selected = candidat.id === etudiant.id;
    choix.append(option);
  }
  choix.addEventListener("change", () => {
    aller(choix.value);
  });
  const position = creer("span", "hint mono", `${String(rang + 1)} / ${String(etudiants.length)}`);
  const rendu = choixRendu(statutRendu(resultat), "Rendu", (statut) => {
    changerStatut(contexte, etudiant.id, statut);
    repeindre(contexte.vue);
  });
  rendu.id = "eEst";
  const caseRendu = creer("span");
  caseRendu.style.marginLeft = "auto";
  caseRendu.append(rendu);
  const restitution = creer("label", "rstl");
  const restitue = creer("input", "cbox");
  restitue.type = "checkbox";
  restitue.id = "eRest";
  restitue.checked = texte(resultat.rest) !== "";
  restitue.addEventListener("change", () => {
    marquerRestitue(contexte, etudiant.id, restitue.checked);
    repeindre(contexte.vue);
  });
  restitution.append(restitue, " Restitué");
  if (texte(resultat.rest) !== "") {
    restitution.append(" ", creer("span", "hint mono", texte(resultat.rest)));
  }
  const entete = creer("div", "ehead");
  entete.append(precedent, choix, suivant, position, caseRendu, restitution, compteur);
  actualiserCompteur();

  const blocs = lignes.map((ligne) => {
    const bloc = creer("div", "eline");
    const titre = creer("div", "t");
    titre.append(creer("span", "code", ligne.code), " ", creer("span", "", ligne.libelle));
    const jauge = creerJauge({
      niveaux,
      pourcentage: pourcentageAffiche(resultat, ligne.cle, niveaux.length),
      grande: true,
      surChangement: (pourcentage) => {
        const effet = noter(contexte, etudiant.id, ligne.cle, pourcentage);
        if (effet === "absence-levee") {
          repeindre(contexte.vue);
          return;
        }
        if (effet === "devenu-rendu") {
          rendu.value = "rendu";
          rendu.classList.remove("vide", "on");
        }
        peindreAvancement(contexte);
        actualiserCompteur();
      },
    });
    const effacer = creerBouton("—", "btn ghost nclr", () => {
      noter(contexte, etudiant.id, ligne.cle, null);
      repeindre(contexte.vue);
    });
    effacer.title = "Effacer";
    const rangee = creer("div", "nbrow");
    rangee.append(jauge.element, effacer);
    const observation = creer("input", "eobs");
    observation.type = "text";
    observation.placeholder = "Observation (facultatif)";
    observation.value = texte(resultat.obs[ligne.cle]);
    observation.addEventListener("input", () => {
      resultatDe(contexte.resultats, etudiant.id).obs[ligne.cle] = observation.value;
      contexte.enregistrer();
    });
    bloc.append(titre, rangee, observation);
    return bloc;
  });

  const appreciation = creer("textarea");
  appreciation.id = "eAppr";
  appreciation.rows = 3;
  appreciation.placeholder = `Quelques lignes pour ${etudiant.nom}…`;
  appreciation.value = texte(resultat.appr);
  appreciation.addEventListener("input", () => {
    resultatDe(contexte.resultats, etudiant.id).appr = appreciation.value;
    contexte.enregistrer();
  });
  const blocAppreciation = creer("div", "eline");
  const titreAppreciation = creer("div", "t");
  titreAppreciation.append(creer("span", "", "Appréciation générale"));
  blocAppreciation.append(titreAppreciation, appreciation);

  const fiche = creer("div", "efiche");
  fiche.append(entete, ...blocs, blocAppreciation);
  hote.replaceChildren(fiche);
}
