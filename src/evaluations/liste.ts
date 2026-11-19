// SPDX-License-Identifier: CECILL-2.1
/**
 * Mes évaluations : la liste des évaluations enregistrées, leur colonne de
 * suivi (frise de cinq étapes, ou suivi simplifié) et la petite fenêtre de
 * chaque étape. Les règles sont dans `domaine/frise-suivi`,
 * `domaine/suivi-evaluation` et `domaine/suivi-simplifie`. La fenêtre des
 * actions est ouverte par `interface/evaluations`.
 */
import { derniereDate, etatEtape, infobulleSuivi, pointsFrise, prochaineEtape } from "../domaine/frise-suivi";
import { ETAPES_FRISE, LIBELLES_STATUT } from "../domaine/suivi-evaluation";
import { actionSimplifiee, LIBELLES_SIMPLIFIES, statutSimplifie } from "../domaine/suivi-simplifie";
import { balise } from "../etablissement/editeur-commun";
import { bulleAide } from "../etablissement/volets";

type Evaluation = Record<string, unknown>;

/** Ce que l'interface confie à la liste. */
export interface ContexteListe {
  /** Les évaluations enregistrées, modifiées sur place. */
  evaluations(): Evaluation[];
  /** L'évaluation répond-elle aux filtres ? */
  visible(evaluation: Evaluation): boolean;
  readonly moduleEleves: boolean;
  readonly suiviSimplifie: boolean;
  /** Promotions de l'évaluation, telles qu'affichées (« DNO2, DNE2 »). */
  promotions(evaluation: Evaluation): string;
  statut(evaluation: Evaluation): string;
  /** Le suivi de l'évaluation, complété de sa date de saisie. */
  suivi(evaluation: Evaluation): Record<string, unknown>;
  /** Avancement de la saisie dans DNMAX (module Étudiants). */
  saisie(evaluation: Evaluation): { any: number; full: number; tot: number };
  /** Restitutions aux étudiants (module Étudiants). */
  restitutions(evaluation: Evaluation): { n: number; tot: number };
  /** Dates de restitution aux étudiants (module Étudiants). */
  datesRestitutionEtudiants(evaluation: Evaluation): unknown[];
  /** Étudiants sans « Rendu », « Non rendu » ni « Dispensé·e ». */
  rendusManquants(evaluation: Evaluation): number;
  /** Étudiants qui ont une évaluation individuelle enregistrée. */
  evaluationsIndividuelles(evaluation: Evaluation): number;
  /** Bouton de suppression armé (« f:id », « b:id »), ou `null`. */
  readonly armee: string | null;
  /** Étape dont la fenêtre est ouverte (« rang:étape »), ou `null`. */
  etapeOuverte(): string | null;
  retenirEtape(cle: string | null): void;
  readonly aujourdhui: string;
  /** Enregistre la liste (et l'évaluation en cours si c'est elle), puis redessine. */
  enregistrer(evaluation: Evaluation): void;
  /** Reporte une date prévue sur l'évaluation en cours, si c'est elle. */
  synchroniserPrevu(evaluation: Evaluation, cle: string): void;
  ouvrir(rang: number): void;
  ouvrirActions(rang: number): void;
  supprimer(rang: number): void;
  supprimerBrouillon(rang: number): void;
  filtresParDefaut(): void;
  toutAfficher(): void;
  nouvelleEvaluation(): void;
  chargerExemple(): void;
  /** Après le dessin : la fenêtre des actions ouverte se remet à jour, ou le focus revient à son bouton. */
  apresDessin(): void;
}

const AIDE_SUIVI =
  "Chaque évaluation avance sur 5 étapes : <b>Préparée → Distribuée → Rendue → Évaluée → Restituée</b>. Point plein = étape franchie, point à moitié plein = étape commencée. Distribuée et Rendue avancent seules avec les dates prévues ; les suivantes avec vos actions (saisie ou export de la grille, « Terminer l'évaluation », « Marquer restituée »). La ligne grise indique la prochaine chose à faire.";

let fermeturesInstallees = false;

function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" && valeur !== 0 ? String(valeur) : "";
}

/** « 07/11/2026 », ou « — ». */
function dateLongue(date: unknown): string {
  return typeof date === "string" && date !== "" ? date.split("-").reverse().join("/") : "—";
}

function champDate(attribut: string, cle: string, valeur: unknown, libelle: string): HTMLElement {
  const etiquette = balise("label", [["class", "sted"]]);
  etiquette.append(balise("span", [], libelle), balise("input", [["type", "date"], [attribut, cle], ["value", texte(valeur)]]));
  return etiquette;
}

function boutonAujourdhui(cle: string, libelle: string): HTMLElement {
  return balise("button", [["type", "button"], ["class", "btn primary"], ["data-stset", cle]], libelle);
}

/** Contenu de la petite fenêtre d'une étape de la frise. */
function fenetreEtape(contexte: ContexteListe, evaluation: Evaluation, etape: number): Node[] {
  const suivi = contexte.suivi(evaluation);
  const statut = contexte.statut(evaluation);
  const corps = balise("div", [["class", "stbody"]]);
  let action: HTMLElement | null = null;
  if (etape === 0) {
    const ligne = balise("p", [["class", "stro"]], "Saisie le ");
    ligne.append(balise("b", [], dateLongue(suivi.saisie)), balise("br"), balise("span", [["class", "hint"]], "Date enregistrée automatiquement à la création."));
    corps.append(ligne);
  }
  if (etape === 1) {
    corps.append(champDate("data-svp", "distribPrev", evaluation.distribPrev, "Prévue le"), champDate("data-sv", "distrib", suivi.distrib, "Faite le"));
    if (!suivi.distrib) action = boutonAujourdhui("distrib", "Distribuée aujourd'hui");
  }
  if (etape === 2) {
    corps.append(
      champDate("data-svp", "renduPrev", texte(evaluation.renduPrev) || suivi.butoir, "Prévu le"),
      champDate("data-sv", "rendu", suivi.rendu, "Rendu le"),
    );
    if (!suivi.rendu) action = boutonAujourdhui("rendu", "Rendue aujourd'hui");
  }
  if (etape === 3) {
    const manquants = contexte.rendusManquants(evaluation);
    corps.append(champDate("data-sv", "evalDebut", suivi.evalDebut, "Commencée le"));
    if (manquants > 0 && !suivi.evalue) {
      const fermee = balise("label", [["class", "sted"]]);
      fermee.append(balise("span", [], "Terminée le"), balise("input", [["type", "date"], ["disabled", ""]]));
      corps.append(
        fermee,
        balise(
          "span",
          [["class", "hint"], ["style", "flex-basis:100%;color:var(--signal)"]],
          `${String(manquants)} étudiant·e${manquants > 1 ? "s" : ""} sans « Rendu », « Non rendu » ou « Dispensé·e » : à renseigner dans l'évaluation avant de la terminer.`,
        ),
      );
    } else {
      corps.append(champDate("data-sv", "evalue", suivi.evalue, "Terminée le"));
    }
    const saisie = contexte.moduleEleves ? contexte.saisie(evaluation) : null;
    if (saisie?.any) {
      corps.append(balise("span", [["class", "hint"], ["style", "flex-basis:100%"]], `Saisie dans DNMAX : ${String(saisie.full)}/${String(saisie.tot)} étudiant·es`));
    } else if (!contexte.moduleEleves && suivi.exporte) {
      corps.append(balise("span", [["class", "hint"], ["style", "flex-basis:100%"]], `Grille exportée le ${dateLongue(suivi.exporte)}`));
    }
    if (!suivi.evalue && manquants === 0) action = boutonAujourdhui("evalue", "Terminée aujourd'hui");
  }
  if (etape === 4) {
    corps.append(champDate("data-sv", "restitue", suivi.restitue, "Restituée le"));
    if (!suivi.restitue) action = boutonAujourdhui("restitue", "Restituée aujourd'hui");
  }
  const tete = balise("div", [["class", "sth"]]);
  tete.append(balise("b", [], ETAPES_FRISE[etape] ?? ""), balise("span", [["class", "hint"]], etatEtape(etape, statut)));
  const noeuds: Node[] = [tete, corps];
  if (action !== null) {
    const pied = balise("div", [["class", "stact"]]);
    pied.append(action);
    noeuds.push(pied);
  }
  return noeuds;
}

/** Colonne de suivi d'une évaluation. */
function celluleSuivi(contexte: ContexteListe, evaluation: Evaluation, rang: number): Node[] {
  // Un brouillon n'a pas de suivi : il ne se distribue ni ne s'évalue avant d'être enregistré.
  if (evaluation.brouillon) {
    return [balise("div", [["class", "stl"]], "Brouillon"), balise("div", [["class", "stn"]], "→ à terminer : ouvrez-la, puis « Enregistrer l'évaluation »")];
  }
  const statut = contexte.statut(evaluation);
  if (contexte.suiviSimplifie) {
    const simplifie = statutSimplifie(statut);
    const action = actionSimplifiee(statut);
    const cadre = balise("div", [["class", `stw st-${simplifie}`]]);
    const ligne = balise("div", [["class", "stn"]]);
    if (action !== null) {
      const bouton = balise("button", [["type", "button"], ["class", "lnk"], ["data-ssimple", String(rang)]], action === "marquer-faite" ? "Marquer faite" : "Remettre à faire");
      bouton.addEventListener("click", (evenement) => {
        evenement.stopPropagation();
        const suivi = contexte.suivi(evaluation);
        if (action === "marquer-faite") suivi.distrib = contexte.aujourdhui;
        else Reflect.deleteProperty(suivi, "distrib");
        contexte.enregistrer(evaluation);
      });
      ligne.append(bouton);
    }
    cadre.append(balise("div", [["class", "stl"]], LIBELLES_SIMPLIFIES[simplifie]), ligne);
    return [cadre];
  }
  const suivi = contexte.suivi(evaluation);
  const distribution = texte(evaluation.distribPrev) || texte(suivi.distrib);
  const rendu = texte(evaluation.renduPrev) || texte(suivi.butoir) || texte(suivi.rendu);
  const restitutions = contexte.moduleEleves ? contexte.restitutions(evaluation) : { n: 0, tot: 0 };
  const restit: unknown[] = typeof evaluation.restit === "object" && evaluation.restit !== null ? Object.values(evaluation.restit as Record<string, unknown>) : [];
  const derniere = derniereDate([suivi.restitue, ...restit, ...(contexte.moduleEleves ? contexte.datesRestitutionEtudiants(evaluation) : [])]);
  const enCours = statut === "annulee";
  const frise = balise("span", [["class", "stp"]]);
  pointsFrise(statut).forEach((point, etape) => {
    const libelle = ETAPES_FRISE[etape] ?? "";
    const element = balise("span", [["class", `stc${point.allumee ? " on" : ""}${point.classe === "" ? "" : ` ${point.classe}`}`]]);
    if (enCours) {
      element.append(balise("span", [["class", "sd"]]));
    } else {
      const bouton = balise("button", [
        ["type", "button"],
        ["class", `sd ${point.classe}`],
        ["data-sts", `${String(rang)}:${String(etape)}`],
        ["title", `${libelle} — modifier les dates`],
        ["aria-label", `${libelle} : modifier les dates`],
      ]);
      element.append(bouton);
    }
    element.append(balise("small", [], libelle));
    frise.append(element);
  });
  const cadre = balise("div", [
    ["class", `stw st-${statut}`],
    [
      "title",
      infobulleSuivi({ saisie: texte(suivi.saisie), distribution, rendu, evaluee: texte(suivi.evalue), restituee: derniere }),
    ],
  ]);
  cadre.append(
    frise,
    balise("div", [["class", "xpop stpop"], ["hidden", ""], ["data-stp", String(rang)]]),
    balise("div", [["class", "stl"]], (LIBELLES_STATUT as Readonly<Record<string, string>>)[statut] ?? ""),
    balise(
      "div",
      [["class", "stn"]],
      prochaineEtape(statut, {
        moduleEleves: contexte.moduleEleves,
        annulee: texte(evaluation.annulee),
        distribution,
        rendu,
        saisie: contexte.moduleEleves ? contexte.saisie(evaluation) : { full: 0, tot: 0 },
        restitutions,
        derniereRestitution: derniere,
      }),
    ),
  );
  return [cadre];
}

function ouvrirEtape(hote: HTMLElement, contexte: ContexteListe, cle: string): void {
  const [rang, etape] = cle.split(":").map(Number);
  const bouton = hote.querySelector<HTMLElement>(`[data-sts="${cle}"]`);
  const evaluation = contexte.evaluations()[rang ?? -1];
  const fenetre = hote.querySelector<HTMLElement>(`[data-stp="${String(rang)}"]`);
  if (bouton === null || evaluation === undefined || fenetre === null) return;
  fenetre.replaceChildren(...fenetreEtape(contexte, evaluation, etape ?? 0));
  const cadre = bouton.closest(".stw");
  const decalage = bouton.getBoundingClientRect().left - (cadre?.getBoundingClientRect().left ?? 0) + 18 - 270;
  fenetre.style.setProperty("--stx", `${String(decalage)}px`);
  fenetre.hidden = false;
  bouton.classList.add("open");
  contexte.retenirEtape(cle);
  fenetre.onclick = (evenement) => {
    evenement.stopPropagation();
  };
  const suivi = contexte.suivi(evaluation);
  const modeParDefaut = contexte.moduleEleves ? "dnmax" : "main";
  for (const champ of fenetre.querySelectorAll<HTMLInputElement>("[data-sv]")) {
    champ.addEventListener("change", () => {
      const nom = champ.dataset.sv ?? "";
      if (champ.value) suivi[nom] = champ.value;
      else Reflect.deleteProperty(suivi, nom);
      if (nom === "evalue") {
        if (champ.value) suivi.mode = texte(suivi.mode) || modeParDefaut;
        else Reflect.deleteProperty(suivi, "mode");
      }
      contexte.enregistrer(evaluation);
    });
  }
  for (const champ of fenetre.querySelectorAll<HTMLInputElement>("[data-svp]")) {
    champ.addEventListener("change", () => {
      const nom = champ.dataset.svp ?? "";
      if (champ.value) evaluation[nom] = champ.value;
      else Reflect.deleteProperty(evaluation, nom);
      if (nom === "renduPrev") Reflect.deleteProperty(contexte.suivi(evaluation), "butoir");
      contexte.synchroniserPrevu(evaluation, nom);
      contexte.enregistrer(evaluation);
    });
  }
  for (const action of fenetre.querySelectorAll<HTMLElement>("[data-stset]")) {
    action.addEventListener("click", () => {
      const nom = action.dataset.stset ?? "";
      suivi[nom] = contexte.aujourdhui;
      if (nom === "evalue") suivi.mode = texte(suivi.mode) || modeParDefaut;
      contexte.enregistrer(evaluation);
    });
  }
}

function fermerFenetres(): void {
  for (const fenetre of document.querySelectorAll<HTMLElement>(".xpop")) {
    if (!fenetre.hidden) {
      fenetre.hidden = true;
      fenetre.previousElementSibling?.setAttribute("aria-expanded", "false");
    }
  }
}

export function peindreListe(hote: HTMLElement, compteur: HTMLElement, contexte: ContexteListe): void {
  const evaluations = contexte.evaluations();
  const visibles = evaluations.map((evaluation) => contexte.visible(evaluation));
  const nombreVisibles = visibles.filter(Boolean).length;
  compteur.textContent = nombreVisibles < evaluations.length ? `${String(nombreVisibles)} / ${String(evaluations.length)}` : String(evaluations.length);
  if (evaluations.length === 0) {
    const vide = balise("div", [["class", "empty"]], "Aucune évaluation enregistrée. ");
    const nouvelle = balise("button", [["class", "btn"], ["id", "bNew2"]], "Nouvelle évaluation");
    const exemple = balise("button", [["class", "btn ghost"], ["id", "bDemo2"]], "chargez un exemple");
    nouvelle.addEventListener("click", () => {
      contexte.nouvelleEvaluation();
    });
    exemple.addEventListener("click", () => {
      contexte.chargerExemple();
    });
    vide.append(nouvelle, " ou ", exemple, ".");
    hote.replaceChildren(vide);
    return;
  }
  const tableau = balise("table", [["class", "t slist"]]);
  const entete = balise("tr");
  for (const titre of ["Promotion", "Sem.", "Intitulé", "Livrables", "Comp."]) entete.append(balise("th", [], titre));
  const colonneSuivi = balise("th", [["class", "csuivi"]]);
  const titreSuivi = balise("span", [["style", "display:inline-flex;gap:6px;align-items:center"]], "Suivi ");
  const aide = bulleAide(AIDE_SUIVI);
  aide.className = "help rt";
  titreSuivi.append(aide);
  colonneSuivi.append(titreSuivi);
  entete.append(colonneSuivi, balise("th", [["aria-label", "Actions"]]));
  const thead = balise("thead");
  thead.append(entete);
  const corps = balise("tbody");
  if (nombreVisibles === 0) {
    const ligne = balise("tr");
    const cellule = balise("td", [["colspan", "7"]]);
    const vide = balise("div", [["class", "empty"]], "Aucune évaluation ne correspond aux filtres. ");
    const parDefaut = balise("button", [["type", "button"], ["class", "btn ghost"], ["id", "sfReset2"]], "Revenir aux filtres par défaut");
    const tout = balise("button", [["type", "button"], ["class", "btn ghost"], ["id", "sfAll"]], "Tout afficher");
    parDefaut.addEventListener("click", () => {
      contexte.filtresParDefaut();
    });
    tout.addEventListener("click", () => {
      contexte.toutAfficher();
    });
    vide.append(parDefaut, " ", tout);
    cellule.append(vide);
    ligne.append(cellule);
    corps.append(ligne);
  }
  evaluations.forEach((evaluation, rang) => {
    if (!visibles[rang]) return;
    const livrables = (Array.isArray(evaluation.livrables) ? (evaluation.livrables as unknown[]) : []).filter(Boolean).map(texte);
    const ligne = balise("tr", [
      ["class", `srow${evaluation.annulee ? " annulee" : ""}${evaluation.brouillon ? " brouillon" : ""}`],
      ["data-open", String(rang)],
      ["tabindex", "0"],
      ["title", "Ouvrir l'évaluation"],
    ]);
    const promotion = balise("td", [["title", texte(evaluation.classe)]]);
    promotion.append(balise("b", [], contexte.promotions(evaluation) || texte(evaluation.classe) || "—"));
    const semestre = balise("td");
    semestre.append(balise("span", [["class", "pill"]], texte(evaluation.semestre)));
    const colonneLivrables = balise("td");
    if (livrables.length > 0) {
      colonneLivrables.append(livrables[0] ?? "");
      if (livrables.length > 1) colonneLivrables.append(" ", balise("span", [["class", "hint"]], `+${String(livrables.length - 1)}`));
    } else {
      colonneLivrables.append(balise("span", [["class", "hint"]], "—"));
    }
    const suivi = balise("td", [["class", "sact csuivi"]]);
    suivi.append(...celluleSuivi(contexte, evaluation, rang));
    const actions = balise("td", [["style", "white-space:nowrap;text-align:right"], ["class", "sact"]]);
    if (evaluation.brouillon) {
      const arme = contexte.armee === `b:${texte(evaluation.id)}`;
      const bouton = balise(
        "button",
        [["type", "button"], ["class", `btn ghost${arme ? " danger" : ""}`], ["data-delb", String(rang)], ["title", "Supprimer ce brouillon"]],
        arme ? "Confirmer la suppression" : "Supprimer le brouillon",
      );
      bouton.addEventListener("click", (evenement) => {
        evenement.stopPropagation();
        contexte.supprimerBrouillon(rang);
      });
      actions.append(bouton);
    } else {
      const menu = balise(
        "button",
        [
          ["type", "button"],
          ["class", "btn xact"],
          ["data-xm", String(rang)],
          ["aria-haspopup", "dialog"],
          ["title", evaluation.annulee ? "Rétablir, supprimer les évaluations individuelles…" : "Évaluer, exporter, dupliquer…"],
        ],
        "Actions…",
      );
      menu.addEventListener("click", (evenement) => {
        evenement.stopPropagation();
        contexte.ouvrirActions(rang);
      });
      actions.append(menu);
      if (evaluation.annulee) {
        const arme = contexte.armee === `f:${texte(evaluation.id)}`;
        const supprimer = balise(
          "button",
          [
            ["class", `btn ghost${arme ? " danger" : ""}`],
            ["data-del", String(rang)],
            ["title", contexte.evaluationsIndividuelles(evaluation) ? "Supprimez d'abord les évaluations individuelles (bouton « Actions… »)" : "Suppression définitive"],
          ],
          arme ? "Confirmer la suppression" : "Supprimer",
        );
        supprimer.addEventListener("click", (evenement) => {
          evenement.stopPropagation();
          contexte.supprimer(rang);
        });
        actions.append(supprimer);
      }
    }
    ligne.append(
      promotion,
      semestre,
      balise("td", [], texte(evaluation.titre) || "Sans titre"),
      colonneLivrables,
      balise("td", [["class", "mono"]], String(Array.isArray(evaluation.items) ? evaluation.items.length : 0)),
      suivi,
      actions,
    );
    // La saisie des étudiants ne s'ouvre que par « Évaluer les étudiants » ; une ligne ouvre la composition.
    ligne.addEventListener("click", (evenement) => {
      if (evenement.target instanceof Element && evenement.target.closest(".sact")) return;
      contexte.ouvrir(rang);
    });
    ligne.addEventListener("keydown", (evenement) => {
      if (evenement.target === ligne && (evenement.key === "Enter" || evenement.key === " ")) {
        evenement.preventDefault();
        contexte.ouvrir(rang);
      }
    });
    corps.append(ligne);
  });
  tableau.append(thead, corps);
  hote.replaceChildren(tableau);

  for (const point of hote.querySelectorAll<HTMLElement>("[data-sts]")) {
    point.addEventListener("click", (evenement) => {
      evenement.stopPropagation();
      const cle = point.dataset.sts ?? "";
      const etaitOuverte = contexte.etapeOuverte() === cle;
      fermerFenetres();
      for (const ouvert of hote.querySelectorAll(".sd.open")) ouvert.classList.remove("open");
      contexte.retenirEtape(null);
      if (!etaitOuverte) ouvrirEtape(hote, contexte, cle);
    });
  }
  const ouverte = contexte.etapeOuverte();
  if (ouverte !== null) ouvrirEtape(hote, contexte, ouverte);
  if (!fermeturesInstallees) {
    fermeturesInstallees = true;
    document.addEventListener("click", () => {
      if (contexte.etapeOuverte() !== null) {
        contexte.retenirEtape(null);
        for (const ouvert of document.querySelectorAll("#savedList .sd.open")) ouvert.classList.remove("open");
      }
    });
    document.addEventListener("click", fermerFenetres);
  }
  contexte.apresDessin();
}

