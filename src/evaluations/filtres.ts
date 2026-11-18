// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations : la barre des filtres (promotions, semestres, suivi,
 * intitulé). Les règles sont dans `domaine/filtres-evaluations`.
 */
import { SEMESTRES } from "../domaine/constituer";
import { filtresActifs, normaliserFiltres, resumeFiltre, type Filtres } from "../domaine/filtres-evaluations";
import { balise } from "../etablissement/editeur-commun";

/** Une promotion proposée dans le filtre. */
export interface PromotionFiltre {
  readonly id: string;
  readonly nom: string;
  /** Nom court en cours (DNO2), ou chaîne vide. */
  readonly court: string;
  readonly enCours: boolean;
}

/** Ce que l'interface confie à la barre des filtres. */
export interface ContexteFiltres {
  /** Réglages des filtres, tenus par l'interface et modifiés sur place. */
  filtres(): Record<string, unknown>;
  /** Revient aux réglages par défaut. */
  reinitialiser(): void;
  /** Promotions visibles, rangées. */
  readonly promotions: readonly PromotionFiltre[];
  /** Promotions hors de la répartition de service, proposées à part, masquées tant qu'on ne les demande pas. */
  readonly autres?: readonly PromotionFiltre[];
  /** Les promotions hors répartition sont-elles affichées ? */
  autresAffichees?(): boolean;
  basculerAutres?(): void;
  /** Toutes les promotions connues, visibles ou non. */
  existe(id: string): boolean;
  nomPromotion(id: string): string;
  readonly statuts: Readonly<Record<string, string>>;
  /** Menu ouvert d'un dessin à l'autre, ou chaîne vide. */
  ouvert(): string;
  retenirOuvert(cle: string): void;
  redessiner(): void;
}

let fermetureInstallee = false;

function caseACocher(filtres: Filtres, cle: "per" | "sem" | "st", valeur: string, libelle: string, suite: Node[] = []): HTMLElement {
  const etiquette = balise("label", [["class", "sfo"]]);
  etiquette.append(
    balise("input", [["type", "checkbox"], ["data-sfk", cle], ["value", valeur], ...(filtres[cle].includes(valeur) ? [["checked", ""] as const] : [])]),
    " ",
    balise("span", [], libelle),
    ...suite,
  );
  return etiquette;
}

export function peindreFiltres(hote: HTMLElement, contexte: ContexteFiltres): void {
  const actif = document.activeElement;
  const rechercheActive = actif instanceof HTMLInputElement && actif.id === "sfQ";
  const curseur = rechercheActive ? (actif.selectionStart ?? 0) : 0;
  const filtres = normaliserFiltres(contexte.filtres());
  filtres.per = filtres.per.filter((valeur) => valeur === "cur" || contexte.existe(valeur));
  const enCours = contexte.promotions.filter((promotion) => promotion.enCours);
  const autres = contexte.promotions.filter((promotion) => !promotion.enCours);
  const noms = { nomPromotion: (id: string) => contexte.nomPromotion(id), libelleStatut: (cle: string) => contexte.statuts[cle] ?? "" };

  const menu = (cle: "per" | "sem" | "st", libelle: string, corps: readonly Node[]): HTMLElement => {
    const cadre = balise("span", [["class", "xmenu sfm"]]);
    const bouton = balise("button", [
      ["type", "button"],
      ["class", `sfb${filtres[cle].length > 0 ? " on" : ""}`],
      ["data-sfm", cle],
      ["aria-haspopup", "true"],
      ["aria-expanded", "false"],
      ["aria-label", libelle],
    ]);
    bouton.append(balise("span", [["class", "sfl2"]], libelle), ` ${resumeFiltre(cle, filtres[cle], noms)} ▾`);
    const fenetre = balise("span", [["class", "xpop sfpop"], ["hidden", ""], ["data-sfp", cle]]);
    const toutAfficher = balise("button", [["type", "button"], ["data-sfclr", cle]], "Tout afficher");
    const pied = balise("span", [["class", "sfpa"]]);
    pied.append(toutAfficher);
    fenetre.append(...corps, balise("span", [["class", "xsep"]]), pied);
    cadre.append(bouton, fenetre);
    bouton.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      const etaitOuvert = !fenetre.hidden;
      for (const autre of document.querySelectorAll<HTMLElement>(".xpop")) {
        if (!autre.hidden) {
          autre.hidden = true;
          autre.previousElementSibling?.setAttribute("aria-expanded", "false");
        }
      }
      contexte.retenirOuvert(etaitOuvert ? "" : cle);
      if (!etaitOuvert) ouvrir(cle);
    });
    fenetre.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
    });
    toutAfficher.addEventListener("click", () => {
      filtres[cle] = [];
      contexte.retenirOuvert(cle);
      contexte.redessiner();
    });
    for (const coche of fenetre.querySelectorAll<HTMLInputElement>("[data-sfk]")) {
      coche.addEventListener("change", () => {
        filtres[cle] = coche.checked ? [...new Set([...filtres[cle], coche.value])] : filtres[cle].filter((valeur) => valeur !== coche.value);
        contexte.retenirOuvert(cle);
        contexte.redessiner();
      });
    }
    return cadre;
  };
  const ouvrir = (cle: string): void => {
    const bouton = hote.querySelector(`[data-sfm="${cle}"]`);
    if (bouton === null) return;
    (bouton.nextElementSibling as HTMLElement).hidden = false;
    bouton.setAttribute("aria-expanded", "true");
  };

  const promotions: Node[] = [
    caseACocher(filtres, "per", "cur", "Promotions en cours", [document.createTextNode(" "), balise("span", [["class", "hint"]], String(enCours.length))]),
  ];
  if (enCours.length > 0) {
    promotions.push(
      balise("span", [["class", "xh"]], "En cours"),
      ...enCours.map((promotion) => caseACocher(filtres, "per", promotion.id, (promotion.court === "" ? "" : `${promotion.court} — `) + promotion.nom)),
    );
  }
  if (autres.length > 0) {
    promotions.push(balise("span", [["class", "xh"]], "Terminées ou à venir"), ...autres.map((promotion) => caseACocher(filtres, "per", promotion.id, promotion.nom)));
  }
  // Promotions hors de ma répartition de service : accessibles, mais masquées par défaut (sauf celles déjà choisies).
  const horsRepartition = contexte.autres ?? [];
  if (horsRepartition.length > 0) {
    const affichees = contexte.autresAffichees?.() ?? false;
    const montrees = affichees ? horsRepartition : horsRepartition.filter((promotion) => filtres.per.includes(promotion.id));
    const bascule = balise(
      "button",
      [
        ["type", "button"],
        ["class", "sfautres"],
        ["data-sfautres", ""],
        ["aria-expanded", String(affichees)],
      ],
      affichees ? "− Masquer les autres promotions" : `+ Autres promotions (${String(horsRepartition.length - montrees.length)})`,
    );
    bascule.addEventListener("click", () => {
      contexte.basculerAutres?.();
      contexte.retenirOuvert("per");
      contexte.redessiner();
    });
    promotions.push(balise("span", [["class", "xh"]], "Hors de votre répartition de service"), bascule);
    promotions.push(
      ...montrees.map((promotion) => {
        const ligne = caseACocher(filtres, "per", promotion.id, (promotion.court === "" ? "" : `${promotion.court} — `) + promotion.nom);
        ligne.classList.add("discrete");
        return ligne;
      }),
    );
  }
  const recherche = balise("input", [
    ["type", "search"],
    ["id", "sfQ"],
    ["placeholder", "Rechercher un intitulé"],
    ["value", filtres.q],
    ["aria-label", "Rechercher un intitulé"],
  ]);
  recherche.addEventListener("input", () => {
    filtres.q = recherche.value;
    contexte.retenirOuvert("");
    contexte.redessiner();
  });
  hote.hidden = false;
  const noeuds: Node[] = [
    balise("span", [["class", "sfl"]], "Filtrer"),
    menu("per", "Promotions", promotions),
    menu(
      "sem",
      "Semestres",
      SEMESTRES.map((semestre) => caseACocher(filtres, "sem", semestre, semestre)),
    ),
    menu(
      "st",
      "Suivi",
      Object.keys(contexte.statuts).map((cle) => caseACocher(filtres, "st", cle, contexte.statuts[cle] ?? "")),
    ),
    recherche,
  ];
  if (filtresActifs(filtres)) {
    const reinitialiser = balise("button", [["type", "button"], ["class", "btn ghost"], ["id", "sfReset"]], "Filtres par défaut");
    reinitialiser.addEventListener("click", () => {
      contexte.reinitialiser();
      contexte.retenirOuvert("");
      contexte.redessiner();
    });
    noeuds.push(reinitialiser);
  }
  hote.replaceChildren(...noeuds);
  if (contexte.ouvert() !== "") ouvrir(contexte.ouvert());
  if (!fermetureInstallee) {
    fermetureInstallee = true;
    document.addEventListener("click", () => {
      contexte.retenirOuvert("");
    });
  }
  if (rechercheActive) {
    const champ = document.getElementById("sfQ");
    if (champ instanceof HTMLInputElement) {
      champ.focus();
      try {
        champ.setSelectionRange(curseur, curseur);
      } catch {
        // Certains navigateurs refusent la sélection dans un champ de recherche : le curseur reste où il est.
      }
    }
  }
}
