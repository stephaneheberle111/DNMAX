// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Constituer, étapes 1 à 3. Chacune crée, renomme et retire ses
 * propres éléments, et seulement eux : l'UE d'un EC se choisit à l'étape 2
 * mais ne s'y renomme pas, l'EC d'une compétence se rattache à l'étape 4.
 * Les règles sont dans `domaine/constituer` ; ce module affiche, sur
 * l'éditeur commun, et transmet. Noms, codes et intitulés passent par la vue
 * du référentiel actif que tient l'interface historique, qui les range dans
 * le dictionnaire commun à l'enregistrement.
 */
import {
  ANNEES,
  basculerSemestre,
  candidatsAjout,
  changerCodeEc,
  codesEnDouble,
  ecsAffiches,
  elementNeuf,
  libelleElement,
  SEMESTRES,
  type Sorte,
} from "../domaine/constituer";
import { balise, boutonSupprimer, ligneEditeur, panneauEditeur, type Armement } from "../etablissement/editeur-commun";

type Element = Record<string, unknown>;

/** Rappel commun aux trois étapes. */
export const NOTE_ETAPE =
  "Noms, codes et intitulés sont communs aux mentions qui retiennent l'élément : les modifier ici les modifie dans chacune. « Retirer » enlève l'élément de ce référentiel seulement ; il reste proposé dans la liste d'ajout, parmi les éléments déjà connus.";

/** La vue du référentiel actif, modifiée sur place, et le dictionnaire des éléments connus. */
export interface VueReferentiel {
  ues: Element[];
  ecs: Element[];
  blocs: Element[];
  competences: Element[];
  dico: Record<Sorte, Element[]>;
}

/** Ce que l'interface confie à une étape de « Constituer ». */
export interface ContexteEtape {
  readonly vue: VueReferentiel;
  /** « DN MADE mention Objet », ou « — ». */
  readonly diplome: string;
  nouvelIdentifiant(prefixe: string): string;
  /** Enregistre ; `redessiner` à faux pendant la frappe, pour garder le curseur. */
  enregistrer(redessiner: boolean): void;
  /** Filtre saisi dans l'étape (EC, blocs et compétences). */
  readonly filtre: string;
  /** Change le filtre et redessine l'étape. */
  filtrer(texte: string): void;
  /** Vide le filtre de l'étape, avant un ajout. */
  viderFiltre(): void;
  /** Retient dans ce référentiel un élément déjà connu, avec ses associations d'une autre mention, puis enregistre. */
  reprendre(sorte: Sorte, id: string): void;
  /** Retire un élément de ce référentiel, puis enregistre. */
  retirer(sorte: Sorte, id: string): void;
  readonly armement: Armement;
  annoncer(texte: string): void;
}

/** Fait défiler jusqu'à la ligne d'un élément et place le curseur dans son nom. */
export function focaliser(id: string): void {
  const ligne = document.querySelector(`#cpMain [data-row="${CSS.escape(id)}"]`);
  if (ligne === null) return;
  const champ =
    ligne.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[type="text"]:not(.mono),textarea') ??
    ligne.querySelector<HTMLInputElement>('input[type="text"]');
  ligne.scrollIntoView({ block: "center" });
  if (champ !== null) {
    champ.focus();
    champ.select();
  }
}

/** Liste d'ajout : un élément neuf, ou un élément déjà connu absent de ce référentiel. */
export function listeAjout(contexte: ContexteEtape, sorte: Sorte, libelle: string, neuf: string): HTMLSelectElement {
  const liste = balise("select", [
    ["class", "addsel"],
    ["data-cadd", sorte],
    ["aria-label", libelle],
  ]);
  liste.append(balise("option", [["value", ""]], `+ ${libelle}…`), balise("option", [["value", "__new"]], neuf));
  const candidats = candidatsAjout(contexte.vue[sorte], contexte.vue.dico[sorte]);
  if (candidats.length > 0) {
    const groupe = balise("optgroup", [["label", `Déjà connus, d'une autre mention ou d'une version (${String(candidats.length)})`]]);
    for (const candidat of candidats) groupe.append(balise("option", [["value", String(candidat.id)]], libelleElement(sorte, candidat)));
    liste.append(groupe);
  }
  liste.addEventListener("change", () => {
    const choix = liste.value;
    if (choix === "") return;
    contexte.viderFiltre();
    if (choix === "__new") {
      const element = elementNeuf(sorte, contexte.vue, "", contexte.nouvelIdentifiant(sorte.charAt(0)));
      contexte.vue[sorte].push(element);
      contexte.enregistrer(true);
      focaliser(String(element.id));
      return;
    }
    contexte.reprendre(sorte, choix);
    contexte.annoncer(`Ajouté au référentiel ${contexte.diplome}.`);
    focaliser(choix);
  });
  return liste;
}

/** Champ texte d'un élément, saisi dans la vue du référentiel (`data-cf`). */
export function champElement(
  contexte: ContexteEtape,
  sorte: Sorte,
  rang: number,
  cle: string,
  attributs: { valeur: unknown; exemple: string; libelle: string; suite?: readonly (readonly [string, string])[] },
): HTMLInputElement {
  const champ = balise("input", [
    ["type", "text"],
    ["value", texteAffiche(attributs.valeur)],
    ["data-cf", `${sorte}|${String(rang)}|${cle}`],
    ["placeholder", attributs.exemple],
    ["aria-label", attributs.libelle],
    ...(attributs.suite ?? []),
  ]);
  champ.addEventListener("input", () => {
    const element = contexte.vue[sorte][rang];
    if (element === undefined) return;
    element[cle] = champ.value;
    contexte.enregistrer(false);
  });
  return champ;
}

/** Couleur d'un élément (`data-cf`, champ `couleur`). */
export function champCouleur(contexte: ContexteEtape, sorte: Sorte, rang: number, valeur: unknown): HTMLInputElement {
  const champ = balise("input", [
    ["type", "color"],
    ["value", texteAffiche(valeur) || "#9aa2ae"],
    ["data-cf", `${sorte}|${String(rang)}|couleur`],
    ["aria-label", "Couleur"],
  ]);
  champ.addEventListener("input", () => {
    const element = contexte.vue[sorte][rang];
    if (element === undefined) return;
    element.couleur = champ.value;
    contexte.enregistrer(false);
  });
  return champ;
}

/** Les six semestres d'un élément, à ouvrir ou fermer ; ceux hors de `permis` sont grisés. */
export function pastillesSemestres(
  contexte: ContexteEtape,
  attribut: string,
  rang: number,
  element: Element,
  permis: readonly string[] | null,
): HTMLElement {
  const pastilles = balise("div", [["class", "chips sems"]]);
  const actuels = Array.isArray(element.sems) ? (element.sems as string[]) : [];
  for (const semestre of SEMESTRES) {
    const horsUe = permis !== null && !permis.includes(semestre);
    const bouton = balise(
      "button",
      [
        ["type", "button"],
        [`data-${attribut}`, String(rang)],
        ["data-v", semestre],
        ["aria-pressed", String(actuels.includes(semestre))],
        ...(horsUe
          ? ([
              ["disabled", ""],
              ["title", "Hors des semestres de l'UE"],
            ] as const)
          : []),
      ],
      semestre,
    );
    bouton.addEventListener("click", () => {
      basculerSemestre(element, semestre);
      contexte.enregistrer(true);
    });
    pastilles.append(bouton);
  }
  return pastilles;
}

/** Bouton « Retirer » à deux temps : retire l'élément de ce référentiel seulement. */
export function boutonRetirer(contexte: ContexteEtape, sorte: Sorte, id: string, libelle: string): HTMLButtonElement {
  return boutonSupprimer(`cr:${sorte}:${id}`, libelle, contexte.armement, () => {
    contexte.retirer(sorte, id);
    contexte.annoncer(sorte === "blocs" ? "Bloc retiré du référentiel ; ses compétences restent, sans bloc." : `Retiré du référentiel ${contexte.diplome}.`);
  });
}

/** Attributs d'un code porté deux fois : signalé, pas interdit. */
export function signalDouble(enDouble: boolean, message: string): readonly (readonly [string, string])[] {
  return enDouble
    ? [
        ["aria-invalid", "true"],
        ["title", message],
      ]
    : [];
}

function texteAffiche(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" && valeur !== 0 ? String(valeur) : "";
}

const CSS_UES = "grid-template-columns:44px 96px minmax(0,1fr) 216px 64px 92px";

/** Étape 1 : les unités d'enseignement, leur code, leur nom et leurs semestres. */
export function peindreEtapeUes(hote: HTMLElement, contexte: ContexteEtape): void {
  const { vue } = contexte;
  const enDouble = codesEnDouble(vue.ues, "code");
  const lignes = vue.ues.map((ue, rang) => {
    const id = String(ue.id);
    const nombreEcs = vue.ecs.filter((ec) => ec.ueId === ue.id).length;
    const ligne = ligneEditeur(CSS_UES, [
      champCouleur(contexte, "ues", rang, ue.couleur),
      champElement(contexte, "ues", rang, "code", {
        valeur: ue.code,
        exemple: "Code",
        libelle: "Code de l'UE",
        suite: [["class", "mono"], ...signalDouble(enDouble(ue), "Code déjà porté par une autre UE")],
      }),
      champElement(contexte, "ues", rang, "nom", { valeur: ue.nom, exemple: "Nom de l'unité", libelle: "Nom de l'UE" }),
      pastillesSemestres(contexte, "us", rang, ue, null),
      balise(
        "span",
        [
          ["class", "num"],
          ["title", "Enseignements constitutifs rattachés (étape 2)"],
        ],
        `${String(nombreEcs)} EC`,
      ),
      boutonRetirer(contexte, "ues", id, "Retirer"),
    ]);
    ligne.setAttribute("data-row", id);
    return ligne;
  });
  hote.replaceChildren(
    panneauEditeur({
      titre: `Étape 1 · Unités d'enseignement · ${contexte.diplome}`,
      compte: String(vue.ues.length),
      actions: [listeAjout(contexte, "ues", "Ajouter une UE", "Nouvelle UE")],
      entete: { css: CSS_UES, cellules: ["", "Code", "Nom", "Semestres", "EC", ""] },
      lignes,
      aide: `À cette étape, seules les UE se créent, se renomment et se retirent. Les semestres ouverts ici bornent ceux de leurs EC. ${NOTE_ETAPE}`,
    }),
  );
}

/** Champ « Filtrer… » des étapes 2 et 3 ; le curseur reste au bout de la saisie après chaque redessin. */
export function champFiltre(contexte: ContexteEtape): HTMLInputElement {
  const champ = balise("input", [
    ["type", "text"],
    ["id", "cq"],
    ["value", contexte.filtre],
    ["placeholder", "Filtrer…"],
    ["aria-label", "Filtrer"],
    ["style", "width:auto"],
  ]);
  champ.addEventListener("input", () => {
    contexte.filtrer(champ.value);
    const nouveau = document.getElementById("cq");
    if (nouveau instanceof HTMLInputElement) {
      nouveau.focus();
      nouveau.setSelectionRange(nouveau.value.length, nouveau.value.length);
    }
  });
  return champ;
}

const CSS_ECS = "grid-template-columns:44px 228px minmax(0,1fr) 190px 216px 54px 92px";

/** Étape 2 : les enseignements constitutifs, leurs codes par année, leur UE, leurs semestres et leurs ECTS. */
export function peindreEtapeEcs(hote: HTMLElement, contexte: ContexteEtape): void {
  const { vue } = contexte;
  const affiches = ecsAffiches(vue.ecs, contexte.filtre);
  const filtre = contexte.filtre.trim() !== "";
  const lignes: Node[] = [];
  if (vue.ues.length === 0) {
    lignes.push(balise("div", [["class", "empty"]], "Aucune UE dans ce référentiel : les EC restent « sans UE » tant que l'étape 1 n'en a pas."));
  }
  for (const ec of affiches) {
    const rang = vue.ecs.indexOf(ec);
    const id = String(ec.id);
    const ue = vue.ues.find((candidate) => candidate.id === ec.ueId);
    const codes = balise("div", [["class", "codes3"]]);
    const table = typeof ec.codes === "object" && ec.codes !== null ? (ec.codes as Record<string, unknown>) : {};
    for (const annee of ANNEES) {
      const champ = balise("input", [
        ["type", "text"],
        ["value", texteAffiche(table[annee])],
        ["data-ec3", String(rang)],
        ["data-a", String(annee)],
        ["class", "mono"],
        ["placeholder", `EC ${String(annee)}.1`],
        ["aria-label", `Code en DN${String(annee)}`],
      ]);
      champ.addEventListener("change", () => {
        changerCodeEc(ec, String(annee), champ.value);
        contexte.enregistrer(false);
      });
      const etiquette = balise("label");
      etiquette.append(balise("b", [], `DN${String(annee)}`), champ);
      codes.append(etiquette);
    }
    const choixUe = balise("select", [
      ["data-em", String(rang)],
      ["aria-label", "Unité d'enseignement"],
      ["title", "L'UE se choisit ici ; son nom se modifie à l'étape 1"],
    ]);
    choixUe.append(balise("option", [["value", ""]], "— sans UE —"));
    for (const candidate of vue.ues) {
      const code = texteAffiche(candidate.code);
      choixUe.append(
        balise(
          "option",
          [["value", String(candidate.id)], ...(candidate.id === ec.ueId ? [["selected", ""] as const] : [])],
          (code === "" ? "" : `${code} · `) + String(candidate.nom),
        ),
      );
    }
    choixUe.addEventListener("change", () => {
      ec.ueId = choixUe.value;
      contexte.enregistrer(true);
    });
    const ects = balise("input", [
      ["type", "text"],
      ["value", texteAffiche(ec.ects)],
      ["data-ee", String(rang)],
      ["aria-label", "ECTS"],
      ["class", "mono"],
    ]);
    ects.addEventListener("input", () => {
      ec.ects = ects.value;
      contexte.enregistrer(false);
    });
    const semestresUe = ue !== undefined && Array.isArray(ue.sems) ? (ue.sems as string[]) : null;
    const ligne = ligneEditeur(CSS_ECS, [
      champCouleur(contexte, "ecs", rang, ec.couleur),
      codes,
      champElement(contexte, "ecs", rang, "nom", { valeur: ec.nom, exemple: "Intitulé de l'enseignement", libelle: "Intitulé de l'EC" }),
      choixUe,
      pastillesSemestres(contexte, "es", rang, ec, semestresUe ?? SEMESTRES),
      ects,
      boutonRetirer(contexte, "ecs", id, "Retirer"),
    ]);
    ligne.setAttribute("data-row", id);
    lignes.push(ligne);
  }
  hote.replaceChildren(
    panneauEditeur({
      titre: `Étape 2 · Enseignements constitutifs · ${contexte.diplome}`,
      compte: String(affiches.length) + (filtre ? ` / ${String(vue.ecs.length)}` : ""),
      actions: [champFiltre(contexte), listeAjout(contexte, "ecs", "Ajouter un EC", "Nouvel enseignement constitutif")],
      entete: { css: CSS_ECS, cellules: ["", "Codes par année", "Intitulé", "Unité d'enseignement", "Semestres", "ECTS", ""] },
      lignes,
      aide: `À cette étape, seuls les EC se créent, se renomment et se retirent ; leur UE se choisit dans la liste, mais son nom se modifie à l'étape 1. Le code d'un EC change d'une année de diplôme à l'autre. Les semestres grisés sont hors du calendrier de l'UE. ${NOTE_ETAPE}`,
    }),
  );
}
