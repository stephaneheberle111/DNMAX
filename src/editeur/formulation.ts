// SPDX-License-Identifier: CECILL-2.1
/**
 * Étape 3 de l'éditeur d'évaluation : la formulation. Une ligne par
 * compétence ou par regroupement ; on y glisse les livrables, on y réunit ou
 * détache des compétences, et on y rédige ce qui est attendu. Les règles sont
 * dans `domaine/evaluation` ; ce module affiche et transmet.
 */
import {
  changerLivrableDeLigne,
  cleLigne,
  delier,
  detacher,
  formuler,
  lignesDe,
  rattacher,
  reunir,
  type CompetenceRetenue,
  type Ligne,
  type Regroupement,
} from "../domaine/evaluation";
import { creer, creerBouton } from "../ecran-echange";
import { commencerGlisser, glisserEnCours } from "./glisser-aimante";

/** Ce que l'éditeur confie à l'étape 3. */
export interface ContexteFormulation {
  /** L'évaluation en cours ; ses compétences et regroupements sont remplacés sur place à chaque changement. */
  readonly evaluation: Record<string, unknown>;
  /** Intitulé d'une compétence dans le référentiel, ou chaîne vide. */
  libelleCompetence(code: string): string;
  /** Nom de la colonne de formulation (Préférences : « Compétence opérationnelle » par défaut). */
  readonly libelleCritere: string;
  /** Clés des lignes cochées, relues à chaque affichage. */
  selection(): readonly string[];
  retenirSelection(cles: readonly string[]): void;
  nouvelIdentifiant(): string;
  enregistrer(): void;
  /** Après un changement qui touche l'avancement : la barre des étapes se met à jour. */
  apresChangement(): void;
  annoncer(message: string): void;
}

const AIDE_GLISSER =
  "Tout se fait à l'aimant : en approchant une pastille d'une ligne, celle-ci s'allume et la pastille vient s'y coller. " +
  "<b>Un code de compétence</b> déposé sur une autre ligne réunit les deux en compétence opérationnelle ; lâché à l'écart, il se détache de son groupe. " +
  "<b>Un livrable</b> déposé sur une ligne s'y associe ; sorti de la ligne, il s'en retire.";

function textes(valeur: unknown): string[] {
  return Array.isArray(valeur) ? valeur.filter((element): element is string => typeof element === "string") : [];
}

function appliquer(contexte: ContexteFormulation, changement: { items: CompetenceRetenue[]; ops: Regroupement[] }): void {
  contexte.evaluation.items = changement.items;
  contexte.evaluation.ops = changement.ops;
  contexte.enregistrer();
}

/** Bulle d'aide « ? », dans le style des autres aides de l'éditeur. */
function bulleAide(): HTMLElement {
  const aide = creer("span", "help");
  aide.tabIndex = 0;
  aide.setAttribute("role", "note");
  aide.setAttribute("aria-label", "Aide");
  const bulle = creer("span", "hbub");
  // Texte fixe, écrit ici : il peut contenir du gras.
  bulle.innerHTML = AIDE_GLISSER;
  aide.append(bulle);
  return aide;
}

/**
 * Affiche l'étape 3 : la palette des livrables et les lignes. L'écran se
 * redessine de lui-même après chaque changement qui modifie les lignes.
 */
export function peindreFormulation(contexte: ContexteFormulation): void {
  const repeindre = (): void => {
    peindreFormulation(contexte);
  };
  const aide = document.getElementById("helpDrag");
  if (aide !== null && aide.childElementCount === 0) aide.append(bulleAide());
  peindrePalette(contexte, repeindre);

  const lignes = lignesDe(contexte.evaluation);
  const hote = document.getElementById("lignes");
  const compte = document.getElementById("lCount");
  if (compte !== null) compte.textContent = String(lignes.length);
  const boutonLier = document.getElementById("bLink");
  if (boutonLier instanceof HTMLButtonElement) boutonLier.disabled = contexte.selection().length < 2;
  const conseil = document.getElementById("n3hint");
  if (conseil !== null) {
    conseil.textContent =
      contexte.selection().length > 0
        ? `${String(contexte.selection().length)} ligne(s) cochée(s)`
        : "Glissez-déposez, ou cochez deux lignes et cliquez « Lier ».";
  }
  if (hote === null) return;
  if (lignes.length === 0) {
    hote.replaceChildren(creer("div", "empty", "Aucune compétence retenue. Revenez à l'étape 2."));
    return;
  }
  const regroupements = Array.isArray(contexte.evaluation.ops) ? contexte.evaluation.ops : [];
  const numero = (id: string): number => regroupements.findIndex((regroupement: unknown) => (regroupement as { id?: unknown }).id === id) + 1;
  const zones: HTMLElement[] = [];
  const elements = lignes.map((ligne, rang) => {
    const element = peindreLigne(contexte, ligne, rang, numero, zones, repeindre);
    zones.push(element);
    return element;
  });
  hote.replaceChildren(...elements);
}

function peindrePalette(contexte: ContexteFormulation, repeindre: () => void): void {
  const palette = document.getElementById("palLivr");
  if (palette === null) return;
  const livrables = textes(contexte.evaluation.livrables);
  if (livrables.length === 0) {
    palette.replaceChildren(creer("span", "hint", "Aucun livrable — revenez à l'étape 1."));
    return;
  }
  palette.replaceChildren(
    ...livrables.map((livrable) => {
      const pastille = creer("span", "liv drg", livrable);
      pastille.dataset.dragliv = livrable;
      pastille.setAttribute("aria-pressed", "true");
      pastille.title = "Glisser sur une ligne pour l'associer";
      pastille.addEventListener("pointerdown", (evenement) => {
        commencerGlisser(evenement, pastille, {
          libelle: livrable,
          nature: "livrable",
          zones: [...document.querySelectorAll<HTMLElement>("#lignes [data-drop]")],
          detachable: false,
          surDepot: (cle) => {
            appliquer(contexte, changerLivrableDeLigne(contexte.evaluation, cle, livrable, true));
            repeindre();
          },
          surDetachement: () => undefined,
        });
      });
      return pastille;
    }),
  );
}

function peindreLigne(
  contexte: ContexteFormulation,
  ligne: Ligne,
  rang: number,
  numero: (id: string) => number,
  zones: readonly HTMLElement[],
  repeindre: () => void,
): HTMLElement {
  const cle = cleLigne(ligne);
  const cochee = contexte.selection().includes(cle);
  const competences = ligne.regroupement === null ? [ligne.competence] : ligne.competences;
  const { libelle, livrables } = ligne.regroupement ?? ligne.competence;

  const element = creer("div", cochee ? "lg sel" : "lg");
  element.dataset.drop = cle;
  const caseACocher = creer("input", "cbox");
  caseACocher.type = "checkbox";
  caseACocher.checked = cochee;
  caseACocher.dataset.lsel = cle;
  caseACocher.setAttribute("aria-label", `Sélectionner la ligne ${String(rang + 1)}`);
  caseACocher.addEventListener("change", () => {
    contexte.retenirSelection(caseACocher.checked ? [...contexte.selection(), cle] : contexte.selection().filter((autre) => autre !== cle));
    repeindre();
  });

  const corps = creer("div");
  corps.style.cssText = "display:flex;flex-direction:column;gap:8px;min-width:0";

  const haut = creer("div", "top");
  if (ligne.regroupement !== null) haut.append(creer("span", "num", `OP ${String(numero(ligne.regroupement.id))}`));
  for (const competence of competences) {
    const intitule = contexte.libelleCompetence(competence.code);
    const pastille = creer("span", "cd drg");
    pastille.dataset.dragcomp = competence.code;
    pastille.title = `${competence.code}${intitule === "" ? "" : ` · ${intitule}`} — glisser vers une autre ligne pour réunir, ou à l'écart pour détacher`;
    const poignee = creer("span", "grip", "⠿");
    poignee.setAttribute("aria-hidden", "true");
    pastille.append(poignee, creer("b", "", competence.code));
    if (intitule !== "") pastille.append(creer("span", "t", intitule));
    pastille.addEventListener("pointerdown", (evenement) => {
      commencerGlisser(evenement, pastille, {
        libelle: `${competence.code}${intitule === "" ? "" : ` · ${intitule}`}`,
        nature: "competence",
        zones: zones.filter((zone) => zone !== element),
        detachable: competence.op !== "",
        surDepot: (cible) => {
          appliquer(contexte, rattacher(contexte.evaluation, cible, competence.code, () => contexte.nouvelIdentifiant()));
          repeindre();
          contexte.apresChangement();
        },
        surDetachement: () => {
          appliquer(contexte, detacher(contexte.evaluation, competence.code));
          repeindre();
          contexte.apresChangement();
        },
      });
    });
    haut.append(pastille);
  }
  if (ligne.regroupement !== null) {
    const id = ligne.regroupement.id;
    const boutonDelier = creerBouton("Délier", "btn ghost", () => {
      appliquer(contexte, delier(contexte.evaluation, id));
      contexte.retenirSelection([]);
      repeindre();
      contexte.apresChangement();
      contexte.annoncer("Compétences déliées.");
    });
    boutonDelier.dataset.unlink = id;
    boutonDelier.style.marginLeft = "auto";
    haut.append(boutonDelier);
  }

  const rangeeFormulation = creer("div", "ro");
  const champ = creer("input");
  champ.type = "text";
  champ.dataset.lib = cle;
  champ.value = libelle;
  champ.style.flex = "1 1 240px";
  champ.placeholder =
    ligne.regroupement === null
      ? "Formuler ce qui est attendu (sinon l'intitulé du référentiel)…"
      : "Formuler ce qui est attendu pour ce regroupement…";
  champ.addEventListener("input", () => {
    appliquer(contexte, formuler(contexte.evaluation, cle, champ.value));
    contexte.apresChangement();
  });
  rangeeFormulation.append(creer("label", "mini", contexte.libelleCritere), champ);

  const rangeeLivrables = creer("div", "ro livrow");
  if (livrables.length === 0) {
    rangeeLivrables.append(creer("span", "hint", "aucun livrable — glissez-en un ici"));
  }
  for (const livrable of livrables) {
    const bouton = creer("button", "liv on drg", livrable);
    bouton.type = "button";
    bouton.dataset.lliv = cle;
    bouton.dataset.v = livrable;
    bouton.setAttribute("aria-pressed", "true");
    bouton.title = "Glisser à l'écart pour retirer";
    const retirer = (): void => {
      appliquer(contexte, changerLivrableDeLigne(contexte.evaluation, cle, livrable, false));
      repeindre();
    };
    bouton.addEventListener("pointerdown", (evenement) => {
      commencerGlisser(evenement, bouton, {
        libelle: livrable,
        nature: "livrable",
        zones,
        detachable: true,
        surDepot: (cible) => {
          appliquer(contexte, changerLivrableDeLigne(contexte.evaluation, cible, livrable, true));
          repeindre();
        },
        surDetachement: retirer,
      });
    });
    bouton.addEventListener("click", () => {
      if (!glisserEnCours()) retirer();
    });
    rangeeLivrables.append(bouton);
  }

  corps.append(haut, rangeeFormulation, rangeeLivrables);
  element.append(caseACocher, corps);
  return element;
}

/**
 * « Lier » : réunit les lignes cochées (au moins deux) en une compétence
 * opérationnelle, puis place le curseur dans sa formulation.
 */
export function lierSelection(contexte: ContexteFormulation): void {
  if (contexte.selection().length < 2) return;
  const { items, ops, regroupement } = reunir(contexte.evaluation, contexte.selection(), () => contexte.nouvelIdentifiant());
  appliquer(contexte, { items, ops });
  contexte.retenirSelection([]);
  peindreFormulation(contexte);
  contexte.apresChangement();
  const champ = document.querySelector<HTMLInputElement>(`[data-lib="op:${CSS.escape(regroupement)}"]`);
  champ?.focus();
  champ?.scrollIntoView({ block: "center" });
}
