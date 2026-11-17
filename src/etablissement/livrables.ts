// SPDX-License-Identifier: CECILL-2.1
/** Mon compte > Préférences : les livrables proposés à l'étape 1 de l'évaluation. */
import { balise, boutonAction, boutonSupprimer, champLigne, ligneEditeur, panneauEditeur, type Armement } from "./editeur-commun";

/** Un livrable proposé ; les valeurs viennent de l'interface historique, non typée. */
export interface Livrable {
  nom: unknown;
  type?: unknown;
}

/** Valeur affichée d'un champ, comme `esc(x)` (nom) ou `esc(x||"")` (nature) dans l'interface historique. */
function texte(valeur: unknown, videSiFaux: boolean): string {
  if (typeof valeur === "string") return valeur;
  if (typeof valeur === "number" || typeof valeur === "boolean") return videSiFaux && !valeur ? "" : String(valeur);
  return "";
}

/** Ce que l'interface confie au volet « Livrables ». */
export interface ContexteLivrables {
  /** Les livrables, modifiés sur place. */
  livrables(): Livrable[];
  /** Remplace la liste entière (« Liste d'origine »). */
  remplacer(livrables: Livrable[]): void;
  /** Noms de la liste d'origine. */
  readonly listeOrigine: readonly string[];
  /** Retire un livrable supprimé de l'évaluation en cours. */
  retirerDeLEvaluation(nom: unknown): void;
  readonly armement: Armement;
  /** Enregistre ; `redessiner` à faux pendant la frappe, pour garder le curseur. */
  enregistrer(redessiner: boolean): void;
  annoncer(texte: string): void;
}

const CSS = "grid-template-columns:minmax(0,1fr) 190px 92px";
const NATURES = ["Écrit", "Oral", "Plastique", "Numérique", "Maquette", "Dossier"];

export function peindreLivrables(hote: HTMLElement, contexte: ContexteLivrables): void {
  const livrables = contexte.livrables();
  const lignes: Node[] = livrables.map((livrable, rang) =>
    ligneEditeur(CSS, [
      champLigne(
        [
          ["value", texte(livrable.nom, false)],
          ["data-lv", String(rang)],
          ["aria-label", "Livrable"],
        ],
        (valeur) => {
          livrable.nom = valeur;
          contexte.enregistrer(false);
        },
      ),
      champLigne(
        [
          ["value", texte(livrable.type, true)],
          ["data-lt", String(rang)],
          ["list", "livtypes"],
          ["placeholder", "Écrit, oral, plastique…"],
          ["aria-label", "Nature"],
        ],
        (valeur) => {
          livrable.type = valeur;
          contexte.enregistrer(false);
        },
      ),
      boutonSupprimer(`lv${String(rang)}`, "Supprimer", contexte.armement, () => {
        const [retire] = livrables.splice(rang, 1);
        if (retire !== undefined) contexte.retirerDeLEvaluation(retire.nom);
        contexte.enregistrer(true);
      }),
    ]),
  );
  const natures = balise("datalist", [["id", "livtypes"]]);
  for (const nature of NATURES) natures.append(balise("option", [], nature));
  lignes.push(natures);
  const ajouter = boutonAction("+ Ajouter", "edAdd", () => {
    contexte.livrables().push({ nom: "", type: "" });
    contexte.enregistrer(true);
    const champs = hote.querySelectorAll<HTMLInputElement>("[data-lv]");
    champs[champs.length - 1]?.focus();
  });
  const origine = boutonAction("Liste d'origine", "edDefault", () => {
    contexte.remplacer(contexte.listeOrigine.map((nom) => ({ nom, type: "" })));
    contexte.enregistrer(true);
    contexte.annoncer("Liste d'origine rétablie.");
  });
  hote.replaceChildren(
    panneauEditeur({
      titre: "Livrables",
      compte: String(livrables.length),
      actions: [ajouter, origine],
      entete: { css: CSS, cellules: ["Nom", "Nature", ""] },
      lignes,
      aide: "Proposés à l'étape 1 de l'évaluation ; un livrable hors liste s'ajoute ici automatiquement.",
    }),
  );
}
