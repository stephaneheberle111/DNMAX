// SPDX-License-Identifier: CECILL-2.1
/**
 * Progression, vue « Étudiant » (module Étudiants) : pour un étudiant d'une
 * promotion, où il en est dans les évaluations du semestre, comparé aux
 * autres, et ce qu'il a acquis sur les compétences jusqu'à ce semestre. Les
 * calculs sont dans `domaine/progression` et `domaine/vue-progression`.
 */
import { dateCourte } from "../domaine/frise-suivi";
import { ecartALaClasse, etatAnnee, fleche, palier, pourcentage, resumeAvancement, tendance } from "../domaine/vue-progression";
import { balise } from "../etablissement/editeur-commun";
import { bulleAide } from "../etablissement/volets";
import { barreFiltres, basculeVue, option, type FiltresCommuns } from "./promotion";

/** Une évaluation du semestre, pour l'étudiant. */
export interface LigneAvancement {
  /** ok, part, nr, disp, miss ou wait. */
  readonly etat: string;
  readonly titre: string;
  readonly distribPrev: string;
  readonly renduPrev: string;
  readonly saisies: number;
  readonly lignes: number;
  /** Non rendu ou dispensé : pas de lignes à compter. */
  readonly sansLignes: boolean;
  readonly promoSaisis: number;
  readonly promoTotal: number;
}

/** Une compétence évaluée jusqu'au semestre, avec la trajectoire de l'étudiant. */
export interface LigneAcquisition {
  readonly code: string;
  readonly libelle: string;
  readonly bloc: string;
  readonly trajectoire: readonly { readonly titre: string; readonly semestre: string; readonly niveau: number; readonly annee: number }[];
  /** Position dans la classe, ou `null` (comparaison masquée ou trop peu d'étudiants). */
  readonly position: { readonly moyenne: number; readonly ecart: number; readonly nombre: number } | null;
}

/** Ce que l'interface confie à la vue « Étudiant ». */
export interface ContexteProgressionEtudiant extends FiltresCommuns {
  readonly etudiants: readonly { readonly id: string; readonly nom: string }[];
  /** Étudiant affiché, ou `null` s'il n'y en a aucun. */
  readonly etudiant: string | null;
  readonly nomPromotion: string;
  readonly promotionCourte: string;
  readonly avancement: readonly LigneAvancement[];
  readonly rendus: { readonly tot: number; readonly rendu: number; readonly nr: number; readonly disp: number };
  readonly moyennes: { readonly rendu: number; readonly nr: number; readonly disp: number };
  readonly competences: readonly LigneAcquisition[];
  readonly niveaux: readonly string[];
  /** Rang du niveau à partir duquel une compétence est acquise. */
  readonly seuil: number;
  couleurNiveau(rang: number, nombre: number): string;
  encreNiveau(rang: number, nombre: number): string;
  nomBloc(numero: string): string;
  /** Noms des niveaux d'acquisition des trois années, avec le module ; sinon `null`. */
  readonly paliers: readonly string[] | null;
  readonly anneeCourante: number;
  choisirEtudiant(id: string): void;
  choisirVue(vue: string): void;
}

const ETATS: Readonly<Record<string, readonly [string, string]>> = {
  ok: ["ok", "Évalué"],
  part: ["part", "Évaluation partielle"],
  nr: ["todo", "Non rendu"],
  disp: ["prevue", "Dispensé·e"],
  miss: ["autre", "Non évalué·e"],
  wait: ["prevue", "Pas encore évaluée"],
};

function aide(paliers: boolean): string {
  return (
    "Pour un·e étudiant·e : les évaluations du semestre et les résultats obtenus, comparé au reste de la promotion — « Non évalué·e » signale une évaluation où les autres étudiant·es ont déjà des résultats saisis, mais pas celui-ci ou celle-ci. « Non rendu » et « Dispensé·e » se renseignent dans l'évaluation elle-même (étape Étudiant·es) et comptent comme traités. En dessous, toutes les compétences sur lesquelles il a été évalué jusqu'à ce semestre, avec l'évolution de son niveau de maîtrise d'une évaluation à l'autre" +
    (paliers
      ? " et sa progression dans les niveaux d'acquisition : Initié (année 1) → Guidé (année 2) → Autonome (année 3), chaque niveau étant atteint dès qu'il est évalué avec une maîtrise suffisante dans l'année correspondante."
      : ".")
  );
}

function arrondi(valeur: number): string {
  return (Math.round(valeur * 10) / 10).toLocaleString("fr-FR");
}

function choixEtudiant(contexte: ContexteProgressionEtudiant, rang: number): HTMLElement {
  const etiquette = balise("label");
  const precedent = balise("button", [["type", "button"], ["class", "btn ghost"], ["id", "pgElPrev"], ...(rang <= 0 ? [["disabled", ""] as const] : []), ["aria-label", "Étudiant·e précédent·e"]], "‹");
  const choix = balise("select", [["id", "pgEl"], ["aria-label", "Étudiant·e"]]);
  choix.append(...contexte.etudiants.map((etudiant) => option(etudiant.id, etudiant.nom, etudiant.id === contexte.etudiant)));
  const suivant = balise(
    "button",
    [["type", "button"], ["class", "btn ghost"], ["id", "pgElNext"], ...(rang >= contexte.etudiants.length - 1 ? [["disabled", ""] as const] : []), ["aria-label", "Étudiant·e suivant·e"]],
    "›",
  );
  const aller = (decalage: number): void => {
    const cible = contexte.etudiants[rang + decalage];
    if (cible !== undefined) contexte.choisirEtudiant(cible.id);
  };
  precedent.addEventListener("click", () => {
    aller(-1);
  });
  suivant.addEventListener("click", () => {
    aller(1);
  });
  choix.addEventListener("change", () => {
    contexte.choisirEtudiant(choix.value);
  });
  etiquette.append(
    balise("span", [["class", "sfl2"]], "Étudiant·e"),
    " ",
    precedent,
    " ",
    choix,
    " ",
    suivant,
    " ",
    balise("span", [["class", "hint"]], `${String(rang + 1)} / ${String(contexte.etudiants.length)}`),
  );
  return etiquette;
}

function indicateur(contexte: ContexteProgressionEtudiant, cle: "rendu" | "nr" | "disp", libelle: string, mauvais: boolean): HTMLElement {
  const valeur = contexte.rendus[cle];
  const moyenne = contexte.moyennes[cle];
  const cadre = balise("div", [["class", `pgkpi${ecartALaClasse(cle, valeur, moyenne, mauvais)}`]]);
  cadre.append(balise("span", [["class", "kl"]], libelle), balise("b", [], String(valeur)));
  if (cle === "rendu") cadre.append(balise("span", [["class", "kt"]], ` / ${String(contexte.rendus.tot)}`));
  else cadre.append(" ", balise("span", [["class", "kc"]], `classe : ${arrondi(moyenne)} en moyenne`));
  return cadre;
}

function avancement(contexte: ContexteProgressionEtudiant): HTMLElement {
  const bloc = balise("div", [["class", "pgbloc"]]);
  bloc.append(balise("div", [["class", "pgbh"]], `Avancement du ${contexte.semestre}`));
  if (contexte.avancement.length === 0) bloc.append(balise("div", [["class", "empty"]], `Aucune évaluation de ${contexte.nomPromotion} au ${contexte.semestre}.`));
  for (const ligne of contexte.avancement) {
    const [classe, libelle] = ETATS[ligne.etat] ?? ["", ""];
    const rangee = balise("div", [["class", "pgrow"]]);
    const dates = `${ligne.distribPrev === "" ? "" : `distribuée le ${dateCourte(ligne.distribPrev)}`}${ligne.renduPrev === "" ? "" : ` · rendu le ${dateCourte(ligne.renduPrev)}`}`;
    const description = balise("div", [["class", "pgc"]]);
    description.append(balise("div", [], ligne.titre || "Sans titre"), balise("div", [["class", "hint"]], dates));
    const saisie = balise("div", [["class", "pgev"]]);
    saisie.append(
      balise("span", [["class", "hint"]], ligne.sansLignes ? "—" : `${String(ligne.saisies)} / ${String(ligne.lignes)} ligne${ligne.lignes > 1 ? "s" : ""}`),
      balise("div", [["class", "hint"]], `Promo : ${String(ligne.promoSaisis)}/${String(ligne.promoTotal)} évalués`),
    );
    rangee.append(balise("span", [["class", `pill pst ${classe}`]], libelle), description, saisie, balise("div", [["class", "pgst"]]));
    bloc.append(rangee);
  }
  return bloc;
}

function acquisition(contexte: ContexteProgressionEtudiant): HTMLElement {
  const { niveaux, seuil } = contexte;
  const nombre = niveaux.length;
  const competences = contexte.competences;
  const acquises = competences.filter((competence) => (competence.trajectoire.at(-1)?.niveau ?? -1) >= seuil).length;
  const bloc = balise("div", [["class", "pgbloc"]]);
  const titre = balise("div", [["class", "pgbh"]], "Acquisition des compétences ");
  let detail = `— ${String(acquises)} / ${String(competences.length)} acquises (dernier niveau ≥ « ${niveaux[seuil] ?? ""} »), jusqu'au ${contexte.semestre}`;
  if (contexte.paliers !== null && competences.length > 0) {
    const paliers = contexte.paliers;
    detail += ` · niveaux d'acquisition : ${[1, 2, 3].map((annee) => `${String(competences.filter((competence) => palier(competence.trajectoire, seuil) === annee).length)} ${paliers[annee - 1] ?? ""}`).join(", ")}`;
  }
  titre.append(balise("span", [["class", "hint"], ["style", "font-weight:400"]], detail));
  bloc.append(titre);
  const blocs = [...new Set(competences.map((competence) => competence.bloc))].sort((a, b) => Number(a) - Number(b));
  if (blocs.length === 0) bloc.append(balise("div", [["class", "empty"]], "Pas encore de niveau saisi pour cet·te étudiant·e."));
  for (const numero of blocs) {
    bloc.append(balise("div", [["class", "pgbh"], ["style", "font-weight:500;border-top:0;padding-top:8px"]], `${numero} - ${contexte.nomBloc(numero)}`));
    const duBloc = competences.filter((competence) => competence.bloc === numero).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    for (const competence of duBloc) {
      const dernier = competence.trajectoire.at(-1)?.niveau ?? 0;
      const rangee = balise("div", [["class", "pgrow"]]);
      const pastille = balise(
        "span",
        [["class", "pill"], ["style", `background:${contexte.couleurNiveau(dernier, nombre)};color:${contexte.encreNiveau(dernier, nombre)};border-color:transparent;justify-self:start`]],
        niveaux[dernier] ?? "",
      );
      const description = balise("div", [["class", "pgc"]]);
      const intitule = balise("div");
      intitule.append(balise("b", [], competence.code), ` ${competence.libelle}`);
      description.append(intitule);
      if (competence.position !== null) {
        const { moyenne, ecart, nombre: effectif } = competence.position;
        const position = balise("div", [["class", "pgpos"], ["style", "margin-top:4px"]]);
        position.append(
          balise("span", [["class", "hint"]], `Classe : en moyenne « ${niveaux[moyenne] ?? ""} » (${String(effectif)} étudiant·es)`),
          " ",
          balise("span", [["class", `pp ${ecart > 0 ? "up" : ecart < 0 ? "dn" : "eq"}`]], ecart > 0 ? "▲ au-dessus" : ecart < 0 ? "▼ en dessous" : "= dans la moyenne"),
        );
        description.append(position);
      }
      const evolution = balise("div", [["class", "pgev"]]);
      const trajet = balise("div", [["class", "trj"]]);
      competence.trajectoire.forEach((etape, rang) => {
        const precedent = competence.trajectoire[rang - 1];
        if (precedent !== undefined) trajet.append(balise("span", [["class", "trj-ar"]], fleche(precedent.niveau, etape.niveau)));
        const point = balise("span", [["class", "trj-s"], ["title", `${etape.titre} — ${niveaux[etape.niveau] ?? ""}`]]);
        point.append(balise("i", [["style", `background:${contexte.couleurNiveau(etape.niveau, nombre)}`]]), `${etape.semestre} · ${niveaux[etape.niveau] ?? ""}`);
        trajet.append(point);
      });
      evolution.append(trajet, balise("span", [["class", "hint"]], tendance(competence.trajectoire.map((etape) => etape.niveau))));
      const paliers = balise("div", [["class", "pgst"]]);
      if (contexte.paliers !== null) {
        const piste = balise("div", [["class", "dntrk"]]);
        for (const annee of [1, 2, 3]) {
          const nom = contexte.paliers[annee - 1] ?? "";
          const etat = etatAnnee(competence.trajectoire, annee, seuil, contexte.anneeCourante);
          const marque = balise("span", [["class", `dnst${etat.classe}`], ["title", `${nom} (année ${String(annee)}) : ${etat.texte}`]]);
          marque.append(balise("i"), nom);
          piste.append(marque);
        }
        paliers.append(piste);
      }
      rangee.append(pastille, description, evolution, paliers);
      bloc.append(rangee);
    }
  }
  return bloc;
}

export function peindreProgressionEtudiant(hote: HTMLElement, contexte: ContexteProgressionEtudiant): void {
  const rang = contexte.etudiants.findIndex((etudiant) => etudiant.id === contexte.etudiant);
  const nomEtudiant = contexte.etudiants[rang]?.nom ?? "";
  const panneau = balise("div", [["class", "panel"]]);
  const tete = balise("div", [["class", "pick-head"]]);
  const titre = balise("h3", [], "Progression étudiant·e");
  titre.append(bulleAide(aide(contexte.paliers !== null)));
  const droite = balise("div", [["style", "margin-left:auto"]]);
  droite.append(basculeVue(true, (vue) => { contexte.choisirVue(vue); }));
  tete.append(titre, droite);
  panneau.append(tete, barreFiltres(contexte, contexte.etudiant === null ? [] : [choixEtudiant(contexte, rang)]));
  if (contexte.etudiant === null) {
    panneau.append(balise("div", [["class", "empty"]], `Aucun·e étudiant·e dans ${contexte.nomPromotion}. Ajoutez-les dans Mon établissement > Promotions.`));
    hote.replaceChildren(panneau);
    return;
  }
  const lignes = contexte.avancement;
  const compte = (etat: string): number => lignes.filter((ligne) => ligne.etat === etat).length;
  const completes = compte("ok");
  const resume = balise("div", [["class", "pgsum"]]);
  const nom = balise("div", [["style", "font-family:var(--fd);font-weight:700;font-size:15px"]], `${nomEtudiant} `);
  nom.append(balise("span", [["class", "hint"], ["style", "font-weight:400"]], `· ${contexte.promotionCourte}`));
  const chiffre = balise("div");
  chiffre.append(
    balise("b", [["class", "big"]], String(completes)),
    ` / ${String(lignes.length)} évaluation${lignes.length > 1 ? "s" : ""} du ${contexte.semestre} complète${completes > 1 ? "s" : ""} pour cet·te étudiant·e`,
  );
  const barre = balise("div", [["class", "pgbar"]]);
  barre.append(balise("i", [["style", `width:${String(pourcentage(completes, lignes.length))}%`]]));
  resume.append(nom, chiffre, barre);
  if (contexte.rendus.tot > 0) {
    const indicateurs = balise("div", [["class", "pgkpis"]]);
    indicateurs.append(
      indicateur(contexte, "rendu", "Rendus", false),
      indicateur(contexte, "nr", "Non rendus", true),
      indicateur(contexte, "disp", `Dispensé·e${contexte.rendus.disp > 1 ? "s" : ""}`, true),
    );
    resume.append(indicateurs);
  }
  const retard = balise("div", [["class", "hint"]]);
  resumeAvancement({ part: compte("part"), nr: compte("nr"), disp: compte("disp"), miss: compte("miss"), wait: compte("wait") }, lignes.length, contexte.semestre).forEach(
    (morceau, position) => {
      if (position > 0) retard.append(" · ");
      retard.append(morceau.gras ? balise("b", [], morceau.texte) : morceau.texte);
    },
  );
  resume.append(retard);
  panneau.append(resume, avancement(contexte), acquisition(contexte));
  hote.replaceChildren(panneau);
}
