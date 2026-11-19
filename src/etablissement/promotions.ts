// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement > Promotions : diplôme et mention, année de début, état
 * à l'année scolaire, et, avec le module Étudiants, la liste des étudiants
 * de chaque promotion. Les règles sont dans `domaine/promotions` ; le nom
 * automatique, l'année de formation et le nom court sont calculés par
 * `interface/promotions-calendrier`, et fournis par `interface/etablissement`.
 */
import { MODULES } from "../domaine/modules";
import { completerPersonne, composerNom } from "../domaine/personnes";
import { ajouterEtudiants, deplacerEtudiant, etatPromotion, ordrePromotions, rafraichirListe, retirerEtudiant } from "../domaine/promotions";
import { balise, boutonAction, boutonSupprimer, champLigne, ligneEditeur, panneauEditeur, type Armement } from "./editeur-commun";

type Promotion = Record<string, unknown>;

/** Ce que l'interface confie au volet « Promotions ». */
export interface ContextePromotions {
  /** Les promotions, modifiées sur place. */
  promotions(): Promotion[];
  /** Identifiants de tous les diplômes, dans leur ordre. */
  readonly ordreDiplomes: readonly string[];
  /** Diplômes et mentions proposés (sans le cadre vierge d'une installation neuve). */
  readonly diplomes: readonly { readonly id: string; readonly libelle: string }[];
  /** « DN MADE mention Objet », pour tout diplôme, même caché. */
  libelleDiplome(id: unknown): string;
  /** Année scolaire affichée, « 2026-2027 ». */
  readonly anneeScolaire: string;
  readonly moduleEleves: boolean;
  /** Promotion dont la liste des étudiants est ouverte, ou chaîne vide. */
  readonly ouverte: string;
  basculer(id: string): void;
  /** Année de formation de la promotion à l'année scolaire affichée (0 avant l'entrée). */
  anneeFormation(promotion: Promotion): number;
  /** Durée du diplôme de la promotion, en années. */
  duree(promotion: Promotion): number;
  /** Nom court en cours (DNO2…), ou chaîne vide. */
  nomCourt(promotion: Promotion): string;
  /** Recompose le nom automatique de la promotion (DNO-2025-2028). */
  renommer(promotion: Promotion): void;
  /** Crée une promotion de la mention active, l'enregistre et redessine ; rend son identifiant. */
  ajouterPromotion(): string;
  /** Retire la promotion, et de l'évaluation en cours si elle y était choisie. */
  supprimerPromotion(id: string): void;
  nouvelIdentifiantEtudiant(): string;
  enregistrer(): void;
  redessiner(): void;
  readonly armement: Armement;
  annoncer(texte: string): void;
}

const AIDE =
  "Une promotion suit un groupe d'un diplôme et d'une mention de son entrée à sa sortie. Choisissez d'abord le diplôme et la mention, puis l'année de début : le nom se compose seul avec le code du diplôme, l'année de début et l'année de fin, qui dépend de la durée du diplôme (Diplômes et mentions) — DNO-2025-2028 pour un DN MADE mention Objet en trois ans commencé en 2025. L'année de formation se déduit de l'année scolaire, et l'étape 1 de l'évaluation propose les promotions de la mention active.";
const AIDE_ETUDIANTS =
  " Ouvrez « étudiants » pour gérer la liste : renommer, retirer, ajouter plusieurs noms d'un coup, ou faire passer un étudiant dans une autre promotion, y compris d'une autre mention. Ses résultats déjà saisis restent attachés aux évaluations de son ancienne promotion.";
// Le nom du module vient du catalogue : l'aide suit un changement de nom.
export const AIDE_SANS_ETUDIANTS = ` Le module « ${MODULES.eleves?.nom ?? "Étudiants"} » (Paramètres) permet en plus de gérer la liste des étudiants de chaque promotion.`;
const CSS_ETUDIANT = "grid-template-columns:minmax(0,1fr) minmax(0,1fr) 300px 92px";
const INVITATION_AJOUT =
  "Ajouter des étudiants — un par ligne : prénom puis nom, ou deux colonnes Prénom / Nom collées d'un tableur";

function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" ? String(valeur) : "";
}

function etudiantsDe(promotion: Promotion): Record<string, unknown>[] {
  return Array.isArray(promotion.liste) ? (promotion.liste as Record<string, unknown>[]) : [];
}

function option(valeur: string, libelle: string, choisie: boolean): HTMLOptionElement {
  return balise("option", [["value", valeur], ...(choisie ? [["selected", ""] as const] : [])], libelle);
}

export function peindrePromotions(hote: HTMLElement, contexte: ContextePromotions): void {
  const toutes = contexte.promotions();
  const rangees = ordrePromotions(toutes, contexte.ordreDiplomes);
  const css = `grid-template-columns:240px 92px minmax(0,1fr) 118px${contexte.moduleEleves ? " 120px" : ""} 92px`;
  const trouver = (id: string): Promotion | undefined => contexte.promotions().find((promotion) => promotion.id === id);

  /** Promotions où faire passer un étudiant, groupées par diplôme et mention. */
  const choixPromotion = (courante: string): HTMLOptGroupElement[] =>
    contexte.diplomes.flatMap((diplome) => {
      const duDiplome = rangees.filter((promotion) => promotion.diplomeId === diplome.id);
      if (duDiplome.length === 0) return [];
      const groupe = balise("optgroup", [["label", diplome.libelle]]);
      for (const promotion of duDiplome) {
        const id = texte(promotion.id);
        groupe.append(option(id, texte(promotion.nom) || "Sans nom", id === courante));
      }
      return [groupe];
    });

  const lignes: Node[] = [];
  for (const promotion of rangees) {
    const id = texte(promotion.id);
    const etudiants = etudiantsDe(promotion);
    const nombre = etudiants.length;
    const ouverte = contexte.moduleEleves && contexte.ouverte === id;

    const diplome = balise("select", [
      ["data-pd", id],
      ["aria-label", "Diplôme et mention"],
    ]);
    for (const candidat of contexte.diplomes) diplome.append(option(candidat.id, candidat.libelle, candidat.id === promotion.diplomeId));
    diplome.addEventListener("change", () => {
      promotion.diplomeId = diplome.value;
      contexte.renommer(promotion);
      contexte.enregistrer();
      contexte.redessiner();
    });

    const debut = balise("input", [
      ["type", "number"],
      ["min", "2000"],
      ["max", "2100"],
      ["value", texte(promotion.debut)],
      ["data-py", id],
      ["class", "mono"],
      ["aria-label", "Année de début"],
    ]);
    debut.addEventListener("change", () => {
      const annee = Number.parseInt(debut.value, 10);
      if (!annee) return;
      promotion.debut = annee;
      contexte.renommer(promotion);
      contexte.enregistrer();
      contexte.redessiner();
    });

    const cellules: Node[] = [
      diplome,
      debut,
      balise(
        "span",
        [
          ["class", "ro mono"],
          ["title", `Code du diplôme · début · fin (${String(contexte.duree(promotion))} ans)`],
        ],
        texte(promotion.nom),
      ),
      balise("span", [["class", "num"]], etatPromotion(contexte.anneeFormation(promotion), contexte.duree(promotion), contexte.nomCourt(promotion))),
    ];
    if (contexte.moduleEleves) {
      const bascule = balise(
        "button",
        [
          ["class", "btn ghost"],
          ["data-po", id],
          ["aria-expanded", String(ouverte)],
        ],
        `${String(nombre)} étudiant${nombre > 1 ? "s" : ""} ${ouverte ? "▴" : "▾"}`,
      );
      bascule.addEventListener("click", () => {
        contexte.basculer(id);
      });
      cellules.push(bascule);
    }
    cellules.push(
      boutonSupprimer(`pr${id}`, "Supprimer", contexte.armement, () => {
        contexte.supprimerPromotion(id);
        contexte.enregistrer();
        contexte.redessiner();
      }),
    );
    lignes.push(ligneEditeur(css, cellules));
    if (ouverte) lignes.push(detailEtudiants(contexte, promotion, id, etudiants, choixPromotion, trouver));
  }

  const ajouter = boutonAction("+ Promotion", "prAdd", () => {
    const nouvelle = contexte.ajouterPromotion();
    hote.querySelector<HTMLElement>(`[data-pd="${nouvelle}"]`)?.focus();
  });
  hote.replaceChildren(
    panneauEditeur({
      titre: "Promotions",
      compte: String(toutes.length),
      actions: [ajouter],
      entete: {
        css,
        cellules: ["Diplôme · mention", "Début", "Promotion", `En ${contexte.anneeScolaire}`, ...(contexte.moduleEleves ? ["Étudiants"] : []), ""],
      },
      lignes,
      aide: AIDE + (contexte.moduleEleves ? AIDE_ETUDIANTS : AIDE_SANS_ETUDIANTS),
    }),
  );
}

/** Liste des étudiants d'une promotion ouverte : renommer, changer de promotion, retirer, ajouter. */
function detailEtudiants(
  contexte: ContextePromotions,
  promotion: Promotion,
  id: string,
  etudiants: Record<string, unknown>[],
  choixPromotion: (courante: string) => HTMLOptGroupElement[],
  trouver: (id: string) => Promotion | undefined,
): HTMLElement {
  const detail = balise("div", [["class", "pdet"]]);
  for (const etudiant of etudiants) {
    const idEtudiant = texte(etudiant.id);
    const cle = `${id}|${idEtudiant}`;
    const renommer = (champ: "prenom" | "nomFam", valeur: string): void => {
      const cible = etudiantsDe(promotion).find((candidat) => candidat.id === idEtudiant);
      if (cible === undefined) return;
      completerPersonne(cible);
      cible[champ] = valeur;
      cible.nom = composerNom(cible.prenom, cible.nomFam);
      rafraichirListe(promotion);
      contexte.enregistrer();
    };
    const destination = balise("select", [
      ["data-sm", cle],
      ["aria-label", "Promotion de l'étudiant"],
      ["title", "Changer de promotion, ou de mention"],
    ]);
    destination.append(...choixPromotion(id));
    destination.addEventListener("change", () => {
      const vers = trouver(destination.value);
      if (vers === undefined || vers === promotion) return;
      const deplace = deplacerEtudiant(promotion, vers, idEtudiant);
      if (deplace === null) return;
      contexte.enregistrer();
      contexte.redessiner();
      const autreMention = vers.diplomeId === promotion.diplomeId ? "" : ` (${contexte.libelleDiplome(vers.diplomeId)})`;
      contexte.annoncer(`${texte(deplace.nom)} → ${texte(vers.nom) || "promotion"}${autreMention}`);
    });
    detail.append(
      ligneEditeur(CSS_ETUDIANT, [
        champLigne(
          [
            ["value", completerPersonne(etudiant).prenom],
            ["data-sp", cle],
            ["placeholder", "Prénom"],
            ["aria-label", "Prénom de l'étudiant"],
          ],
          (valeur) => {
            renommer("prenom", valeur);
          },
        ),
        champLigne(
          [
            ["value", texte(etudiant.nomFam)],
            ["data-sn", cle],
            ["placeholder", "Nom"],
            ["aria-label", "Nom de l'étudiant"],
          ],
          (valeur) => {
            renommer("nomFam", valeur);
          },
        ),
        destination,
        boutonSupprimer(`st${cle}`, "Retirer", contexte.armement, () => {
          retirerEtudiant(promotion, idEtudiant);
          contexte.enregistrer();
          contexte.redessiner();
        }),
      ]),
    );
  }
  if (etudiants.length === 0) detail.append(balise("div", [["class", "empty"]], "Aucun étudiant dans cette promotion."));
  const ajout = balise("div", [["class", "padd"]]);
  const saisie = balise("textarea", [
    ["data-sa", id],
    ["rows", "2"],
    ["placeholder", INVITATION_AJOUT],
  ]);
  const bouton = balise(
    "button",
    [
      ["class", "btn ghost"],
      ["data-sab", id],
    ],
    "Ajouter",
  );
  bouton.addEventListener("click", () => {
    if (ajouterEtudiants(promotion, saisie.value, () => contexte.nouvelIdentifiantEtudiant()) === 0) return;
    contexte.enregistrer();
    contexte.redessiner();
  });
  ajout.append(saisie, bouton);
  detail.append(ajout);
  return detail;
}
