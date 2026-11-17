// SPDX-License-Identifier: CECILL-2.1
/**
 * Progression, vue « Promotion » : pour une promotion et un semestre, les
 * compétences que le référentiel rattache à ce semestre et ce que les
 * évaluations enregistrées en couvrent. Les règles sont dans
 * `domaine/vue-progression` et `domaine/progression`.
 */
import { dateCourte } from "../domaine/frise-suivi";
import { blocsAffiches, lignesAffichees, ordreDansLeBloc, pourcentage } from "../domaine/vue-progression";
import { balise } from "../etablissement/editeur-commun";
import { bulleAide } from "../etablissement/volets";

/** Une compétence attendue au semestre, et ce que les évaluations en couvrent. */
export interface LigneProgression {
  readonly c: { readonly code: string; readonly libelle: string; readonly bloc: unknown };
  /** Évaluations du semestre qui la contiennent. */
  readonly inSem: readonly { readonly titre: string; readonly date: string }[];
  /** Évaluations d'autres semestres qui la contiennent. */
  readonly cover: readonly { readonly semestre: string; readonly titre: string }[];
  /** Étudiants qui ont un niveau saisi. */
  readonly done: number;
  /** Répartition des derniers niveaux, du premier au dernier. */
  readonly dist: readonly number[];
  /** EC qui la portent au semestre. */
  readonly ecn: string;
  readonly state: string;
}

/** Ce que l'interface confie à la vue « Promotion ». */
export interface ContexteProgressionPromotion {
  /** Promotions proposées, regroupées par diplôme quand il y en a plusieurs (sinon un seul groupe sans libellé). */
  readonly groupes: readonly { readonly diplome: string | null; readonly promotions: readonly { readonly id: string; readonly libelle: string }[] }[];
  readonly promotion: string;
  readonly nomPromotion: string;
  readonly semestres: readonly string[];
  readonly semestre: string;
  readonly courant: string;
  /** Enseignants proposés au filtre (vide avec « C'est moi »). */
  readonly enseignants: readonly { readonly id: string; readonly nom: string }[];
  readonly enseignantsChoisis: readonly string[];
  /** Noms des enseignants choisis, pour le résumé. */
  readonly nomsChoisis: string;
  readonly filtre: string;
  readonly lignes: readonly LigneProgression[];
  readonly moduleEleves: boolean;
  readonly etudiants: number;
  readonly evaluationsAuSemestre: number;
  readonly niveaux: readonly string[];
  couleurNiveau(rang: number, nombre: number): string;
  nomBloc(numero: string): string;
  readonly vueEtudiant: boolean;
  /** Change un filtre (« promo », « sem », « t », « f ») et redessine. */
  choisir(cle: string, valeur: string): void;
  choisirVue(vue: string): void;
}

const AIDE =
  "Pour une promotion en cours et un semestre : les compétences que le référentiel rattache à ce semestre, et ce que vos évaluations enregistrées en couvrent déjà. Une compétence est « évaluée » dès qu'une évaluation du semestre la contient, « en cours » tant que tous les étudiants n'ont pas de niveau saisi. La répartition donne le dernier niveau de chaque étudiant.";
const ETATS: Readonly<Record<string, string>> = {
  ok: "Évaluée",
  part: "En cours",
  prevue: "Prévue, pas encore évaluée",
  autre: "Vue à un autre semestre",
  todo: "À évaluer",
};

function pluriel(nombre: number, mot: string): string {
  return `${String(nombre)} ${mot}${nombre > 1 ? "s" : ""}`;
}

export function option(valeur: string, libelle: string, choisie: boolean): HTMLOptionElement {
  return balise("option", [["value", valeur], ...(choisie ? [["selected", ""] as const] : [])], libelle);
}

/** Une liste de choix de la barre des filtres. */
export function liste(choisir: (cle: string, valeur: string) => void, cle: string, libelle: string, options: readonly Node[]): HTMLElement {
  const etiquette = balise("label");
  const choix = balise("select", [["data-pgsel", cle], ["aria-label", libelle]]);
  choix.append(...options);
  choix.addEventListener("change", () => {
    choisir(cle, choix.value);
  });
  etiquette.append(balise("span", [["class", "sfl2"]], libelle), choix);
  return etiquette;
}

/** Ce que la barre des filtres de Progression montre dans les deux vues. */
export interface FiltresCommuns {
  readonly groupes: ContexteProgressionPromotion["groupes"];
  readonly promotion: string;
  readonly semestres: readonly string[];
  readonly semestre: string;
  readonly courant: string;
  choisir(cle: string, valeur: string): void;
}

/** Barre des filtres : promotion (groupée par diplôme), semestre, puis les choix propres à la vue. */
export function barreFiltres(contexte: FiltresCommuns, suite: readonly Node[]): HTMLElement {
  const choisir = (cle: string, valeur: string): void => {
    contexte.choisir(cle, valeur);
  };
  const barre = balise("div", [["class", "sfbar"]]);
  const promotions = contexte.groupes.flatMap((groupe) => {
    const options = groupe.promotions.map((promotion) => option(promotion.id, promotion.libelle, promotion.id === contexte.promotion));
    if (groupe.diplome === null) return options;
    const ensemble = balise("optgroup", [["label", groupe.diplome]]);
    ensemble.append(...options);
    return [ensemble];
  });
  barre.append(
    balise("span", [["class", "sfl"]], "Filtrer"),
    liste(choisir, "promo", "Promotion", promotions),
    liste(
      choisir,
      "sem",
      "Semestre",
      contexte.semestres.map((semestre) => option(semestre, semestre + (semestre === contexte.courant ? " (en cours)" : ""), semestre === contexte.semestre)),
    ),
    ...suite,
  );
  return barre;
}

/** Bascule « Promotion » / « Étudiant » (module Étudiants). */
export function basculeVue(vueEtudiant: boolean, choisirVue: (vue: string) => void): HTMLElement {
  const bascule = balise("div", [["class", "seg"], ["id", "pgView"]]);
  for (const [vue, libelle, active] of [
    ["promo", "Promotion", !vueEtudiant],
    ["eleve", "Étudiant", vueEtudiant],
  ] as const) {
    const bouton = balise("button", [["type", "button"], ["data-pv", vue], ["aria-pressed", String(active)]], libelle);
    bouton.addEventListener("click", () => {
      choisirVue(vue);
    });
    bascule.append(bouton);
  }
  return bascule;
}

function filtres(contexte: ContexteProgressionPromotion): HTMLElement {
  const choisir = (cle: string, valeur: string): void => {
    contexte.choisir(cle, valeur);
  };
  const suite: Node[] = [];
  if (contexte.enseignants.length > 0) {
    suite.push(
      liste(choisir, "t", "Enseignant", [
        option("", "Tous", false),
        ...contexte.enseignants.map((enseignant) => option(enseignant.id, enseignant.nom, contexte.enseignantsChoisis.includes(enseignant.id))),
      ]),
    );
  }
  suite.push(
    liste(
      choisir,
      "f",
      "Compétences",
      [
        ["tout", "Toutes"],
        ["todo", "À évaluer"],
        ["fait", "Évaluées"],
      ].map(([cle, libelle]) => option(cle ?? "", libelle ?? "", cle === contexte.filtre)),
    ),
  );
  return barreFiltres(contexte, suite);
}

function ligne(contexte: ContexteProgressionPromotion, donnees: LigneProgression): HTMLElement {
  const rangee = balise("div", [["class", `pgrow ${donnees.state}`]]);
  const competence = balise("div", [["class", "pgc"]]);
  competence.append(balise("div", [], donnees.c.libelle || donnees.c.code), balise("div", [["class", "hint"]], donnees.ecn));
  const evaluations = balise("div", [["class", "pgev"]]);
  if (donnees.inSem.length > 0) {
    for (const evaluation of donnees.inSem) {
      const element = balise("div", [], `${evaluation.titre || "Sans titre"} `);
      element.append(balise("span", [["class", "hint"]], dateCourte(evaluation.date)));
      evaluations.append(element);
    }
  } else if (donnees.cover.length > 0) {
    const autres = balise("span", [["class", "hint"]]);
    donnees.cover.forEach((evaluation, rang) => {
      if (rang > 0) autres.append(balise("br"));
      autres.append(`${evaluation.semestre} · ${evaluation.titre}`);
    });
    evaluations.append(autres);
  } else {
    evaluations.append(balise("span", [["class", "hint"]], "—"));
  }
  const repartition = balise("div", [["class", "pgst"]]);
  if (contexte.moduleEleves && donnees.inSem.length > 0 && contexte.etudiants > 0) {
    const nombre = contexte.niveaux.length;
    const barre = balise("div", [
      ["class", "pgdist"],
      ["title", contexte.niveaux.map((niveau, rang) => `${niveau} : ${String(donnees.dist[rang] ?? 0)}`).join(" · ")],
    ]);
    donnees.dist.forEach((effectif, rang) => {
      if (effectif) barre.append(balise("i", [["style", `flex:${String(effectif)};background:${contexte.couleurNiveau(rang, nombre)}`]]));
    });
    if (contexte.etudiants - donnees.done) barre.append(balise("i", [["style", `flex:${String(contexte.etudiants - donnees.done)}`], ["class", "none"]]));
    repartition.append(barre, balise("span", [["class", "hint"]], `${String(donnees.done)}/${String(contexte.etudiants)} étudiants`));
  }
  rangee.append(balise("span", [["class", `pill pst ${donnees.state}`]], ETATS[donnees.state] ?? ""), competence, evaluations, repartition);
  return rangee;
}

export function peindreProgressionPromotion(hote: HTMLElement, contexte: ContexteProgressionPromotion): void {
  const lignes = contexte.lignes;
  const evaluees = lignes.filter((donnees) => donnees.inSem.length > 0).length;
  const aEvaluer = lignes.length - evaluees;
  const affichees = lignesAffichees(lignes, contexte.filtre);
  const panneau = balise("div", [["class", "panel"]]);
  const tete = balise("div", [["class", "pick-head"]]);
  const titre = balise("h3", [], "Progression");
  titre.append(bulleAide(AIDE));
  const droite = balise("div", [["style", "margin-left:auto"]]);
  if (contexte.moduleEleves) droite.append(basculeVue(contexte.vueEtudiant, (vue) => { contexte.choisirVue(vue); }));
  tete.append(titre, droite);

  const resume = balise("div", [["class", "pgsum"]]);
  const chiffre = balise("div");
  chiffre.append(balise("b", [["class", "big"]], String(evaluees)), ` / ${String(lignes.length)} compétences du ${contexte.semestre} évaluées`);
  if (contexte.enseignantsChoisis.length > 0) chiffre.append(" ", balise("span", [["class", "hint"]], `— dans les EC de ${contexte.nomsChoisis}`));
  const barre = balise("div", [["class", "pgbar"]]);
  barre.append(balise("i", [["style", `width:${String(pourcentage(evaluees, lignes.length))}%`]]));
  const detail = balise(
    "div",
    [["class", "hint"]],
    `${contexte.nomPromotion}${contexte.moduleEleves ? ` · ${pluriel(contexte.etudiants, "étudiant")}` : ""} · ${pluriel(contexte.evaluationsAuSemestre, "évaluation")} au ${contexte.semestre}`,
  );
  if (aEvaluer > 0) detail.append(" · ", balise("b", [], `${String(aEvaluer)} à évaluer`));
  else detail.append(" · tout est couvert");
  resume.append(chiffre, barre, detail);

  panneau.append(tete, filtres(contexte), resume);
  const blocs = blocsAffiches(affichees);
  if (blocs.length === 0) panneau.append(balise("div", [["class", "empty"]], "Rien à afficher pour ce filtre."));
  for (const bloc of blocs) {
    const cadre = balise("div", [["class", "pgbloc"]]);
    cadre.append(balise("div", [["class", "pgbh"]], `${bloc} - ${contexte.nomBloc(bloc)}`));
    for (const donnees of ordreDansLeBloc(affichees.filter((candidate) => String(candidate.c.bloc) === bloc))) cadre.append(ligne(contexte, donnees));
    panneau.append(cadre);
  }
  hote.replaceChildren(panneau);
}
