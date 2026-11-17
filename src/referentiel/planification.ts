// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Constituer, étape 4 : la planification par semestre. Une
 * grille croise les compétences, rangées par bloc, et les EC à chacun de
 * leurs semestres ; une case cochée rattache la compétence à l'EC ce
 * semestre-là. Les règles sont dans `domaine/planification`.
 */
import { codeAuSemestre, competencesDuBloc, competencesSansBloc, nomEc, SEMESTRES } from "../domaine/constituer";
import {
  basculerLien,
  blocsPlanification,
  colonnesPlanification,
  groupesPlanification,
  lienEc,
  liensVisibles,
  semestresAffiches,
  type ColonnePlanification,
} from "../domaine/planification";
import { balise } from "../etablissement/editeur-commun";

type Element = Record<string, unknown>;

/** Ce que l'interface confie à l'étape 4. */
export interface ContextePlanification {
  readonly vue: { ues: Element[]; ecs: Element[]; blocs: Element[]; competences: Element[] };
  /** Semestre choisi, ou chaîne vide pour tous. */
  readonly semestre: string;
  choisirSemestre(semestre: string): void;
  /** Teinte des bandes de bloc. */
  readonly teinteBlocs: string;
  /** Enregistre sans redessiner : la case cochée se met à jour sur place. */
  enregistrer(): void;
  /** Ouvre l'étape 3 filtrée sur la compétence. */
  allerALaCompetence(code: string): void;
}

function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" && valeur !== 0 ? String(valeur) : "";
}

/** Comme `a+" · "+b` dans l'interface historique : une valeur absente s'écrit « undefined ». */
function brut(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : typeof valeur === "number" || valeur === undefined || valeur === null ? String(valeur) : "";
}

function bordure(colonne: ColonnePlanification): string {
  return (colonne.alterne ? " alt" : "") + (colonne.finUe ? " ueend" : colonne.finEc ? " ecend" : "");
}

function couleur(valeur: unknown): string {
  return texte(valeur) || "#9aa2ae";
}

export function peindrePlanification(hote: HTMLElement, contexte: ContextePlanification): void {
  const { vue, semestre } = contexte;
  const groupes = groupesPlanification(vue.ues, vue.ecs, semestre);
  const colonnes = colonnesPlanification(groupes, semestre);
  const largeurEc = (ec: Element): number => Math.max(1, semestresAffiches(ec, semestre).length);
  const largeurUe = (ecs: readonly Element[]): number => ecs.reduce((somme, ec) => somme + largeurEc(ec), 0);
  const blocs = blocsPlanification(vue.blocs);
  const sansBloc = competencesSansBloc(vue.competences, blocs);

  const panneau = balise("div", [["class", "panel"]]);
  const filtre = balise("div", [["class", "semfilter"]]);
  const choix = balise("div", [["class", "seg"]]);
  for (const [valeur, libelle] of [["", "Tous"], ...SEMESTRES.map((sem) => [sem, sem])] as const) {
    const bouton = balise(
      "button",
      [
        ["type", "button"],
        ["data-msem", valeur],
        ["aria-pressed", String(valeur === semestre)],
      ],
      libelle,
    );
    bouton.addEventListener("click", () => {
      contexte.choisirSemestre(valeur);
    });
    choix.append(bouton);
  }
  filtre.append(balise("span", [["class", "sflab"]], "Semestre"), choix);
  panneau.append(filtre);

  if (colonnes.length === 0) {
    panneau.append(balise("div", [["class", "empty"]], "Aucun enseignement dans ce référentiel : ajoutez-en un à l'étape 2, Enseignements constitutifs."));
    hote.replaceChildren(panneau);
    return;
  }

  const cellule = (competence: Element, colonne: ColonnePlanification): HTMLElement => {
    const { ec } = colonne;
    if (colonne.semestre === "") return balise("td", [["class", `hs${bordure(colonne)}`]]);
    const lien = lienEc(competence, ec.id);
    const coche = lien !== null && Array.isArray(lien.sems) && (lien.sems as string[]).includes(colonne.semestre);
    const code = codeAuSemestre(ec, colonne.semestre);
    const bouton = balise(
      "button",
      [
        ["type", "button"],
        ["class", `xc${coche ? " on" : ""}`],
        ["data-tog", `${String(competence.id)}|${String(ec.id)}|${colonne.semestre}`],
        ["aria-pressed", String(coche)],
        ["title", `${brut(competence.code)} · ${nomEc(ec)} · ${colonne.semestre}${code === "" ? "" : ` · ${code}`}`],
      ],
      coche ? "✓" : "",
    );
    bouton.addEventListener("click", () => {
      const active = basculerLien(competence, String(ec.id), colonne.semestre);
      bouton.classList.toggle("on", active);
      bouton.setAttribute("aria-pressed", String(active));
      bouton.textContent = active ? "✓" : "";
      const compte = bouton.closest("tr")?.querySelector("td.n");
      if (compte) compte.textContent = String(liensVisibles(competence, colonnes));
      contexte.enregistrer();
    });
    const case_ = balise("td", [["class", bordure(colonne).trim()]]);
    case_.append(bouton);
    return case_;
  };

  const ligne = (competence: Element): HTMLElement => {
    const rangee = balise("tr");
    const tete = balise("th", [["class", "st cmp"]]);
    const bouton = balise("button", [
      ["type", "button"],
      ["class", "matbtn"],
      ["data-mapcomp", texte(competence.code)],
      ["title", "Modifier à l'étape 3, Blocs et compétences"],
    ]);
    bouton.append(balise("b", [], texte(competence.code)), " ", balise("span", [], texte(competence.libelle)));
    bouton.addEventListener("click", () => {
      contexte.allerALaCompetence(texte(competence.code));
    });
    tete.append(bouton);
    rangee.append(
      tete,
      ...colonnes.map((colonne) => cellule(competence, colonne)),
      balise("td", [["class", "n"]], String(liensVisibles(competence, colonnes))),
      balise("td", [["class", "n"]]),
    );
    return rangee;
  };

  const bande = (numero: unknown, nom: unknown, competences: readonly Element[]): HTMLElement => {
    const rangee = balise("tr", [
      ["class", "band"],
      ["style", `--c:${contexte.teinteBlocs}`],
    ]);
    const tete = balise("th", [["colspan", String(colonnes.length + 3)]]);
    const titre = balise("span", [["class", "bl"]], `Bloc ${brut(numero)}${texte(nom) === "" ? "" : ` · ${texte(nom)}`}`);
    titre.append(" ", balise("span", [["class", "n"]], `${String(competences.length)} compétence${competences.length > 1 ? "s" : ""}`));
    tete.append(titre);
    rangee.append(tete);
    return rangee;
  };

  const tableau = balise("table", [
    ["class", "mx mtx"],
    ["style", "--rh:58px"],
  ]);
  const entete = balise("thead");
  const rang1 = balise("tr");
  rang1.append(
    balise(
      "th",
      [
        ["class", "st"],
        ["rowspan", "3"],
      ],
      "Compétence",
    ),
  );
  for (const groupe of groupes) {
    const th = balise("th", [
      ["colspan", String(largeurUe(groupe.ecs))],
      ["class", "an ueend"],
      ["style", `--c:${couleur(groupe.ue.couleur)}`],
    ]);
    th.append(balise("span", [], texte(groupe.ue.nom)));
    rang1.append(th);
  }
  rang1.append(
    balise(
      "th",
      [
        ["class", "n"],
        ["rowspan", "3"],
      ],
      "EC",
    ),
    balise("th", [["rowspan", "3"]]),
  );
  const rang2 = balise("tr");
  for (const groupe of groupes) {
    groupe.ecs.forEach((ec, rang) => {
      const th = balise("th", [
        ["colspan", String(largeurEc(ec))],
        ["class", `ecn ${rang === groupe.ecs.length - 1 ? "ueend" : "ecend"}`],
        ["style", `--c:${couleur(ec.couleur)}`],
      ]);
      th.append(balise("span", [["class", "nm"]], nomEc(ec)));
      rang2.append(th);
    });
  }
  const rang3 = balise("tr");
  for (const colonne of colonnes) {
    const th = balise("th", [
      ["class", `ecc2${bordure(colonne)}`],
      ["style", `--c:${couleur(colonne.ec.couleur)}`],
    ]);
    const boite = balise("span", [["class", "rotbox"]]);
    boite.append(balise("b", [["class", "rot"]], colonne.semestre === "" ? "—" : codeAuSemestre(colonne.ec, colonne.semestre) || "—"));
    th.append(balise("span", [["class", "sm"]], colonne.semestre || "—"), boite);
    rang3.append(th);
  }
  entete.append(rang1, rang2, rang3);
  const corps = balise("tbody");
  for (const bloc of blocs) {
    const competences = competencesDuBloc(vue.competences, bloc.num);
    corps.append(bande(bloc.num, bloc.nom, competences), ...competences.map(ligne));
  }
  if (sansBloc.length > 0) corps.append(bande("—", "compétences sans bloc", sansBloc), ...sansBloc.map(ligne));
  tableau.append(entete, corps);
  const cadre = balise("div", [
    ["class", "tw mtxw"],
    ["id", "mtxw"],
  ]);
  cadre.append(tableau);
  panneau.append(cadre);
  if (vue.competences.length === 0) {
    panneau.append(balise("div", [["class", "empty"]], "Aucune compétence dans ce référentiel : ajoutez-les à l'étape 3, Blocs et compétences."));
  }
  hote.replaceChildren(panneau);
  // L'en-tête reste visible : ses deux premiers rangs sont mesurés pour les empiler.
  const rangs = tableau.querySelectorAll("thead tr");
  const hauteur1 = rangs[0]?.getBoundingClientRect().height ?? 34;
  const hauteur2 = rangs[1]?.getBoundingClientRect().height ?? 40;
  tableau.style.setProperty("--h1", `${hauteur1.toFixed(1)}px`);
  tableau.style.setProperty("--h2", `${hauteur2.toFixed(1)}px`);
}
