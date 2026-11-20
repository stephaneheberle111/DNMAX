// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement : les volets « Établissement » et « Répartition de
 * service ». Les règles sont dans `domaine/etablissement` ; ce module
 * affiche et transmet.
 */
import { changerEnseignantDeLEc, DUREES_CONSERVATION, ecsSansEnseignant, libelleDuree, type Repartition } from "../domaine/etablissement";
import { creer, creerBouton } from "../ecran-echange";

/** Bulle d'aide « ? » des volets ; le texte est fixe, écrit ici, et peut contenir du gras. */
export function bulleAide(html: string): HTMLElement {
  const aide = creer("span", "help ");
  aide.tabIndex = 0;
  aide.setAttribute("role", "note");
  aide.setAttribute("aria-label", "Aide");
  const bulle = creer("span", "hbub");
  bulle.innerHTML = html;
  aide.append(bulle);
  return aide;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Ce que l'interface confie au volet « Établissement ». */
export interface ContexteEtablissement {
  /** Fiche de l'établissement, modifiée sur place à chaque saisie. */
  readonly etablissement: Record<string, unknown>;
  readonly calendrier: { readonly rentree: number; readonly bascule: number };
  enregistrer(): void;
}

function champTexte(contexte: ContexteEtablissement, cle: string, libelle: string, exemple: string, classe = "", style = ""): HTMLElement {
  const bloc = creer("div", "field");
  if (style !== "") bloc.setAttribute("style", style);
  const etiquette = creer("label", "", libelle);
  etiquette.htmlFor = `et-${cle}`;
  const champ = creer("input", classe);
  champ.type = "text";
  champ.id = `et-${cle}`;
  champ.dataset.et = cle;
  const valeur = contexte.etablissement[cle];
  champ.value = typeof valeur === "string" ? valeur : "";
  champ.placeholder = exemple;
  champ.addEventListener("input", () => {
    contexte.etablissement[cle] = champ.value;
    contexte.enregistrer();
  });
  bloc.append(etiquette, champ);
  return bloc;
}

function liste(contexte: ContexteEtablissement, cle: string, options: readonly (readonly [number, string])[], choisie: number): HTMLSelectElement {
  const choix = creer("select");
  choix.id = `et-${cle}`;
  choix.dataset.etmois = cle;
  for (const [valeur, libelle] of options) {
    const option = creer("option", "", libelle);
    option.value = String(valeur);
    option.selected = valeur === choisie;
    choix.append(option);
  }
  choix.addEventListener("change", () => {
    contexte.etablissement[cle] = Number(choix.value);
    contexte.enregistrer();
  });
  return choix;
}

function champMois(contexte: ContexteEtablissement, cle: string, libelle: string, choisi: number): HTMLElement {
  const bloc = creer("div", "field");
  const etiquette = creer("label", "", libelle);
  etiquette.htmlFor = `et-${cle}`;
  bloc.append(
    etiquette,
    liste(
      contexte,
      cle,
      MOIS.map((nom, rang) => [rang + 1, nom] as const),
      choisi,
    ),
  );
  return bloc;
}

/** Volet « Établissement » : identité, contact du délégué à la protection des données, calendrier, durée de conservation. */
export function peindreVoletEtablissement(hote: HTMLElement, contexte: ContexteEtablissement): void {
  const panneau = creer("div", "panel");
  const entete = creer("div", "pick-head");
  const titre = creer("h3", "", "Établissement");
  titre.append(
    bulleAide(
      "Le nom de l'établissement figure en tête des documents Word et Excel exportés. Avec le contact du délégué ou de la déléguée à la protection des données, il est repris dans les documents RGPD proposés à l'activation du module Étudiant·es.",
    ),
  );
  entete.append(titre);
  const grille = creer("div");
  grille.style.cssText = "padding:14px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:13px";
  const conservation = Number(contexte.etablissement.moisConservation) || 12;
  const blocConservation = creer("div", "field");
  blocConservation.style.gridColumn = "1/-1";
  const etiquetteConservation = creer("label", "", "Conservation des données d'étudiant·es après la sortie d'une promotion");
  etiquetteConservation.htmlFor = "et-moisConservation";
  blocConservation.append(
    etiquetteConservation,
    liste(
      contexte,
      "moisConservation",
      DUREES_CONSERVATION.map((mois) => [mois, libelleDuree(mois)] as const),
      conservation,
    ),
    creer("div", "hint", "À valider avec le délégué ou la déléguée à la protection des données ; les documents RGPD reprennent cette durée. 1 an par défaut."),
  );
  const note = creer(
    "div",
    "hint",
    "Le calendrier sert à proposer le semestre d'une nouvelle évaluation et à dater l'année scolaire ; le semestre choisi reste celui de l'évaluation.",
  );
  note.style.gridColumn = "1/-1";
  grille.append(
    champTexte(contexte, "nom", "Nom de l'établissement", "Lycée …"),
    champTexte(contexte, "uai", "Code UAI (RNE)", "0000000A", "mono"),
    champTexte(contexte, "ville", "Ville", ""),
    champTexte(contexte, "academie", "Académie", ""),
    champTexte(contexte, "contactDpo", "Contact du délégué ou de la déléguée à la protection des données", "Adresse électronique, téléphone ou service", "", "grid-column:1/-1"),
    champMois(contexte, "moisRentree", "Mois de la rentrée", contexte.calendrier.rentree),
    champMois(contexte, "moisBascule", "Début du second semestre", contexte.calendrier.bascule),
    blocConservation,
    note,
  );
  panneau.append(entete, grille);
  hote.replaceChildren(panneau);
}

/** Une promotion en cours, telle que la répartition la propose. */
export interface PromotionRepartie {
  readonly id: string;
  readonly court: string;
  readonly nom: string;
  readonly diplome: string;
}

/** Un EC de l'année de la promotion. */
export interface EcReparti {
  readonly id: string;
  readonly code: string;
  readonly nom: string;
  readonly couleur: string;
  readonly ue: string;
}

/** Ce que l'interface confie au volet « Répartition de service ». */
export interface ContexteRepartition {
  /** Années scolaires proposées, de la plus récente à la plus ancienne. */
  readonly annees: readonly string[];
  readonly anneeCourante: string;
  readonly annee: string;
  readonly promotions: readonly PromotionRepartie[];
  /** Promotion affichée (la première si vide). */
  readonly promotion: string;
  readonly ecs: readonly EcReparti[];
  readonly enseignants: readonly { readonly id: string; readonly nom: string }[];
  readonly repartition: Repartition;
  /** Année de formation de la promotion affichée, et ses semestres. */
  readonly anneeFormation: number;
  readonly semestres: readonly string[];
  /** Pourquoi rien n'est réparti : pas d'enseignant, ou pas de promotion en cours cette année-là. */
  readonly manque: { readonly enseignants: boolean; readonly promotions: boolean };
  nomUe(ue: string): string;
  choisirAnnee(annee: string): void;
  choisirPromotion(id: string): void;
  enregistrer(repartition: Record<string, string[]>): void;
}

function choixAnnees(contexte: ContexteRepartition): HTMLElement {
  const segments = creer("div", "seg");
  segments.style.marginLeft = "auto";
  for (const annee of [...contexte.annees].reverse()) {
    const bouton = creerBouton(`${annee}${annee === contexte.anneeCourante ? " ●" : ""}`, "", () => {
      contexte.choisirAnnee(annee);
    });
    bouton.dataset.afy = annee;
    bouton.setAttribute("aria-pressed", String(annee === contexte.annee));
    segments.append(bouton);
  }
  return segments;
}

const AIDE_REPARTITION =
  "Pour chaque promotion en cours, les enseignements constitutifs de son année dans le référentiel de sa mention, et qui les assure. À l'étape 1 d'une évaluation, choisir un·e ou plusieurs enseignant·es limite les EC proposés à ceux qu'ils ou elles assurent pour les promotions cochées.";

/** Volet « Répartition de service » : qui assure chaque EC de la promotion, pour une année scolaire. */
export function peindreRepartition(hote: HTMLElement, contexte: ContexteRepartition): void {
  const panneau = creer("div", "panel");
  const entete = creer("div", "pick-head");
  if (contexte.manque.enseignants || contexte.manque.promotions) {
    entete.append(creer("h3", "", "Répartition de service"), choixAnnees(contexte));
    const vide = creer(
      "div",
      "empty",
      `${contexte.manque.enseignants ? "Ajoutez d'abord les enseignants (volet Enseignants)." : ""} ${contexte.manque.promotions ? `Aucune promotion en ${contexte.annee} (volet Promotions).` : ""}`,
    );
    panneau.append(entete, vide);
    hote.replaceChildren(panneau);
    return;
  }
  const titre = creer("h3", "", "Répartition de service");
  titre.append(bulleAide(AIDE_REPARTITION));
  entete.append(titre, choixAnnees(contexte));

  const promotion = contexte.promotions.find((candidate) => candidate.id === contexte.promotion) ?? contexte.promotions[0];
  const choixPromotion = creer("div", "dkinds");
  choixPromotion.style.padding = "12px 14px 0";
  for (const candidate of contexte.promotions) {
    const bouton = creerBouton(candidate.court || candidate.nom, "", () => {
      contexte.choisirPromotion(candidate.id);
    });
    bouton.dataset.afp = candidate.id;
    bouton.setAttribute("aria-pressed", String(candidate.id === promotion?.id));
    bouton.title = `${candidate.nom} · ${candidate.diplome}`;
    choixPromotion.append(bouton);
  }

  const { ecs, repartition, enseignants } = contexte;
  const connus = new Set(enseignants.map((enseignant) => enseignant.id));
  const nom = (id: string): string => enseignants.find((enseignant) => enseignant.id === id)?.nom ?? "";
  const sansEnseignant = ecsSansEnseignant(
    ecs.map((ec) => ec.id),
    repartition,
    connus,
  ).length;
  const resume = creer("div", "pgsum");
  const ligneNom = creer("div");
  ligneNom.append(creer("b", "", promotion?.court || promotion?.nom || ""), ` · ${promotion?.nom ?? ""} · ${promotion?.diplome ?? ""}`);
  const ligneEtat = creer("div", "hint", `Année ${String(contexte.anneeFormation)} en ${contexte.annee} · ${contexte.semestres.join(" et ")} · ${String(ecs.length)} EC`);
  if (sansEnseignant > 0) {
    ligneEtat.append(" · ", creer("b", "", `${String(sansEnseignant)} sans enseignant·e`));
  } else {
    ligneEtat.append(" · tous attribués");
  }
  resume.append(ligneNom, ligneEtat);

  const changer = (ec: string, enseignant: string, present: boolean): void => {
    contexte.enregistrer(changerEnseignantDeLEc(repartition, ec, enseignant, present));
  };
  const blocs: HTMLElement[] = [];
  for (const ue of [...new Set(ecs.map((ec) => ec.ue))]) {
    const bloc = creer("div", "pgbloc");
    bloc.append(creer("div", "pgbh", contexte.nomUe(ue) || "Sans UE"));
    for (const ec of ecs.filter((candidat) => candidat.ue === ue)) {
      const rangee = creer("div", "afrow");
      const etiquette = creer("span", "ec");
      etiquette.style.setProperty("--c", ec.couleur);
      etiquette.append(creer("span", "k", ec.code), ec.nom);
      const charges = creer("div", "afch");
      for (const id of (repartition[ec.id] ?? []).filter((candidat) => connus.has(candidat))) {
        const pastille = creer("span", "pill afp", nom(id));
        const retirer = creerBouton("×", "", () => {
          changer(ec.id, id, false);
        });
        retirer.dataset.afrm = `${ec.id}|${id}`;
        retirer.setAttribute("aria-label", `Retirer ${nom(id)}`);
        pastille.append(retirer);
        charges.append(pastille);
      }
      const disponibles = enseignants.filter((enseignant) => !(repartition[ec.id] ?? []).includes(enseignant.id));
      if (disponibles.length > 0) {
        const ajout = creer("select");
        ajout.dataset.afadd = ec.id;
        ajout.setAttribute("aria-label", "Ajouter un·e enseignant·e");
        const invite = creer("option", "", "+ enseignant·e");
        invite.value = "";
        ajout.append(invite);
        for (const enseignant of disponibles) {
          const option = creer("option", "", enseignant.nom);
          option.value = enseignant.id;
          ajout.append(option);
        }
        ajout.addEventListener("change", () => {
          if (ajout.value !== "") changer(ec.id, ajout.value, true);
        });
        charges.append(ajout);
      }
      rangee.append(etiquette, charges);
      bloc.append(rangee);
    }
    blocs.push(bloc);
  }
  const parEnseignant = enseignants
    .map((enseignant) => ({ enseignant, charges: ecs.filter((ec) => (repartition[ec.id] ?? []).includes(enseignant.id)) }))
    .filter((ligne) => ligne.charges.length > 0);
  if (parEnseignant.length > 0) {
    const bloc = creer("div", "pgbloc");
    bloc.append(creer("div", "pgbh", "Par enseignant·e"));
    for (const { enseignant, charges } of parEnseignant) {
      const rangee = creer("div", "afrow");
      const liste = creer("div", "afch");
      for (const ec of charges) liste.append(creer("span", "pill", `${ec.code} · ${ec.nom}`));
      rangee.append(creer("b", "", enseignant.nom), liste);
      bloc.append(rangee);
    }
    blocs.push(bloc);
  }
  panneau.append(entete, choixPromotion, resume, ...blocs);
  hote.replaceChildren(panneau);
}
