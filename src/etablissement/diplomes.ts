// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement > Diplômes et mentions : nom et durée de chaque diplôme,
 * ses mentions et leur code, la mention dont on règle le référentiel, et les
 * années et niveaux d'acquisition. Les règles sont dans `domaine/diplomes` ;
 * la recopie du référentiel d'une mention reste faite par l'interface
 * historique, qui la fournit.
 */
import { codeAutomatique, codeDiplome, grouperDiplomes, libelleDiplome, nouveauDiplome, supprimerDiplome, type GroupeDiplome } from "../domaine/diplomes";
import { balise, boutonAction, boutonSupprimer, champLigne, ligneEditeur, panneauEditeur, type Armement } from "./editeur-commun";

type Diplome = Record<string, unknown>;

/** Les données de « Mon établissement » que le volet lit et modifie sur place. */
export interface DonneesDiplomes {
  diplomes: Diplome[];
  refs?: Record<string, unknown>;
  activeDiplome?: unknown;
  niveaux?: Record<string, unknown>[];
}

/** Ce que l'interface confie au volet « Diplômes et mentions ». */
export interface ContexteDiplomes {
  readonly donnees: DonneesDiplomes;
  /** Diplômes montrés à l'enseignant (sans le cadre vierge d'une installation neuve). */
  readonly visibles: readonly Diplome[];
  estCadreVierge(id: unknown): boolean;
  nouvelIdentifiant(): string;
  /** Ajoute une mention au diplôme ; son référentiel recopie celui de la mention source. */
  ajouterMention(idSource: unknown, nomDiplome: string): Diplome;
  /** Enregistre ; `redessiner` à faux pendant la frappe, pour garder le curseur. */
  enregistrer(redessiner: boolean): void;
  /** Après un changement de durée : les promotions recomposent leur nom. */
  apresChangementDuree(): void;
  readonly armement: Armement;
  annoncer(texte: string): void;
}

const CSS = "grid-template-columns:minmax(0,1fr) 110px 100px";
const AIDE =
  "Un diplôme peut porter plusieurs mentions : « + Mention » ajoute une mention dont le référentiel reprend celui de la mention précédente, avec les mêmes éléments, pour que vous n'ayez qu'à ajuster les variations (Référentiel > Constituer, une fois la mention active). Chaque mention a son propre référentiel : la mention active commande tout le reste, ce qui n'est retenu que dans les autres mentions n'apparaît ni dans les évaluations ni dans la carte. Le code se compose tout seul (deux lettres du diplôme, une de la mention, sans séparateur : DN MADE mention Objet donne DNO) et sert à nommer les classes et les années (DNO1, DNO2…) — laissez-le vide pour qu'il suive, ou écrivez le vôtre.";
const AUCUN_DIPLOME = "Aucun diplôme : recevez un référentiel avec « Échanger… > Recevoir », ou créez-en un avec « + Nouveau diplôme ».";

function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" ? String(valeur) : "";
}

function pluriel(nombre: number, mot: string): string {
  return `${String(nombre)} ${mot}${nombre > 1 ? "s" : ""}`;
}

function option(valeur: string, libelle: string, choisie: boolean): HTMLOptionElement {
  return balise("option", [["value", valeur], ...(choisie ? [["selected", ""] as const] : [])], libelle);
}

export function peindreDiplomes(hote: HTMLElement, contexte: ContexteDiplomes): void {
  const { donnees, visibles } = contexte;
  const groupes = grouperDiplomes(visibles, donnees.diplomes);
  const lignes: Node[] = groupes.map((groupe, rangGroupe) => blocDiplome(hote, contexte, groupe, rangGroupe, visibles.length));
  if (lignes.length === 0) lignes.push(balise("div", [["class", "empty"]], AUCUN_DIPLOME));
  const ajouter = boutonAction("+ Nouveau diplôme", "edAdd", () => {
    const diplome = nouveauDiplome(donnees.diplomes, (id) => contexte.estCadreVierge(id), () => contexte.nouvelIdentifiant());
    donnees.activeDiplome = diplome.id;
    contexte.enregistrer(true);
    contexte.annoncer("Diplôme ajouté — son référentiel est vide");
  });
  const panneaux: Node[] = [
    panneauEditeur({
      titre: "Diplômes et mentions",
      compte: pluriel(visibles.length, "mention"),
      actions: [ajouter],
      entete: { css: CSS, cellules: ["Mention", "Code", ""] },
      lignes,
      aide: AIDE,
    }),
  ];
  if (visibles.length > 0) panneaux.push(reglagesReferentiel(contexte));
  hote.replaceChildren(...panneaux);
}

/** Un diplôme : son nom, sa durée, ses mentions. */
function blocDiplome(hote: HTMLElement, contexte: ContexteDiplomes, groupe: GroupeDiplome, rangGroupe: number, nombreVisibles: number): HTMLElement {
  const { donnees } = contexte;
  const bloc = balise("div", [["class", "dgrp"]]);
  const tete = balise("div", [["class", "hd"]]);
  const nom = balise("input", [
    ["type", "text"],
    ["value", groupe.nom],
    ["data-dgn", String(rangGroupe)],
    ["placeholder", "DN MADE"],
    ["aria-label", "Nom du diplôme"],
  ]);
  nom.addEventListener("input", () => {
    for (const { diplome } of groupe.mentions) diplome.nom = nom.value;
    groupe.nom = nom.value;
    contexte.enregistrer(false);
    for (const { diplome, rang } of groupe.mentions) {
      const code = hote.querySelector<HTMLInputElement>(`[data-dc="${String(rang)}"]`);
      if (code !== null) code.placeholder = codeAutomatique(diplome) || "DNO";
    }
  });
  const duree = balise("select", [
    ["data-dgd", String(rangGroupe)],
    ["aria-label", "Durée du diplôme"],
    ["style", "width:auto"],
  ]);
  const dureeActuelle = Number(groupe.mentions[0]?.diplome.duree) || 3;
  for (const annees of [1, 2, 3, 4, 5]) {
    duree.append(option(String(annees), `${pluriel(annees, "an")} · ${String(2 * annees)} sem.`, annees === dureeActuelle));
  }
  duree.addEventListener("change", () => {
    for (const { diplome } of groupe.mentions) diplome.duree = Number(duree.value);
    contexte.enregistrer(true);
    contexte.apresChangementDuree();
  });
  const ajouterMention = balise(
    "button",
    [
      ["class", "btn ghost"],
      ["data-dgadd", String(rangGroupe)],
    ],
    "+ Mention",
  );
  ajouterMention.addEventListener("click", () => {
    const source = groupe.mentions[groupe.mentions.length - 1]?.diplome;
    if (source === undefined) return;
    const mention = contexte.ajouterMention(source.id, groupe.nom);
    mention.duree = Number(source.duree) || 3;
    donnees.activeDiplome = mention.id;
    contexte.enregistrer(true);
    contexte.annoncer(`Mention ajoutée à ${groupe.nom || "ce diplôme"} — référentiel recopié`);
    document.querySelector<HTMLElement>(`[data-dm="${String(donnees.diplomes.indexOf(mention))}"]`)?.focus();
  });
  tete.append(
    balise("span", [["class", "lab"]], "Diplôme"),
    nom,
    balise(
      "label",
      [
        ["class", "lab"],
        ["style", "margin-left:6px"],
      ],
      "Durée",
    ),
    duree,
    balise("span", [["class", "count"]], pluriel(groupe.mentions.length, "mention")),
    ajouterMention,
  );
  bloc.append(tete);
  for (const { diplome, rang } of groupe.mentions) {
    const code = champLigne(
      [
        ["value", texte(diplome.code)],
        ["data-dc", String(rang)],
        ["placeholder", codeAutomatique(diplome) || "DNO"],
        ["aria-label", "Code"],
        ["class", "mono"],
      ],
      (valeur) => {
        const cible = donnees.diplomes[rang];
        if (cible === undefined) return;
        cible.code = valeur;
        contexte.enregistrer(false);
      },
    );
    const mention = champLigne(
      [
        ["value", texte(diplome.mention)],
        ["data-dm", String(rang)],
        ["placeholder", "Objet"],
        ["aria-label", "Mention"],
      ],
      (valeur) => {
        const cible = donnees.diplomes[rang];
        if (cible === undefined) return;
        cible.mention = valeur;
        contexte.enregistrer(false);
        const champCode = hote.querySelector<HTMLInputElement>(`[data-dc="${String(rang)}"]`);
        if (champCode !== null) champCode.placeholder = codeAutomatique(cible) || "DNO";
      },
    );
    const retrait =
      nombreVisibles > 1
        ? boutonSupprimer(`dip${String(rang)}`, "Supprimer", contexte.armement, () => {
            supprimerDiplome(donnees, rang);
            contexte.enregistrer(true);
          })
        : balise("span", [["class", "hint"]], "—");
    bloc.append(ligneEditeur(CSS, [mention, code, retrait]));
  }
  return bloc;
}

/** Mention dont on règle le référentiel, et identifiant et libellé de chaque année. */
function reglagesReferentiel(contexte: ContexteDiplomes): HTMLElement {
  const { donnees, visibles } = contexte;
  const panneau = balise("div", [
    ["class", "panel"],
    ["style", "max-width:720px;margin-top:18px"],
  ]);
  const tete = balise("div", [["class", "pick-head"]]);
  tete.append(balise("h3", [], "Réglages du référentiel"));
  if (visibles.length > 1) {
    const active = balise("select", [
      ["id", "edDipAct"],
      ["aria-label", "Mention dont on règle le référentiel"],
      ["style", "width:auto;margin-left:auto"],
    ]);
    for (const diplome of visibles) active.append(option(texte(diplome.id), libelleDiplome(diplome), diplome.id === donnees.activeDiplome));
    active.addEventListener("change", () => {
      donnees.activeDiplome = active.value;
      contexte.enregistrer(true);
    });
    tete.append(active);
  } else {
    tete.append(
      balise(
        "span",
        [
          ["class", "hint"],
          ["style", "margin-left:auto"],
        ],
        libelleDiplome(visibles[0]),
      ),
    );
  }
  const corps = balise("div", [["class", "panel-body"]]);
  const champ = balise("div", [["class", "field"]]);
  champ.append(
    balise("label", [], "Années et niveaux d'acquisition"),
    balise(
      "div",
      [
        ["class", "hint"],
        ["style", "margin:0 0 6px"],
      ],
      "L'identifiant d'une année suit le code du diplôme (DNO1, DNO2…) — laissez-le vide pour qu'il suive, ou écrivez le vôtre.",
    ),
  );
  const actif = donnees.diplomes.find((diplome) => diplome.id === donnees.activeDiplome) ?? {};
  (donnees.niveaux ?? []).forEach((niveau, rang) => {
    const ligne = balise("div", [["class", "lv"]]);
    ligne.append(
      balise(
        "span",
        [
          ["class", "num"],
          ["style", "width:62px"],
        ],
        `Année ${texte(niveau.annee)}`,
      ),
      champLigne(
        [
          ["data-nvc", String(rang)],
          ["value", texte(niveau.code)],
          ["placeholder", codeDiplome(actif) + texte(niveau.annee)],
          ["style", "flex:0 1 90px"],
          ["aria-label", "Identifiant de l'année"],
          ["class", "mono"],
        ],
        (valeur) => {
          const cible = donnees.niveaux?.[rang];
          if (cible === undefined) return;
          cible.code = valeur;
          contexte.enregistrer(false);
        },
      ),
      champLigne(
        [
          ["data-nvl", String(rang)],
          ["value", texte(niveau.label)],
          ["aria-label", "Libellé du niveau d'acquisition"],
        ],
        (valeur) => {
          const cible = donnees.niveaux?.[rang];
          if (cible === undefined) return;
          cible.label = valeur;
          contexte.enregistrer(false);
        },
      ),
    );
    champ.append(ligne);
  });
  corps.append(champ);
  panneau.append(tete, corps);
  return panneau;
}
