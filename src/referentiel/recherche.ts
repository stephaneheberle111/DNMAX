// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Explorer, vue « Recherche » : les listes de regroupement et
 * d'année, les semestres, et le tableau des compétences trouvées. Les règles
 * sont dans `domaine/exploration`. La carte radiale et la chaîne ne passent
 * pas par ici : `interface/radiale-dessin` et `interface/chaine-dessin` les
 * dessinent.
 */
import { numeroCode, sansAccents, SEMESTRES } from "../domaine/constituer";
import {
  basculerSemestreRecherche,
  competencesDuGroupe,
  pairesRecherche,
  regrouperPaires,
  restreindreAuxEcs,
  surligner,
  type OutilsRegroupement,
} from "../domaine/exploration";
import { balise } from "../etablissement/editeur-commun";

type Element = Record<string, unknown>;

/** État de la recherche, tenu par l'interface et modifié sur place. */
export interface EtatRecherche {
  q: string;
  group: string;
  annee: string;
  sems: string[];
}

/** Ce que l'interface confie à la vue « Recherche ». */
export interface ContexteRecherche extends OutilsRegroupement {
  /** Compétences du référentiel affiché, avec les EC qui les portent à chaque semestre. */
  readonly competences: readonly Element[];
  readonly recherche: EtatRecherche;
  /** Filtre posé depuis la carte. */
  readonly filtre: { readonly kind: string; readonly value: string };
  /** Modes de regroupement proposés, et leur libellé. */
  readonly modes: Readonly<Record<string, string>>;
  /** Années proposées dans la liste, et leur libellé. */
  readonly annees: readonly { readonly annee: string; readonly libelle: string }[];
  /** Teinte des groupes par bloc. */
  readonly teinteBlocs: string;
  nomEcReferentiel(code: string): string;
  redessiner(): void;
  /** EC auxquels se limiter (« Seulement ma répartition de service »), ou `null`. */
  readonly ecsRetenus?: ReadonlySet<string> | null;
}

function element(id: string): HTMLElement {
  const trouve = document.getElementById(id);
  if (trouve === null) throw new Error(`Élément #${id} absent de la page.`);
  return trouve;
}

/** Comme `esc(x)` dans l'interface : une valeur absente s'écrit vide. */
function affiche(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" || typeof valeur === "boolean" ? String(valeur) : "";
}

/** Texte avec la recherche marquée. */
function marque(texte: unknown, cherche: string): Node[] {
  return surligner(texte, cherche).flatMap<Node>((morceau) => {
    if (morceau.marque) return [balise("mark", [], morceau.texte)];
    return morceau.texte === "" ? [] : [document.createTextNode(morceau.texte)];
  });
}

/** Pastilles séparées par une espace, comme dans l'interface. */
function pastilles(liste: readonly HTMLElement[]): Node[] {
  return liste.flatMap((pastille, rang) => (rang === 0 ? [pastille] : [document.createTextNode(" "), pastille]));
}

export function peindreRecherche(contexte: ContexteRecherche): void {
  const { recherche } = contexte;
  const regroupement = element("r-group") as HTMLSelectElement;
  regroupement.replaceChildren(...Object.entries(contexte.modes).map(([cle, libelle]) => balise("option", [["value", cle]], libelle)));
  regroupement.value = recherche.group;
  const annee = element("r-annee") as HTMLSelectElement;
  annee.replaceChildren(
    balise("option", [["value", "*"]], "Toutes les années"),
    ...contexte.annees.map((choix) => balise("option", [["value", choix.annee]], choix.libelle)),
  );
  annee.value = recherche.annee;
  const semestres = element("r-sem");
  semestres.replaceChildren(
    ...(["*", ...SEMESTRES] as const).map((semestre) => {
      const bouton = balise(
        "button",
        [
          ["type", "button"],
          ["data-sem", semestre],
          ["aria-pressed", String(semestre === "*" ? recherche.sems.length === 0 : recherche.sems.includes(semestre))],
        ],
        semestre === "*" ? "Tous" : semestre,
      );
      bouton.addEventListener("click", () => {
        recherche.sems = basculerSemestreRecherche(recherche.sems, semestre);
        contexte.redessiner();
      });
      return bouton;
    }),
  );
  (element("r-search") as HTMLInputElement).value = recherche.q;

  const paires = pairesRecherche(restreindreAuxEcs(contexte.competences, contexte.ecsRetenus ?? null), contexte.filtre, recherche, (numero) => contexte.nomBloc(numero));
  if (!(recherche.group in contexte.modes)) recherche.group = "bloc";
  const groupes = regrouperPaires(paires, recherche.group, contexte);
  const vues = new Set(paires.map((paire) => paire.c.code));
  element("rCount").textContent = `${String(vues.size)} / ${String(contexte.competences.length)}`;
  const cherche = sansAccents(recherche.q.trim());
  const hote = element("refList");
  if (groupes.length === 0) {
    hote.replaceChildren(
      balise("div", [["class", "empty"]], `Aucune compétence ne correspond${recherche.q === "" ? "" : ` à « ${recherche.q} »`} avec ces filtres.`),
    );
    return;
  }
  const avecBloc = recherche.group !== "bloc";
  hote.replaceChildren(
    ...groupes.map((groupe) => {
      const competences = competencesDuGroupe(groupe);
      const cadre = balise("div", [["class", "bloc grp"]]);
      const teinte = groupe.couleur === null && recherche.group === "bloc" && groupe.rang % 2 ? "tint" : "";
      const tete = balise("div", [
        ["class", `bh ${groupe.couleur === null ? teinte : "rail"}`],
        ["style", groupe.couleur === null ? `--bloc:${contexte.teinteBlocs}` : `--c:${groupe.couleur}`],
      ]);
      tete.append(
        balise("span", [["class", "n"]], groupe.libelle),
        balise("span", [["class", "t"]], groupe.sousTitre),
        balise("span", [["class", "c"]], `${String(competences.length)} comp.`),
      );
      // Largeurs fixes : d'un groupe à l'autre, chaque colonne commence au même endroit.
      const tableau = balise("table", [["class", "t rch"]]);
      const colonnes = balise("colgroup");
      for (const sorte of [...(avecBloc ? ["bloc"] : []), "code", "intitule", "semestres", "ecs"]) colonnes.append(balise("col", [["class", `rch-${sorte}`]]));
      tableau.append(colonnes);
      const entete = balise("tr");
      for (const titre of [...(avecBloc ? ["Bloc"] : []), "Code", "Compétence", "Semestres", "EC"]) entete.append(balise("th", [], titre));
      const thead = balise("thead");
      thead.append(entete);
      const corps = balise("tbody");
      for (const { c, sems, ecs } of competences) {
        const ligne = balise("tr");
        if (avecBloc) {
          ligne.append(
            balise(
              "td",
              [
                ["class", "mono"],
                ["title", contexte.nomBloc(c.bloc)],
              ],
              affiche(c.bloc),
            ),
          );
        }
        const code = balise("td", [
          ["class", "mono"],
          ["style", "color:var(--accent);white-space:nowrap"],
        ]);
        code.append(...marque(c.code, cherche));
        const intitule = balise("td", [["style", "min-width:240px"]]);
        intitule.append(...marque(c.libelle, cherche));
        const colonneSemestres = balise("td", [["style", "white-space:nowrap"]]);
        colonneSemestres.append(
          ...pastilles(
            [...sems]
              .sort((a, b) => SEMESTRES.indexOf(a as (typeof SEMESTRES)[number]) - SEMESTRES.indexOf(b as (typeof SEMESTRES)[number]))
              .map((semestre) => balise("span", [["class", "pill"]], semestre)),
          ),
        );
        const colonneEcs = balise("td", [["class", "hint"]]);
        colonneEcs.append(
          ...pastilles(
            [...ecs]
              .sort((a, b) => numeroCode(a) - numeroCode(b))
              .map((codeEc) => {
                const pastille = balise("span", [
                  ["class", "pill c"],
                  ["style", `--c:${contexte.couleurEc(codeEc)}`],
                  ["title", contexte.nomEcReferentiel(codeEc)],
                ]);
                pastille.append(...marque(codeEc, cherche));
                return pastille;
              }),
          ),
        );
        ligne.append(code, intitule, colonneSemestres, colonneEcs);
        corps.append(ligne);
      }
      tableau.append(thead, corps);
      const enveloppe = balise("div", [["class", "tw"]]);
      enveloppe.append(tableau);
      cadre.append(tete, enveloppe);
      return cadre;
    }),
  );
}
