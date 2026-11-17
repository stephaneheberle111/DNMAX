// SPDX-License-Identifier: CECILL-2.1
/**
 * Préférences (menu « Mon compte ») : nom du champ d'évaluation, sceau
 * DN MADE et dossier proposé à l'enregistrement. Les champs sont dans la
 * page ; ces fonctions les remplissent et les branchent. Les gestionnaires
 * sont posés par propriété : la page se redessine souvent, sans empiler
 * d'écouteurs.
 */
import { LIBELLES_PROPOSES } from "../domaine/preferences";
import { balise } from "../etablissement/editeur-commun";

const AUTRE = "__autre";

function champ(document: Document, identifiant: string): HTMLElement | null {
  return document.getElementById(identifiant);
}

function liste(document: Document, identifiant: string): HTMLSelectElement | null {
  const element = champ(document, identifiant);
  return element instanceof HTMLSelectElement ? element : null;
}

function saisie(document: Document, identifiant: string): HTMLInputElement | null {
  const element = champ(document, identifiant);
  return element instanceof HTMLInputElement ? element : null;
}

export interface ContexteVocabulaire {
  readonly libelle: string;
  /** Enregistre le nouveau nom et redessine les lignes de l'évaluation. */
  choisir(libelle: string): void;
}

export function peindreVocabulaire(document: Document, contexte: ContexteVocabulaire): void {
  const choix = liste(document, "p-critsel");
  const libre = saisie(document, "p-critlab");
  const cadre = champ(document, "p-critwrap");
  if (choix === null || libre === null || cadre === null) return;
  const personnalise = !LIBELLES_PROPOSES.includes(contexte.libelle);
  choix.replaceChildren(
    ...LIBELLES_PROPOSES.map((libelle) => balise("option", [["value", libelle], ...(!personnalise && libelle === contexte.libelle ? [["selected", ""] as const] : [])], libelle)),
    balise("option", [["value", AUTRE], ...(personnalise ? [["selected", ""] as const] : [])], "Autre…"),
  );
  cadre.hidden = !personnalise;
  libre.value = personnalise ? contexte.libelle : "";
  choix.onchange = () => {
    if (choix.value === AUTRE) {
      cadre.hidden = false;
      libre.focus();
      return;
    }
    contexte.choisir(choix.value);
    cadre.hidden = true;
  };
  libre.oninput = () => {
    contexte.choisir(libre.value);
  };
}

/** Dossier proposé par « Enregistrer sous », choisi et retenu par l'enveloppe de bureau ; absent hors de l'application de bureau. */
export interface DossierExports {
  lire(): Promise<string | null>;
  choisir(): Promise<string | null>;
  oublier(): Promise<unknown>;
}

/** Le message de l'erreur s'il en a un, sinon l'erreur elle-même (l'enveloppe rejette parfois une simple chaîne). */
function message(erreur: unknown): string {
  if (typeof erreur === "object" && erreur !== null && "message" in erreur && typeof erreur.message === "string" && erreur.message !== "") return erreur.message;
  return String(erreur);
}

export function peindreDossierExports(document: Document, dossier: DossierExports | undefined, annoncer: (texte: string) => void): void {
  const bloc = champ(document, "p-dossier");
  if (bloc === null) return;
  bloc.hidden = dossier === undefined;
  const aide = champ(document, "p-dossier-aide");
  if (aide) aide.hidden = dossier === undefined;
  if (dossier === undefined) return;
  const chemin = champ(document, "p-dossier-chemin");
  const oublier = champ(document, "p-dossier-oublier");
  const choisir = champ(document, "p-dossier-choisir");
  if (chemin === null || oublier === null || choisir === null) return;
  const afficher = (dossierChoisi: string | null): void => {
    chemin.textContent = dossierChoisi || "Documents (par défaut)";
    oublier.hidden = !dossierChoisi;
  };
  dossier.lire().then(afficher, () => {
    afficher(null);
  });
  choisir.onclick = () => {
    dossier.choisir().then(
      (dossierChoisi) => {
        if (dossierChoisi) afficher(dossierChoisi);
      },
      (erreur: unknown) => {
        annoncer(`Dossier non retenu : ${message(erreur)}`);
      },
    );
  };
  oublier.onclick = () => {
    dossier.oublier().then(
      () => {
        afficher(null);
      },
      (erreur: unknown) => {
        annoncer(`Dossier non oublié : ${message(erreur)}`);
      },
    );
  };
}

export interface ContexteSceau {
  readonly actif: boolean;
  choisir(actif: boolean): void;
}

export function peindreSceau(document: Document, contexte: ContexteSceau): void {
  const caseSceau = saisie(document, "p-sceau");
  if (caseSceau === null) return;
  caseSceau.checked = contexte.actif;
  caseSceau.onchange = () => {
    contexte.choisir(caseSceau.checked);
  };
}
