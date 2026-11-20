// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations : la fenêtre des actions d'une évaluation (évaluer les
 * étudiants, exporter, dupliquer, terminer, restituer, annuler, rétablir).
 * Elle remplace un petit menu déroulant que l'on remarquait mal : les exports
 * y deviennent de vrais boutons. Les règles sont dans
 * `domaine/actions-evaluation`.
 */
import { actionsSuivi, basculerRestitution, terminerOuRouvrir, type ActionSuivi } from "../domaine/actions-evaluation";
import { balise } from "../etablissement/editeur-commun";

type Evaluation = Record<string, unknown>;

/** Ce que l'interface confie à la fenêtre des actions. */
export interface ContexteActions {
  evaluation(rang: number): Evaluation | undefined;
  readonly moduleEleves: boolean;
  suivi(evaluation: Evaluation): Record<string, unknown>;
  saisie(evaluation: Evaluation): { any: number; full: number; tot: number };
  rendusManquants(evaluation: Evaluation): number;
  evaluationsIndividuelles(evaluation: Evaluation): number;
  promotionsVisees(evaluation: Evaluation): string[];
  /** Nom court d'une promotion visée (« DNO2 »). */
  nomPromotion(nom: string): string;
  /** Promotions de l'évaluation, telles qu'affichées. */
  promotions(evaluation: Evaluation): string;
  armee(): string | null;
  armer(cle: string): void;
  desarmer(): void;
  readonly aujourdhui: string;
  annoncer(texte: string): void;
  evaluer(rang: number): void;
  exporter(rang: number, format: string, mode: string): void;
  dupliquer(rang: number): void;
  /** Reporte annulation et résultats vidés sur l'évaluation en cours, si c'est elle. */
  synchroniser(evaluation: Evaluation, resultatsVides: boolean): void;
  /** Enregistre la liste, puis redessine. */
  enregistrer(evaluation: Evaluation): void;
}

interface FenetreOuverte {
  element: HTMLElement;
  rang: number;
  precedent: Element | null;
  clavier: (evenement: KeyboardEvent) => void;
  id: unknown;
  remplir: (contexte: ContexteActions) => void;
}

let ouverte: FenetreOuverte | null = null;
let retour: number | null = null;

const FORMATS = [
  ["docx", "Word"],
  ["xlsx", "Excel"],
  ["odt", "OpenDocument texte"],
  ["ods", "OpenDocument tableur"],
] as const;

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

/**
 * Referme la fenêtre. `rendreFocus` est faux quand l'action quitte la liste
 * (saisie, duplication) ; sinon le focus revient au bouton de la ligne, et
 * encore après le prochain dessin de la liste, qui remplace ce bouton.
 */
export function fermerActions(rendreFocus = true): void {
  if (ouverte === null) return;
  const { element, rang, precedent, clavier } = ouverte;
  ouverte = null;
  document.removeEventListener("keydown", clavier);
  element.remove();
  if (!rendreFocus) return;
  retour = rang;
  const bouton = document.querySelector(`#savedList [data-xm="${String(rang)}"]`) ?? precedent;
  if (bouton instanceof HTMLElement && bouton.isConnected) bouton.focus();
}

function bouton(attributs: readonly (readonly [string, string])[], ...contenu: (Node | string)[]): HTMLButtonElement {
  const element = balise("button", [["type", "button"], ...attributs]);
  element.append(...contenu);
  return element;
}

function indice(texteIndice: string): HTMLElement {
  return balise("span", [["class", "hint"]], texteIndice);
}

function boutonAction(contexte: ContexteActions, rang: number, action: ActionSuivi): Node {
  const rangTexte = String(rang);
  switch (action.sorte) {
    case "retab":
      return bouton([["data-act", "retab"], ["data-xi", rangTexte]], "Rétablir l'évaluation");
    case "delres":
      return bouton(
        [["class", "danger"], ["data-act", "delres"], ["data-xi", rangTexte]],
        `${action.armee ? "Confirmer : supprimer définitivement" : "Supprimer les évaluations individuelles"} `,
        indice(String(action.individuelles)),
      );
    case "aucune-individuelle":
      return balise("span", [["class", "xh"], ["style", "text-transform:none;letter-spacing:0"]], "Aucune évaluation individuelle : l'évaluation peut être supprimée.");
    case "sep":
      return balise("span", [["class", "xsep"]]);
    case "fin":
      return bouton([["data-act", "fin"], ["data-xi", rangTexte]], action.libelle);
    case "fin-bloquee":
      return bouton(
        [
          ["disabled", ""],
          ["title", `${String(action.manquants)} étudiant·e${action.manquants > 1 ? "s" : ""} sans statut de rendu : à renseigner dans l'évaluation`],
          ["style", "opacity:.5;cursor:not-allowed"],
        ],
        "Terminer l'évaluation ",
        indice(`${String(action.manquants)} sans rendu`),
      );
    case "fin-saisie":
      return bouton([["data-act", "fin"], ["data-xi", rangTexte]], "Terminer l'évaluation ", indice(`${String(action.full)}/${String(action.tot)}`));
    case "rest":
      return bouton(
        [["data-act", "rest"], ["data-rp", action.promotion], ["data-xi", rangTexte]],
        action.restituee ? "Annuler la restitution" : "Marquer restituée",
        ...(action.plusieurs ? [" ", indice(contexte.nomPromotion(action.promotion))] : []),
      );
    case "annul":
      return bouton([["class", "danger"], ["data-act", "annul"], ["data-xi", rangTexte]], "Annuler l'évaluation ", indice("rien n'est supprimé · peut être rétablie"));
  }
}

function section(titre: string, ...contenu: Node[]): HTMLElement {
  const cadre = balise("section", [["class", "xasec"]]);
  cadre.append(balise("h3", [], titre), ...contenu);
  return cadre;
}

function formats(rang: number, mode: string): HTMLElement {
  const cadre = balise("div", [["class", "xfmt"]]);
  for (const [cle, libelle] of FORMATS) {
    cadre.append(bouton([["data-xk", cle], ["data-xmode", mode], ["data-xi", String(rang)]], balise("b", [], libelle), indice(`.${cle}`)));
  }
  return cadre;
}

/** Contenu de la fenêtre, et ses boutons reliés. */
function contenu(contexte: ContexteActions, evaluation: Evaluation, rang: number): Node[] {
  const suivi = contexte.suivi(evaluation);
  const actions = actionsSuivi(
    { ...evaluation, suivi },
    {
      moduleEleves: contexte.moduleEleves,
      saisie: contexte.moduleEleves ? contexte.saisie(evaluation) : { any: 0, full: 0, tot: 0 },
      rendusManquants: contexte.rendusManquants(evaluation),
      individuelles: contexte.evaluationsIndividuelles(evaluation),
      armee: contexte.armee() === `r:${texte(evaluation.id)}`,
      promotions: contexte.promotionsVisees(evaluation),
    },
  ).map((action) => boutonAction(contexte, rang, action));
  const liste = balise("div", [["class", "xalist"]]);
  if (evaluation.annulee) {
    liste.append(...actions);
    return [section("Autres actions", liste)];
  }
  liste.append(bouton([["data-dup", String(rang)]], "Dupliquer"), ...actions);
  const sections: Node[] = [];
  if (contexte.moduleEleves) sections.push(section("Évaluer", bouton([["class", "btn primary xabig"], ["data-sai", String(rang)]], "Évaluer les étudiant·es")));
  sections.push(
    section(
      "Exporter",
      ...(contexte.moduleEleves
        ? [
            balise("p", [["class", "xh"]], "L'évaluation · grille vierge"),
            formats(rang, "eval"),
            balise("p", [["class", "xh"]], "Les restitutions · résultats par étudiant·e"),
            formats(rang, "rest"),
          ]
        : [balise("p", [["class", "xh"]], "Grille à remplir à la main"), formats(rang, "eval")]),
    ),
    section("Autres actions", liste),
  );
  return sections;
}

function relier(corps: HTMLElement, contexte: ContexteActions): void {
  for (const element of corps.querySelectorAll<HTMLElement>("[data-sai]")) {
    element.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      fermerActions(false);
      contexte.evaluer(Number(element.dataset.sai));
    });
  }
  for (const element of corps.querySelectorAll<HTMLElement>("[data-xk]")) {
    element.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      fermerActions();
      contexte.exporter(Number(element.dataset.xi), element.dataset.xk ?? "", element.dataset.xmode ?? "");
    });
  }
  for (const element of corps.querySelectorAll<HTMLElement>("[data-dup]")) {
    element.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      fermerActions(false);
      contexte.dupliquer(Number(element.dataset.dup));
    });
  }
  for (const element of corps.querySelectorAll<HTMLElement>("[data-act]")) {
    element.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      fermerActions();
      const rang = Number(element.dataset.xi);
      const evaluation = contexte.evaluation(rang);
      if (evaluation === undefined) return;
      const suivi = contexte.suivi(evaluation);
      let resultatsVides = false;
      switch (element.dataset.act) {
        case "fin":
          if (!terminerOuRouvrir(suivi, contexte.rendusManquants(evaluation), contexte.moduleEleves ? "dnmax" : "main", contexte.aujourdhui)) {
            contexte.annoncer("Renseignez d'abord le rendu de chaque étudiant·e.");
            return;
          }
          break;
        case "rest":
          basculerRestitution(evaluation, element.dataset.rp ?? "", contexte.aujourdhui);
          break;
        case "annul":
          evaluation.annulee = contexte.aujourdhui;
          contexte.annoncer("Évaluation annulée. Elle peut être rétablie depuis le bouton « Actions… ».");
          break;
        case "retab":
          Reflect.deleteProperty(evaluation, "annulee");
          contexte.desarmer();
          break;
        case "delres": {
          const cle = `r:${texte(evaluation.id)}`;
          if (contexte.armee() !== cle) {
            contexte.annoncer("Action irréversible : cliquez à nouveau pour confirmer.");
            contexte.armer(cle);
            document.querySelector<HTMLElement>(`#savedList [data-xm="${String(rang)}"]`)?.click();
            return;
          }
          contexte.desarmer();
          const nombre = contexte.evaluationsIndividuelles(evaluation);
          evaluation.res = {};
          resultatsVides = true;
          const s = nombre > 1 ? "s" : "";
          contexte.annoncer(`${String(nombre)} évaluation${s} individuelle${s} supprimée${s}.`);
          break;
        }
      }
      contexte.synchroniser(evaluation, resultatsVides);
      contexte.enregistrer(evaluation);
    });
  }
}

/** Ouvre la fenêtre des actions de l'évaluation au rang donné. */
export function ouvrirActions(rang: number, contexte: ContexteActions): void {
  const evaluation = contexte.evaluation(rang);
  if (evaluation === undefined) return;
  const precedent = ouverte === null ? document.activeElement : ouverte.precedent;
  fermerActions(false);
  retour = null;
  const fond = balise("div", [["class", "modal xamodal"]]);
  const carte = balise("div", [["class", "card xabox"], ["role", "dialog"], ["aria-modal", "true"], ["aria-labelledby", "xaT"]]);
  const fermer = bouton([["class", "xaclose"], ["aria-label", "Fermer"], ["title", "Fermer"]], "×");
  const sous = [contexte.promotions(evaluation) || texte(evaluation.classe), texte(evaluation.semestre)].filter((morceau) => morceau !== "").join(" · ") + (evaluation.annulee ? " · annulée" : "");
  const corps = balise("div", [["class", "xabody"]]);
  carte.append(fermer, balise("h2", [["id", "xaT"]], texte(evaluation.titre) || "Sans titre"));
  if (sous !== "") carte.append(balise("p", [["class", "hint"]], sous));
  carte.append(corps);
  fond.append(carte);
  const activables = (): HTMLElement[] => [...carte.querySelectorAll<HTMLElement>("button:not([disabled])")];
  const remplir = (contexteActuel: ContexteActions): void => {
    const actuelle = contexteActuel.evaluation(rang);
    if (actuelle === undefined) return;
    corps.replaceChildren(...contenu(contexteActuel, actuelle, rang));
    relier(corps, contexteActuel);
    if (fond.isConnected && !carte.contains(document.activeElement)) (corps.querySelector<HTMLElement>("button:not([disabled])") ?? fermer).focus();
  };
  // Le clic doit commencer et finir sur le fond : une sélection relâchée hors de la boîte ne la ferme pas.
  let surFond = false;
  fond.addEventListener("mousedown", (evenement) => {
    surFond = evenement.target === fond;
  });
  fond.addEventListener("click", (evenement) => {
    evenement.stopPropagation();
    if (surFond && evenement.target === fond) fermerActions();
  });
  fermer.addEventListener("click", () => {
    fermerActions();
  });
  const clavier = (evenement: KeyboardEvent): void => {
    if (evenement.key === "Escape") {
      evenement.preventDefault();
      fermerActions();
      return;
    }
    if (evenement.key !== "Tab") return;
    const liste = activables();
    const premier = liste[0];
    const dernier = liste.at(-1);
    if (premier === undefined || dernier === undefined) return;
    if (evenement.shiftKey && (document.activeElement === premier || !carte.contains(document.activeElement))) {
      evenement.preventDefault();
      dernier.focus();
    } else if (!evenement.shiftKey && (document.activeElement === dernier || !carte.contains(document.activeElement))) {
      evenement.preventDefault();
      premier.focus();
    }
  };
  ouverte = { element: fond, rang, precedent, clavier, id: evaluation.id, remplir };
  remplir(contexte);
  document.addEventListener("keydown", clavier);
  document.body.append(fond);
  (corps.querySelector<HTMLElement>("button:not([disabled])") ?? fermer).focus();
}

/**
 * Après chaque dessin de la liste : une fenêtre ouverte se remet à jour (fin
 * du délai de confirmation), ou le focus revient au bouton de sa ligne.
 */
export function apresDessinListe(liste: HTMLElement, contexte: ContexteActions): void {
  if (ouverte !== null) {
    const actuelle = contexte.evaluation(ouverte.rang);
    if (actuelle !== undefined && actuelle.id === ouverte.id) ouverte.remplir(contexte);
    else fermerActions(false);
    return;
  }
  if (retour !== null) {
    const boutonLigne = liste.querySelector<HTMLElement>(`[data-xm="${String(retour)}"]`);
    retour = null;
    if (boutonLigne !== null && (document.activeElement === null || document.activeElement === document.body)) boutonLigne.focus();
  }
}
