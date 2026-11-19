// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement > Enseignants : prénom et nom de chaque enseignant, et
 * la ligne « C'est moi ». Les règles des noms sont dans `domaine/personnes`.
 */
import { completerPersonne, composerNom } from "../domaine/personnes";
import { balise, boutonAction, boutonSupprimer, champLigne, ligneEditeur, panneauEditeur, type Armement } from "./editeur-commun";

/** Ce que l'interface confie au volet « Enseignants ». */
export interface ContexteEnseignants {
  /** Les enseignants, modifiés sur place. */
  readonly enseignants: Record<string, unknown>[];
  /** Identifiant de l'enseignant « C'est moi ». */
  moi(): string;
  definirMoi(id: string): void;
  readonly armement: Armement;
  nouvelIdentifiant(): string;
  /** Enregistre ; `redessiner` à faux pendant la frappe, pour garder le curseur. */
  enregistrer(redessiner: boolean): void;
  /** Le nom de « C'est moi » signe aussi les envois : l'application le reprend. */
  renommerMoi(prenom: string, nomFam: string): void;
  annoncer(texte: string): void;
}

const CSS = "grid-template-columns:60px minmax(0,1fr) minmax(0,1fr) 92px";
const AIDE =
  "Proposé·es dans le champ « Enseignant·es » de l'étape 1. « C'est moi » désigne l'utilisateur·rice de DNMAX : son prénom et son nom signent ses envois, sa répartition de service cadre la page Progression, et son nom est coché d'office dans une nouvelle évaluation.";

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : "";
}

export function peindreEnseignants(hote: HTMLElement, contexte: ContexteEnseignants): void {
  const { enseignants } = contexte;
  enseignants.forEach(completerPersonne);
  const lignes = enseignants.map((enseignant, rang) => {
    const id = texte(enseignant.id);
    const moi = balise("input", [
      ["type", "radio"],
      ["name", "moi"],
      ["data-moi", id],
      ...(contexte.moi() === id ? [["checked", ""] as const] : []),
      ["aria-label", `C'est moi : ${texte(enseignant.nom)}`],
      ["style", "justify-self:center;width:18px;height:18px"],
    ]);
    moi.addEventListener("change", () => {
      contexte.definirMoi(id);
      const choisi = enseignants.find((candidat) => candidat.id === id);
      contexte.annoncer(`Répartition de service de ${texte(choisi?.nom)} prise en compte.`);
    });
    const renommer = (cle: "prenom" | "nomFam", valeur: string): void => {
      enseignant[cle] = valeur;
      enseignant.nom = composerNom(enseignant.prenom, enseignant.nomFam);
      contexte.enregistrer(false);
      if (id === contexte.moi()) contexte.renommerMoi(texte(enseignant.prenom), texte(enseignant.nomFam));
    };
    return ligneEditeur(CSS, [
      moi,
      champLigne(
        [
          ["value", texte(enseignant.prenom)],
          ["data-tp", String(rang)],
          ["placeholder", "Prénom"],
          ["aria-label", "Prénom"],
        ],
        (valeur) => {
          renommer("prenom", valeur);
        },
      ),
      champLigne(
        [
          ["value", texte(enseignant.nomFam)],
          ["data-tn", String(rang)],
          ["placeholder", "Nom"],
          ["aria-label", "Nom"],
        ],
        (valeur) => {
          renommer("nomFam", valeur);
        },
      ),
      boutonSupprimer(`ens${String(rang)}`, "Supprimer", contexte.armement, () => {
        enseignants.splice(rang, 1);
        contexte.enregistrer(true);
      }),
    ]);
  });
  const ajouter = boutonAction("+ Ajouter", "edAdd", () => {
    enseignants.push({ id: contexte.nouvelIdentifiant(), nom: "", prenom: "", nomFam: "", discipline: "" });
    contexte.enregistrer(true);
    const champs = hote.querySelectorAll<HTMLInputElement>("[data-tp]");
    champs[champs.length - 1]?.focus();
  });
  hote.replaceChildren(
    panneauEditeur({
      titre: "Enseignant·es",
      compte: String(enseignants.length),
      actions: [ajouter],
      entete: { css: CSS, cellules: ["C'est moi", "Prénom", "Nom", ""] },
      lignes,
      aide: AIDE,
    }),
  );
}
