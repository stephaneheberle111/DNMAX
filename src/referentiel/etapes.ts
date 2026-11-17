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
  basculerSemestre,
  candidatsAjout,
  codesEnDouble,
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
