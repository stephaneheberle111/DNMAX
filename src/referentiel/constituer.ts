// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Constituer : la page qui mène les cinq étapes, comme une
 * évaluation (UE, EC, blocs et compétences, planification, validation),
 * avec le choix du diplôme et de la mention, l'état de la validation, et la
 * cinquième étape : valider une version datée, l'attester, la rétablir ou la
 * supprimer. Les règles sont dans `domaine/constituer` ; la création d'une
 * version et son rétablissement restent faits par l'interface historique.
 */
import { libelleDiplome } from "../domaine/diplomes";
import {
  competencesPlanifiees,
  etatValidation,
  mentionsDuDiplome,
  nomsDiplomes,
  sansAccents,
  type EtatValidation,
} from "../domaine/constituer";
import { balise, boutonSupprimer, type Armement } from "../etablissement/editeur-commun";

type Element = Record<string, unknown>;

/** Les cinq étapes, dans l'ordre. */
export const ETAPES_CONSTITUER = {
  ues: "Unités d'enseignement",
  ecs: "Enseignements constitutifs",
  blocs: "Blocs et compétences",
  tableau: "Planification par semestre",
  valider: "Validation",
} as const;
export type EtapeConstituer = keyof typeof ETAPES_CONSTITUER;

/** Ce que l'interface confie à la page « Constituer ». */
export interface ContextePageConstituer {
  readonly vue: { ues: Element[]; ecs: Element[]; blocs: Element[]; competences: Element[] };
  readonly diplomes: readonly Element[];
  /** Identifiant de la mention active. */
  readonly actif: unknown;
  readonly etape: EtapeConstituer;
  /** Versions du référentiel de la mention active. */
  readonly versions: readonly Element[];
  readonly versionActive: Element | null;
  /** Le référentiel est-il identique à la version en vigueur ? */
  readonly aJour: boolean;
  /** Promotions et évaluations qui suivent une version : une version utilisée ne se supprime pas. */
  usage(idVersion: unknown): { promotions: readonly string[]; evaluations: number };
  /** Date du jour, AAAA-MM-JJ, proposée pour une nouvelle version. */
  readonly aujourdhui: string;
  choisirEtape(etape: EtapeConstituer): void;
  choisirDiplome(nom: string): void;
  choisirMention(id: string): void;
  /** Dessine l'étape 1 à 4 dans la zone donnée. */
  peindreEtape(etape: EtapeConstituer, zone: HTMLElement): void;
  /** Crée et valide une version datée (l'attestation a été cochée). */
  valider(date: string, note: string): void;
  /** Atteste une version déjà enregistrée (l'attestation a été cochée). */
  attester(idVersion: unknown): void;
  retablir(idVersion: unknown): void;
  /** Supprime la version au rang donné, puis enregistre et redessine. */
  supprimerVersion(rang: number): void;
  readonly armement: Armement;
  annoncer(texte: string): void;
}

function texte(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  return typeof valeur === "number" && valeur !== 0 ? String(valeur) : "";
}

/** « 1 septembre 2026 » ; une date illisible reste telle quelle. */
export function dateEnLettres(date: unknown): string {
  const jour = new Date(`${String(date)}T12:00:00`);
  return Number.isNaN(jour.getTime()) ? String(date) : jour.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function longueur(liste: unknown): number {
  return Array.isArray(liste) ? liste.length : 0;
}

/** Pastille de l'état de la validation, en tête de page et du panneau de validation. */
function pastilleEtat(etat: EtatValidation, version: Element | null): HTMLElement {
  const date = dateEnLettres(version?.date);
  if (etat === "jamais") return balise("span", [["class", "vst draft"]], "Jamais validé — brouillon");
  if (etat === "a-verifier") {
    return balise(
      "span",
      [
        ["class", "vst mod"],
        ["style", "white-space:nowrap"],
      ],
      "À vérifier et valider",
    );
  }
  if (etat === "a-jour") return balise("span", [["class", "vst ok"]], `À jour · version du ${date}`);
  return balise("span", [["class", "vst mod"]], `Modifié depuis la version du ${date}`);
}

/** Un texte suivi d'un complément en italique, comme les résumés sous chaque étape. */
function morceaux(...parties: readonly (string | readonly [string])[]): Node[] {
  return parties.map((partie) => (typeof partie === "string" ? document.createTextNode(partie) : balise("em", [], partie[0])));
}

function pluriel(nombre: number, mot: string): string {
  return `${mot}${nombre > 1 ? "s" : ""}`;
}

function resumeEtape(etape: EtapeConstituer, contexte: ContextePageConstituer, etat: EtatValidation, planifiees: number): Node[] {
  const { vue } = contexte;
  if (etape === "ues") return morceaux(`${String(vue.ues.length)} `, [pluriel(vue.ues.length, "UE retenue")]);
  if (etape === "ecs") {
    const sansUe = vue.ecs.filter((ec) => !ec.ueId).length;
    return morceaux(`${String(vue.ecs.length)} `, ["EC"], ...(sansUe > 0 ? [" ", [`· ${String(sansUe)} sans UE`] as const] : []));
  }
  if (etape === "blocs") {
    return morceaux(
      `${String(vue.blocs.length)} `,
      [`${pluriel(vue.blocs.length, "bloc")} ·`],
      ` ${String(vue.competences.length)} `,
      [pluriel(vue.competences.length, "compétence")],
    );
  }
  if (etape === "tableau") return morceaux(`${String(planifiees)} `, [`/ ${String(vue.competences.length)} compétences planifiées`]);
  const date = dateEnLettres(contexte.versionActive?.date);
  const libelle = { jamais: "jamais validé", "a-verifier": "à vérifier et valider", "a-jour": `à jour · ${date}`, modifie: `modifié depuis le ${date}` }[etat];
  return morceaux([libelle]);
}

export function peindrePageConstituer(hote: HTMLElement, contexte: ContextePageConstituer): void {
  const { vue } = contexte;
  const etapes = Object.keys(ETAPES_CONSTITUER) as EtapeConstituer[];
  const rangEtape = etapes.indexOf(contexte.etape);
  const courant = contexte.diplomes.find((diplome) => diplome.id === contexte.actif) ?? {};
  const etat = etatValidation(contexte.versionActive, contexte.aJour);
  const planifiees = competencesPlanifiees(vue.competences);

  const barre = balise("div", [["class", "cbar"]]);
  const choixDiplome = balise("select", [
    ["id", "cDip"],
    ["aria-label", "Diplôme"],
  ]);
  for (const nom of nomsDiplomes(contexte.diplomes)) {
    const choisie = sansAccents(nom) === sansAccents(texte(courant.nom));
    choixDiplome.append(balise("option", [["value", nom], ...(choisie ? [["selected", ""] as const] : [])], nom || "—"));
  }
  choixDiplome.addEventListener("change", () => {
    contexte.choisirDiplome(choixDiplome.value);
  });
  const choixMention = balise("select", [
    ["id", "cMen"],
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
  const champDiplome = balise("label", [["class", "cf"]]);
  champDiplome.append(balise("span", [], "Diplôme"), choixDiplome);
  const champMention = balise("label", [["class", "cf"]]);
  champMention.append(balise("span", [], "Mention"), choixMention);
  barre.append(champDiplome, champMention, pastilleEtat(etat, contexte.versionActive));

  const liste = balise("ol", [["class", "steps"]]);
  etapes.forEach((etape, rang) => {
    const bouton = balise("button", [
      ["type", "button"],
      ["data-cp", etape],
      ...(etape === contexte.etape ? [["aria-current", "true"] as const] : []),
    ]);
    const tete = balise("span", [["class", "hd"]]);
    tete.append(balise("b", [], String(rang + 1)), balise("span", [["class", "l"]], ETAPES_CONSTITUER[etape]));
    const resume = balise("span", [["class", "s"]]);
    resume.append(...resumeEtape(etape, contexte, etat, planifiees));
    bouton.append(tete, resume);
    bouton.addEventListener("click", () => {
      contexte.choisirEtape(etape);
    });
    const element = balise("li");
    element.append(bouton);
    liste.append(element);
  });

  const zone = balise("div", [["id", "cpMain"]]);
  const navigation = balise("div", [["style", "display:flex;gap:8px;justify-content:space-between;margin:16px 0 4px"]]);
  const precedente = etapes[rangEtape - 1];
  if (precedente !== undefined) {
    const bouton = balise(
      "button",
      [
        ["type", "button"],
        ["class", "btn ghost"],
        ["data-cp", precedente],
      ],
      `← ${ETAPES_CONSTITUER[precedente]}`,
    );
    bouton.addEventListener("click", () => {
      contexte.choisirEtape(precedente);
    });
    navigation.append(bouton);
  } else {
    navigation.append(balise("span"));
  }
  hote.replaceChildren(barre, liste, zone, navigation);
  if (contexte.etape === "valider") peindreValidation(zone, contexte, courant, etat, planifiees);
  else contexte.peindreEtape(contexte.etape, zone);
}

/** Étape 5 : valider une version datée, et la liste des versions. */
function peindreValidation(zone: HTMLElement, contexte: ContextePageConstituer, courant: Element, etat: EtatValidation, planifiees: number): void {
  const { vue } = contexte;
  const panneau = balise("div", [["class", "panel"]]);
  const tete = balise("div", [["class", "pick-head"]]);
  tete.append(balise("h3", [], `Valider le référentiel · ${libelleDiplome(courant)}`), pastilleEtat(etat, contexte.versionActive));
  const corps = balise("div", [
    ["class", "panel-body"],
    ["style", "display:flex;flex-direction:column;gap:12px"],
  ]);
  const chiffres = balise("div", [["style", "display:flex;gap:16px;flex-wrap:wrap;font-size:13px"]]);
  for (const [nombre, libelle] of [
    [vue.ues.length, " UE"],
    [vue.ecs.length, " EC"],
    [vue.blocs.length, " blocs"],
    [vue.competences.length, " compétences"],
    [planifiees, " planifiées sur un semestre"],
  ] as const) {
    const morceau = balise("span");
    morceau.append(balise("b", [], String(nombre)), libelle);
    chiffres.append(morceau);
  }
  corps.append(
    balise(
      "div",
      [["class", "hint"]],
      "Valider fige l'état du référentiel de cette mention à une date. À la validation, vous choisissez les promotions en cours qui passent à cette version ; les autres gardent la leur, et les évaluations déjà enregistrées restent sur le référentiel sur lequel elles ont été faites.",
    ),
    balise(
      "div",
      [["class", "hint"]],
      "Aucune évaluation ne peut être créée pour une promotion tant que son référentiel n'a pas été vérifié et validé ici. C'est l'enseignant qui est responsable du référentiel, y compris quand il est livré avec DNMAX ou reçu d'un collègue.",
    ),
    chiffres,
  );
  const nonPlanifiees = vue.competences.length - planifiees;
  if (nonPlanifiees > 0) {
    corps.append(
      balise(
        "div",
        [
          ["class", "hint"],
          ["style", "color:var(--signal)"],
        ],
        `${String(nonPlanifiees)} compétence${nonPlanifiees > 1 ? "s ne sont rattachées" : " n'est rattachée"} à aucun semestre (étape 4).`,
      ),
    );
  }
  const attestation = balise("input", [
    ["type", "checkbox"],
    ["id", "cAtteste"],
    ["aria-describedby", "cAttErr"],
  ]);
  const etiquette = balise("label", [
    ["class", "sw"],
    ["style", "align-items:flex-start;font-size:13px"],
  ]);
  etiquette.append(attestation, balise("span", [], "J'ai vérifié ce référentiel et j'en assume le contenu : l'hébergeur et le développeur de DNMAX n'en sont pas responsables."));
  const erreur = balise("div", [
    ["class", "hint"],
    ["id", "cAttErr"],
    ["role", "alert"],
    ["style", "color:var(--signal)"],
  ]);
  /** Sans l'attestation cochée, rien n'est validé. */
  const atteste = (): boolean => {
    if (attestation.checked) {
      erreur.textContent = "";
      attestation.removeAttribute("aria-invalid");
      return true;
    }
    erreur.textContent = "Cochez d'abord la case : vous attestez avoir vérifié ce référentiel et en assumer le contenu.";
    attestation.setAttribute("aria-invalid", "true");
    attestation.focus();
    return false;
  };
  attestation.addEventListener("change", () => {
    if (attestation.checked) atteste();
  });
  const ligne = balise("div", [["style", "display:flex;gap:7px;align-items:center;flex-wrap:wrap"]]);
  const date = balise("input", [
    ["type", "date"],
    ["id", "cDate"],
    ["value", contexte.aujourdhui],
    ["aria-label", "Date de la version"],
    ["style", "width:auto"],
  ]);
  const note = balise("input", [
    ["type", "text"],
    ["id", "cNote"],
    ["placeholder", "Note (facultatif)"],
    ["style", "width:auto;flex:1 1 200px"],
    ["aria-label", "Note de version"],
  ]);
  const valider = balise(
    "button",
    [
      ["class", "btn primary"],
      ["id", "cValid"],
    ],
    "Valider cette version",
  );
  valider.addEventListener("click", () => {
    if (atteste()) contexte.valider(date.value, note.value);
  });
  ligne.append(date, note, valider);
  corps.append(etiquette, erreur, ligne);
  panneau.append(tete, corps);
  zone.replaceChildren(panneau);
  if (contexte.versions.length > 0) zone.append(listeVersions(contexte, atteste));
}

function listeVersions(contexte: ContextePageConstituer, atteste: () => boolean): HTMLElement {
  const enVigueur = contexte.versionActive?.id;
  const panneau = balise("div", [
    ["class", "panel vpanel"],
    ["style", "margin-top:18px"],
  ]);
  const tete = balise("div", [["class", "pick-head"]]);
  tete.append(balise("h3", [], "Versions du référentiel"), balise("span", [["class", "count"]], String(contexte.versions.length)));
  const lignes = balise("div");
  contexte.versions.forEach((version, rang) => {
    const active = version.id === enVigueur;
    const snap = (typeof version.snap === "object" && version.snap !== null ? version.snap : {}) as Element;
    const ligne = balise("div", [["class", `vrow${active ? " on" : ""}`]]);
    ligne.append(
      balise("b", [], dateEnLettres(version.date)),
      balise(
        "span",
        [["class", "n"]],
        `${String(longueur(snap.ues))} UE · ${String(longueur(snap.ecs))} EC · ${String(longueur(snap.blocs))} blocs · ${String(longueur(snap.competences))} compétences`,
      ),
      balise("span", [["class", "note"]], texte(version.note)),
    );
    if (active) ligne.append(balise("span", [["class", "vst ok"]], "en vigueur"));
    if (texte(version.attestation) !== "") {
      ligne.append(
        balise(
          "span",
          [
            ["class", "hint"],
            ["style", "font-size:11.5px"],
          ],
          `validée par vous le ${dateEnLettres(version.attestation)}`,
        ),
      );
    } else {
      const bouton = balise(
        "button",
        [
          ["class", "btn ghost"],
          ["data-vatt", String(version.id)],
          ["title", "Cochez d'abord l'attestation ci-dessus"],
        ],
        "Valider",
      );
      bouton.addEventListener("click", () => {
        if (!atteste()) return;
        contexte.attester(version.id);
        contexte.annoncer(`Version du ${dateEnLettres(version.date)} validée par vous.`);
      });
      ligne.append(
        balise(
          "span",
          [
            ["class", "vst draft"],
            ["style", "white-space:nowrap"],
          ],
          "non validée par vous",
        ),
        bouton,
      );
    }
    const usage = contexte.usage(version.id);
    const utilisee = usage.promotions.length > 0 || usage.evaluations > 0;
    if (utilisee) {
      ligne.append(
        balise(
          "span",
          [
            ["class", "hint"],
            ["style", "font-size:11.5px;flex-basis:100%"],
          ],
          `Utilisée par ${usage.promotions.length > 0 ? usage.promotions.join(", ") : "aucune promotion"}${usage.evaluations > 0 ? ` · ${String(usage.evaluations)} évaluation${usage.evaluations > 1 ? "s" : ""}` : ""}`,
        ),
      );
    }
    if (!active || !contexte.aJour) {
      const bouton = balise(
        "button",
        [
          ["class", "btn ghost"],
          ["data-vres", String(version.id)],
        ],
        "Rétablir",
      );
      bouton.addEventListener("click", () => {
        contexte.retablir(version.id);
      });
      ligne.append(bouton);
    }
    if (!utilisee) {
      ligne.append(
        boutonSupprimer(`v${String(rang)}`, "Supprimer", contexte.armement, () => {
          contexte.supprimerVersion(rang);
        }),
      );
    }
    lignes.append(ligne);
  });
  panneau.append(tete, lignes);
  return panneau;
}
