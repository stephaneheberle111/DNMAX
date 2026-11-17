// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Explorer : l'habillage autour de la carte. Choix du diplôme
 * et de la mention, état de la version, tuiles de filtre, barre des vues, et
 * les deux tableaux (EC × semestres, compétences × semestres). La carte
 * radiale et la chaîne ne sont pas dessinées ici : l'interface historique
 * fournit leur balisage tel quel, et les anime ensuite.
 */
import { codeAuSemestre, codesEc, mentionsDuDiplome, nomEc, nomsDiplomes, sansAccents, SEMESTRES, ANNEES } from "../domaine/constituer";
import { blocsTableau, casesEc, competencesTableau, ecsAuSemestre, titreBloc } from "../domaine/exploration";
import { balise } from "../etablissement/editeur-commun";
import { bulleAide } from "../etablissement/volets";
import { dateEnLettres } from "./constituer";

type Element = Record<string, unknown>;

/** Ce que l'interface confie à l'habillage de la carte. */
export interface ContexteHabillage {
  readonly diplomes: readonly Element[];
  readonly actif: unknown;
  readonly versionActive: Element | null;
  readonly aJour: boolean;
  readonly filtre: { readonly kind: string; readonly value: string };
  /** Vue choisie : radial, chain, table, tablec ou search. */
  readonly vue: string;
  /** Référentiel projeté : UE, blocs et compétences (avec les EC qui les portent à chaque semestre). */
  readonly ues: readonly Element[];
  readonly blocs: readonly Element[];
  readonly competences: readonly Element[];
  /** EC du référentiel actif, rangés par code. */
  readonly ecs: readonly Element[];
  /** Compétences de la vue du référentiel actif (rattachements `ecIds`). */
  readonly competencesVue: readonly Element[];
  /** UE et leurs EC pour le tableau EC × semestres, réduits au filtre de la carte. */
  readonly groupesTableau: readonly { readonly ue: Element; readonly ecs: readonly Element[]; readonly competences: number }[];
  codeAnnee(annee: number): string;
  nomBloc(numero: string): string;
  couleurEc(code: string): string;
  readonly teinteBlocs: string;
  /** Années et niveaux d'acquisition, quand le module est actif ; sinon `null`. */
  readonly niveaux: string | null;
  /** Balisage de la carte radiale (sans son cadre de zoom) et de la chaîne, produits par l'interface historique. */
  carteRadiale(): string;
  carteChaine(): string;
  choisirVue(vue: string): void;
  filtrer(sorte: string, valeur: string): void;
  choisirMention(id: string): void;
  /** Rend faux si aucun diplôme ne porte ce nom. */
  choisirDiplome(nom: string): boolean;
  allerALEc(nom: string): void;
  rechercher(texte: string, parUe: boolean): void;
}

const AIDES: Readonly<Record<string, string>> = {
  chain:
    "Cinq colonnes, de la compétence au diplôme, le semestre entre la compétence et l'EC. La colonne verrouillée (cadenas fermé) tourne comme une roue ; les autres montrent ce qui est associé à l'élément choisi, avant et après lui. Le cadenas d'une autre colonne, ou un clic sur une case, y déplace le verrou. Survoler une case éclaire son chemin.",
  table:
    "Une ligne par enseignement constitutif, groupée par unité : la case donne le code que porte l'EC à ce semestre — il change d'une année de diplôme à l'autre. Un clic sur une case ouvre l'EC dans Constituer ; un clic sur une unité bascule sur « Recherche ».",
  tablec:
    "Une ligne par compétence, groupée par bloc : chaque case donne les EC qui la portent à ce semestre. Vide = la compétence n'est pas mobilisable ce semestre-là. Un clic sur une pastille d'EC l'ouvre dans Constituer ; un clic sur la compétence bascule sur « Recherche ».",
  search: "Recherche par code, UE ou mot-clé, regroupement au choix, filtres d'année et de semestres.",
  radial:
    "Trois couronnes : unités d'enseignement, enseignements constitutifs, puis années de diplôme — une part par année, ses deux semestres réunis, le code de l'EC pour cette année-là s'affichant dans l'encadré de droite. Les points extérieurs sont les compétences. Pendant qu'une portion est éclatée la roue s'immobilise : ce qui est éclaté reste sous le curseur, et elle repart quand on s'éloigne. Survoler éclate la portion : ses EC affichent leur nom et ses compétences s'étalent autour de la roue. Un clic fige la carte jusqu'à ce que vous survoliez une flèche de rotation. La roue tourne quand vous survolez l'une des deux flèches qui l'entourent, en haut à droite et en bas à gauche de la carte ; ailleurs, elle reste immobile. La molette, le pincement ou les boutons au-dessus de la carte zooment et dézooment en douceur, la roue glissant toujours le long de la même diagonale ; « Ajuster » revient à la vue de départ.",
};

function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" && valeur !== 0 ? String(valeur) : "";
}

/** Comme la concaténation de l'interface historique : une valeur absente s'écrit « undefined ». */
function brut(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : typeof valeur === "number" || valeur === undefined || valeur === null ? String(valeur) : "";
}

/** Comme `esc(x)` dans l'interface historique : une valeur absente s'écrit vide. */
function affiche(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" || typeof valeur === "boolean" ? String(valeur) : "";
}

/** Balisage HTML fourni par l'interface historique (carte radiale, chaîne), inséré tel quel. */
function fragment(html: string): DocumentFragment {
  const modele = document.createElement("template");
  modele.innerHTML = html;
  return modele.content;
}

function couleur(valeur: unknown): string {
  return texte(valeur) || "#9aa2ae";
}

function videCase(): HTMLElement {
  return balise("span", [["class", "vide"]], "·");
}

export function peindreHabillageCarte(hote: HTMLElement, contexte: ContexteHabillage): void {
  const { filtre, vue } = contexte;
  const courant = contexte.diplomes.find((diplome) => diplome.id === contexte.actif) ?? {};
  const noeuds: Node[] = [barreDiplome(contexte, courant), tuiles(contexte), barreVues(contexte)];
  if (vue === "radial") noeuds.push(cadreRadial(contexte));
  if (vue === "chain") noeuds.push(fragment(contexte.carteChaine()));
  if (contexte.niveaux !== null) noeuds.push(balise("div", [["class", "hint"]], contexte.niveaux));
  if (vue === "table") noeuds.push(tableauEcs(contexte));
  if (vue === "tablec") noeuds.push(tableauCompetences(contexte, filtre));
  hote.replaceChildren(...noeuds);
}

function barreDiplome(contexte: ContexteHabillage, courant: Element): HTMLElement {
  const barre = balise("div", [["class", "cbar"]]);
  const choixNom = balise("select", [
    ["data-dipnom", "1"],
    ["aria-label", "Diplôme"],
  ]);
  for (const nom of nomsDiplomes(contexte.diplomes)) {
    const choisie = sansAccents(nom) === sansAccents(texte(courant.nom));
    choixNom.append(balise("option", [["value", nom], ...(choisie ? [["selected", ""] as const] : [])], nom || "—"));
  }
  choixNom.addEventListener("change", () => {
    if (!contexte.choisirDiplome(choixNom.value)) choixNom.value = texte(courant.nom);
  });
  const choixMention = balise("select", [
    ["data-dip", "1"],
    ["aria-label", "Mention"],
  ]);
  for (const mention of mentionsDuDiplome(contexte.diplomes, contexte.actif)) {
    choixMention.append(
      balise(
        "option",
        [["value", String(mention.id)], ...(mention.id === contexte.actif ? [["selected", ""] as const] : [])],
        texte(mention.mention) || "sans mention",
      ),
    );
  }
  choixMention.addEventListener("change", () => {
    contexte.choisirMention(choixMention.value);
  });
  const champNom = balise("label", [["class", "cf"]]);
  champNom.append(balise("span", [], "Diplôme"), choixNom);
  const champMention = balise("label", [["class", "cf"]]);
  champMention.append(balise("span", [], "Mention"), choixMention);
  const version = contexte.versionActive;
  const etat =
    version === null
      ? balise("span", [["class", "vst draft"]], "Référentiel non validé")
      : balise(
          "span",
          [["class", `vst ${contexte.aJour ? "ok" : "mod"}`]],
          `${contexte.aJour ? "Version du " : "Modifié depuis la version du "}${dateEnLettres(version.date)}`,
        );
  barre.append(champNom, champMention, etat);
  return barre;
}

function tuile(contexte: ContexteHabillage, sorte: string, libelle: string, compte: string, choix: readonly { v: string; t: string }[]): HTMLElement {
  const active = contexte.filtre.kind === sorte;
  const cadre = balise("div", [["class", `tile ${active ? "on" : ""}`]]);
  const liste = balise("select", [
    ["class", "tsel"],
    ["data-f", sorte],
    ["aria-label", `Filtrer par ${libelle}`],
  ]);
  liste.append(balise("option", [["value", ""], ["hidden", ""], ...(active ? [] : [["selected", ""] as const])], compte));
  if (active) liste.append(balise("option", [["value", ""]], "Tout afficher"));
  for (const option of choix) {
    liste.append(balise("option", [["value", option.v], ...(active && contexte.filtre.value === option.v ? [["selected", ""] as const] : [])], option.t));
  }
  liste.addEventListener("change", () => {
    contexte.filtrer(sorte, liste.value);
  });
  cadre.append(balise("span", [["class", "k"]], libelle), " ", liste);
  return cadre;
}

function tuiles(contexte: ContexteHabillage): HTMLElement {
  const cadre = balise("div", [["class", "tiles"]]);
  cadre.append(
    tuile(
      contexte,
      "ue",
      "Unités d'enseignement",
      `${String(contexte.ues.length)} UE`,
      contexte.ues.map((ue) => ({ v: affiche(ue.nom), t: affiche(ue.nom) })),
    ),
    tuile(
      contexte,
      "ec",
      "Enseignements constitutifs",
      `${String(contexte.ecs.length)} EC`,
      contexte.ecs.map((ec) => ({ v: affiche(ec.id), t: `${nomEc(ec)} · ${codesEc(ec).join(" · ") || "—"}` })),
    ),
    tuile(
      contexte,
      "bloc",
      "Blocs",
      `${String(contexte.blocs.length)} blocs`,
      contexte.blocs.map((bloc) => ({ v: affiche(bloc.num), t: `${brut(bloc.num)} - ${brut(bloc.nom)}` })),
    ),
    tuile(
      contexte,
      "comp",
      "Compétences",
      `${String(contexte.competences.length)} compétences`,
      contexte.competences.map((competence) => ({ v: affiche(competence.code), t: `${brut(competence.libelle).slice(0, 64)} — ${brut(competence.code)}` })),
    ),
  );
  return cadre;
}

function barreVues(contexte: ContexteHabillage): HTMLElement {
  const barre = balise("div", [
    ["class", "subnav"],
    ["style", "margin:2px 0 0"],
  ]);
  for (const [vue, libelle] of [
    ["radial", "Carte radiale"],
    ["chain", "Carte heuristique"],
    ["table", "Tableau EC × semestres"],
    ["tablec", "Tableau compétences × semestres"],
    ["search", "Recherche"],
  ] as const) {
    const bouton = balise(
      "button",
      [
        ["type", "button"],
        ["data-view", vue],
        ["aria-pressed", String(contexte.vue === vue)],
      ],
      libelle,
    );
    bouton.addEventListener("click", () => {
      contexte.choisirVue(vue);
    });
    barre.append(bouton);
  }
  const aide = bulleAide(AIDES[contexte.vue] ?? AIDES.radial ?? "");
  aide.className = "help rt";
  barre.append(aide);
  return barre;
}

/** Cadre de la carte radiale : boutons de zoom et encadré d'information autour du dessin, inchangé. */
function cadreRadial(contexte: ContexteHabillage): HTMLElement {
  const enveloppe = balise("div", [["class", "radwrap"]]);
  const colonne = balise("div", [["class", "radcol"]]);
  const zoom = balise("div", [
    ["class", "radzoom"],
    ["role", "group"],
    ["aria-label", "Zoom de la carte"],
  ]);
  zoom.append(
    balise(
      "button",
      [
        ["type", "button"],
        ["class", "btn ghost"],
        ["data-rz", "-1"],
        ["aria-label", "Dézoomer"],
        ["title", "Dézoomer (−)"],
      ],
      "−",
    ),
    balise("output", [["aria-live", "polite"]]),
    balise(
      "button",
      [
        ["type", "button"],
        ["class", "btn ghost"],
        ["data-rz", "1"],
        ["aria-label", "Zoomer"],
        ["title", "Zoomer (+)"],
      ],
      "+",
    ),
    balise(
      "button",
      [
        ["type", "button"],
        ["class", "btn ghost"],
        ["data-rz", "0"],
        ["title", "Revenir à la vue de départ (0)"],
      ],
      "Ajuster",
    ),
  );
  const dessin = balise("div", [["class", "radcadre"]]);
  dessin.append(fragment(contexte.carteRadiale()));
  colonne.append(zoom, dessin);
  enveloppe.append(
    colonne,
    balise("div", [
      ["class", "radinfo"],
      ["id", "radInfo"],
    ]),
  );
  return enveloppe;
}

function enteteAnnees(titre: string, derniere: string, contexte: ContexteHabillage): HTMLElement {
  const thead = balise("thead");
  const rang1 = balise("tr");
  rang1.append(
    balise(
      "th",
      [
        ["class", "st"],
        ["rowspan", "2"],
      ],
      titre,
    ),
  );
  for (const annee of ANNEES) {
    rang1.append(
      balise(
        "th",
        [
          ["colspan", "2"],
          ["class", "an"],
        ],
        `Année ${String(annee)} · ${contexte.codeAnnee(annee)}`,
      ),
    );
  }
  rang1.append(
    balise(
      "th",
      [
        ["class", "n"],
        ["rowspan", "2"],
      ],
      derniere,
    ),
  );
  const rang2 = balise("tr");
  for (const semestre of SEMESTRES) rang2.append(balise("th", [], semestre));
  thead.append(rang1, rang2);
  return thead;
}

function tableauEcs(contexte: ContexteHabillage): HTMLElement {
  const nombreCompetences = (ids: readonly unknown[]): number =>
    contexte.competencesVue.filter((competence) => (Array.isArray(competence.ecIds) ? (competence.ecIds as unknown[]) : []).some((id) => ids.includes(id))).length;
  const tableau = balise("table", [["class", "mx"]]);
  const corps = balise("tbody");
  for (const groupe of contexte.groupesTableau) {
    const bande = balise("tr", [
      ["class", "band"],
      ["style", `--c:${couleur(groupe.ue.couleur)}`],
    ]);
    const tete = balise("th", [["colspan", String(SEMESTRES.length + 2)]]);
    const nomUe = affiche(groupe.ue.nom);
    const boutonUe = balise(
      "button",
      [
        ["type", "button"],
        ["class", "bandbtn"],
        ["data-mapue", nomUe],
      ],
      nomUe,
    );
    boutonUe.addEventListener("click", () => {
      contexte.rechercher(nomUe, true);
    });
    tete.append(
      boutonUe,
      " ",
      balise("span", [["class", "n"]], `${String(groupe.ecs.length)} EC · ${String(groupe.competences)} compétences`),
    );
    bande.append(tete);
    corps.append(bande);
    for (const ec of groupe.ecs) {
      const ligne = balise("tr", [["style", `--c:${couleur(ec.couleur)}`]]);
      const nom = nomEc(ec);
      const entete = balise("th", [["class", "st"]]);
      const boutonEc = balise(
        "button",
        [
          ["type", "button"],
          ["class", "matbtn"],
          ["data-mapec", nom],
        ],
        nom,
      );
      boutonEc.addEventListener("click", () => {
        contexte.allerALEc(nom);
      });
      entete.append(balise("span", [["class", "dot"]]), boutonEc);
      ligne.append(entete);
      for (const case_ of casesEc(ec)) {
        if (case_.semestres.length === 0) {
          const cellule = balise("td");
          cellule.append(videCase());
          ligne.append(cellule);
          continue;
        }
        const premier = case_.semestres[0] ?? "";
        const cellule = balise("td", case_.semestres.length > 1 ? [["colspan", String(case_.semestres.length)]] : []);
        const bouton = balise(
          "button",
          [
            ["type", "button"],
            ["class", "ecc"],
            ["data-mapec", nom],
            ["style", `--c:${couleur(ec.couleur)}`],
            ["title", `${case_.semestres.join(" ")} · ${nom}`],
          ],
          (codeAuSemestre(ec, premier) || premier).replace(/^EC\s*/, ""),
        );
        bouton.addEventListener("click", () => {
          contexte.allerALEc(nom);
        });
        cellule.append(bouton);
        ligne.append(cellule);
      }
      ligne.append(balise("td", [["class", "n"]], String(nombreCompetences([ec.id]))));
      corps.append(ligne);
    }
  }
  tableau.append(enteteAnnees("Enseignement constitutif", "Compétences", contexte), corps);
  const cadre = balise("div", [["class", "tw"]]);
  cadre.append(tableau);
  return cadre;
}

function tableauCompetences(contexte: ContexteHabillage, filtre: { readonly kind: string; readonly value: string }): HTMLElement {
  const competences = competencesTableau(contexte.competences, filtre);
  if (competences.length === 0) return balise("div", [["class", "empty"]], "Aucune compétence ne correspond au filtre.");
  const tableau = balise("table", [["class", "mx"]]);
  const corps = balise("tbody");
  for (const bloc of blocsTableau(competences)) {
    const bande = balise("tr", [
      ["class", "band"],
      ["style", `--c:${contexte.teinteBlocs}`],
    ]);
    const tete = balise("th", [["colspan", String(SEMESTRES.length + 2)]], titreBloc(bloc.num, contexte.nomBloc(bloc.num)));
    tete.append(" ", balise("span", [["class", "n"]], `${String(bloc.competences.length)} compétence${bloc.competences.length > 1 ? "s" : ""}`));
    bande.append(tete);
    corps.append(bande);
    for (const competence of bloc.competences) {
      const porteurs = Array.isArray(competence.ecs) ? (competence.ecs as Element[]) : [];
      const ligne = balise("tr", [["style", `--c:${contexte.teinteBlocs}`]]);
      const code = texte(competence.code);
      const entete = balise("th", [["class", "st cmp"]]);
      const bouton = balise("button", [
        ["type", "button"],
        ["class", "matbtn"],
        ["data-mapcomp", code],
      ]);
      bouton.append(balise("b", [], code), " ", balise("span", [], texte(competence.libelle)));
      bouton.addEventListener("click", () => {
        contexte.rechercher(code, false);
      });
      entete.append(bouton);
      ligne.append(entete);
      for (const semestre of SEMESTRES) {
        const cellule = balise("td");
        const codes = ecsAuSemestre(competence, semestre);
        if (codes.length === 0) cellule.append(videCase());
        for (const codeEc of codes) {
          const porteur = porteurs.find((candidat) => candidat.ec === codeEc) ?? {};
          const nom = texte(porteur.nom);
          const pastille = balise(
            "button",
            [
              ["type", "button"],
              ["class", "ecc"],
              ["data-mapec", nom || codeEc],
              ["style", `--c:${texte(porteur.couleur) || contexte.couleurEc(codeEc)}`],
              ["title", `${codeEc} · ${nom}`],
            ],
            codeEc.replace(/^EC\s*/, ""),
          );
          pastille.addEventListener("click", () => {
            contexte.allerALEc(nom || codeEc);
          });
          cellule.append(pastille);
        }
        ligne.append(cellule);
      }
      ligne.append(balise("td", [["class", "n"]], String(new Set(porteurs.map((porteur) => porteur.ec)).size)));
      corps.append(ligne);
    }
  }
  tableau.append(enteteAnnees("Compétence", "EC", contexte), corps);
  const cadre = balise("div", [["class", "tw"]]);
  cadre.append(tableau);
  return cadre;
}
