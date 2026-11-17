// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 2 de l'éditeur d'évaluation : choisir les compétences évaluées,
 * parmi celles du semestre, avec la progression de la promotion sur chacune.
 * Les calculs sont dans `domaine/progression-competences`.
 */
import { passeLeFiltre, type EvaluationLue, type ProgressionCompetence } from "../domaine/progression-competences";
import { creer, creerBouton } from "../ecran-echange";

/** Une compétence du semestre, telle que l'étape la propose. */
export interface CompetenceProposee {
  readonly code: string;
  readonly libelle: string;
  readonly bloc: string;
  readonly nomBloc: string;
  /** Portée par un des enseignements choisis à l'étape 1. */
  readonly dansLeCadre: boolean;
}

/** Une autre évaluation de la promotion, telle que l'étape la cite. */
export interface EvaluationCitee extends EvaluationLue {
  readonly titre?: unknown;
  readonly date?: unknown;
}

export type FiltreProgression = "tout" | "todo" | "fait";

/** Ce que l'éditeur confie à l'étape 2. */
export interface ContexteCompetences {
  /** L'évaluation en cours ; sa liste `items` est remplacée à chaque compétence cochée ou décochée. */
  readonly evaluation: Record<string, unknown>;
  readonly semestre: string;
  readonly competences: readonly CompetenceProposee[];
  /** Enseignements et unités choisis à l'étape 1 ; `null` si aucun : toutes les compétences du semestre sont proposées. */
  readonly cadre: { readonly enseignements: number; readonly unites: number } | null;
  /** Vrai si l'enseignant a demandé à voir tout le semestre malgré le cadre. */
  toutVoir(): boolean;
  basculerToutVoir(): void;
  /** Texte de la recherche, déjà normalisé (sans accents ni majuscules). */
  recherche(): string;
  normaliser(texte: string): string;
  /** Progression de la promotion par code, ou `null` sans promotion. */
  readonly progression: Readonly<Record<string, ProgressionCompetence<EvaluationCitee>>> | null;
  /** Nom de la ou des promotions, pour l'en-tête de la progression. */
  readonly nomPromotions: string;
  /** Statut d'une autre évaluation, en minuscules (« distribuée »…). */
  statutDe(evaluation: EvaluationCitee): string;
  filtre(): FiltreProgression;
  retenirFiltre(filtre: FiltreProgression): void;
  /** EC rattachés à une compétence nouvellement cochée. */
  ecsDe(code: string): string[];
  /** Numéro du regroupement de la compétence, et sa formulation. */
  regroupementDe(op: string): { numero: number; libelle: string };
  readonly teinteBloc: string;
  enregistrer(): void;
  apresChangement(): void;
}

interface CompetenceRetenueLue {
  readonly code: string;
  readonly op: string;
}

function retenues(evaluation: Record<string, unknown>): CompetenceRetenueLue[] {
  if (!Array.isArray(evaluation.items)) return [];
  return evaluation.items.map((item: unknown) => {
    const lu = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return { code: typeof lu.code === "string" ? lu.code : "", op: typeof lu.op === "string" ? lu.op : "" };
  });
}

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

function pluriel(nombre: number, singulier: string, pluriels: string): string {
  return nombre > 1 ? pluriels : singulier;
}

function libelleProgression(progression: ProgressionCompetence<EvaluationCitee>, statutDe: (evaluation: EvaluationCitee) => string): string {
  switch (progression.etat) {
    case "todo":
      return "À évaluer";
    case "prevue": {
      const premiere = progression.auSemestre[0];
      return `Prévue · ${premiere === undefined ? "" : statutDe(premiere)}`;
    }
    case "autre":
      return `Vue au ${[...new Set(progression.partout.map((evaluation) => texte(evaluation.semestre)))].join(", ")}`;
    case "part":
      return `En cours · ${String(progression.faits)}/${String(progression.total)}`;
    case "ok":
      return "Évaluée";
  }
}

/** Phrase au-dessus de la liste : ce qui est proposé, et le lien pour élargir ou resserrer. */
function peindrePortee(contexte: ContexteCompetences, proposees: number, dansLeCadre: number): void {
  const portee = document.getElementById("pickScope");
  if (portee === null) return;
  const total = contexte.competences.length;
  const basculer = (libelle: string): HTMLButtonElement => {
    const bouton = creerBouton(libelle, "lnk", () => {
      contexte.basculerToutVoir();
      peindreCompetences(contexte);
    });
    bouton.id = "pickAll";
    return bouton;
  };
  const { cadre } = contexte;
  if (cadre === null) {
    portee.replaceChildren(
      `Les ${String(total)} compétences du ${contexte.semestre} — choisissez des unités ou des enseignements à l'étape 1 pour n'en voir que la part concernée.`,
    );
    return;
  }
  if (contexte.toutVoir()) {
    portee.replaceChildren(`Les ${String(total)} compétences du semestre · `, basculer(`revenir aux ${String(dansLeCadre)} de la sélection`));
    return;
  }
  const unites =
    cadre.unites > 0 ? ` (${String(cadre.unites)}${pluriel(cadre.unites, " unité d'enseignement)", " unités d'enseignement)")}` : "";
  portee.replaceChildren(
    `${String(proposees)} ${pluriel(proposees, "compétence portée", "compétences portées")} par ${
      cadre.enseignements > 1 ? `les ${String(cadre.enseignements)} enseignements choisis` : "l'enseignement choisi"
    } à l'étape 1${unites} · `,
    basculer(`voir les ${String(total)} du semestre`),
  );
}

/** Affiche l'étape 2 : la liste des compétences par bloc, avec la progression de la promotion. */
export function peindreCompetences(contexte: ContexteCompetences): void {
  const choisies = retenues(contexte.evaluation);
  const estRetenue = (code: string): boolean => choisies.some((competence) => competence.code === code);
  const dansLeCadre = contexte.competences.filter((competence) => competence.dansLeCadre || estRetenue(competence.code));
  const proposees = contexte.cadre !== null && !contexte.toutVoir() ? dansLeCadre : contexte.competences;
  peindrePortee(contexte, proposees.length, dansLeCadre.length);

  const { progression } = contexte;
  const filtre = progression === null ? "tout" : contexte.filtre();
  const recherche = contexte.recherche();
  const gardees = proposees
    .filter(
      (competence) =>
        recherche === "" || contexte.normaliser(`${competence.code} ${competence.libelle} ${competence.nomBloc}`).includes(recherche),
    )
    .filter((competence) => progression === null || passeLeFiltre(progression[competence.code], filtre));

  const hote = document.getElementById("pick");
  if (hote !== null) {
    const contenu: HTMLElement[] = [];
    if (progression !== null) contenu.push(barreProgression(contexte, proposees, filtre));
    if (gardees.length === 0) {
      contenu.push(creer("div", "empty", "Aucune compétence ne correspond à ce filtre."));
    } else {
      const parBloc = new Map<string, CompetenceProposee[]>();
      for (const competence of gardees) parBloc.set(competence.bloc, [...(parBloc.get(competence.bloc) ?? []), competence]);
      for (const [bloc, liste] of [...parBloc.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
        contenu.push(peindreBloc(contexte, bloc, liste, choisies));
      }
    }
    hote.replaceChildren(...contenu);
  }
  const compte = document.getElementById("cCount");
  if (compte !== null) compte.textContent = `${String(choisies.length)} / ${String(proposees.length)}`;
  contexte.apresChangement();
}

function barreProgression(contexte: ContexteCompetences, proposees: readonly CompetenceProposee[], filtre: FiltreProgression): HTMLElement {
  const progression = contexte.progression ?? {};
  const aEvaluer = proposees.filter((competence) => progression[competence.code]?.auSemestre.length === 0).length;
  const barre = creer("div", "pkbar");
  const resume = creer("span", "hint");
  resume.append(
    `Progression de ${contexte.nomPromotions} au ${contexte.semestre} : `,
    creer("b", "", String(proposees.length - aEvaluer)),
    ` / ${String(proposees.length)} déjà évaluées ailleurs, `,
    creer("b", "", String(aEvaluer)),
    " à évaluer.",
  );
  const choix = creer("span", "dkinds");
  choix.style.margin = "0";
  const options: readonly (readonly [FiltreProgression, string])[] = [
    ["tout", "Toutes"],
    ["todo", "À évaluer"],
    ["fait", "Déjà évaluées"],
  ];
  for (const [valeur, libelle] of options) {
    const bouton = creerBouton(libelle, "", () => {
      contexte.retenirFiltre(valeur);
      peindreCompetences(contexte);
    });
    bouton.dataset.pkf = valeur;
    bouton.setAttribute("aria-pressed", String(valeur === filtre));
    choix.append(bouton);
  }
  barre.append(resume, choix);
  return barre;
}

function peindreBloc(
  contexte: ContexteCompetences,
  bloc: string,
  liste: readonly CompetenceProposee[],
  choisies: readonly CompetenceRetenueLue[],
): HTMLElement {
  const element = creer("div", "bloc");
  const entete = creer("div", Number(bloc) % 2 === 1 ? "bh tint" : "bh");
  entete.style.setProperty("--bloc", contexte.teinteBloc);
  entete.append(creer("span", "n", `BLOC ${bloc}`), creer("span", "t", liste[0]?.nomBloc ?? ""));
  element.append(entete);
  for (const competence of liste) {
    const retenue = choisies.find((candidate) => candidate.code === competence.code);
    const ligne = creer("div", retenue === undefined ? "cp" : "cp on");
    const caseACocher = creer("input", "cbox");
    caseACocher.type = "checkbox";
    caseACocher.checked = retenue !== undefined;
    caseACocher.dataset.code = competence.code;
    caseACocher.setAttribute("aria-label", `Évaluer ${competence.code}`);
    caseACocher.addEventListener("change", () => {
      const items = Array.isArray(contexte.evaluation.items) ? (contexte.evaluation.items as unknown[]) : [];
      contexte.evaluation.items = caseACocher.checked
        ? [...items, { code: competence.code, ecs: contexte.ecsDe(competence.code), op: "", libelle: "", livrables: [] }]
        : items.filter((item) => (item as { code?: unknown }).code !== competence.code);
      contexte.enregistrer();
      peindreCompetences(contexte);
    });
    const corps = creer("div");
    const titre = creer("div");
    titre.append(creer("span", "code", competence.code), " ", creer("span", "lib", competence.libelle));
    corps.append(titre);
    const progression = contexte.progression?.[competence.code];
    if (progression !== undefined) {
      const ligneProgression = creer("div", "pkline");
      ligneProgression.append(creer("span", `pill pst ${progression.etat}`, libelleProgression(progression, (evaluation) => contexte.statutDe(evaluation))));
      const details = progression.auSemestre
        .map((evaluation) => {
          const date = texte(evaluation.date);
          return `${texte(evaluation.titre) || "Sans titre"}${date === "" ? "" : ` (${date})`}`;
        })
        .join(" · ");
      if (details !== "") ligneProgression.append(" ", creer("span", "hint", details));
      corps.append(ligneProgression);
    }
    if (retenue !== undefined && retenue.op !== "") {
      const { numero, libelle } = contexte.regroupementDe(retenue.op);
      corps.append(creer("div", "optag", `OP ${String(numero)}${libelle === "" ? "" : ` · ${libelle}`}`));
    }
    ligne.append(caseACocher, corps);
    element.append(ligne);
  }
  return element;
}
