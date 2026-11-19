// SPDX-License-Identifier: CECILL-2.1
/**
 * La barre des étapes de l'éditeur d'évaluation et la ligne qui dit où en
 * est l'enregistrement. Les règles sont dans `domaine/etapes-editeur` ;
 * ce module affiche.
 */
import { resumeEtapes } from "../domaine/etapes-editeur";

/** Ce que l'éditeur confie à la barre des étapes. */
export interface ContexteBarreEtapes {
  readonly evaluation: Record<string, unknown>;
  /** Étape affichée, déjà ramenée à une étape accessible. */
  readonly etape: number;
  readonly moduleEleves: boolean;
  /** Vrai pour un brouillon : l'étape 4 reste fermée. */
  readonly brouillon: boolean;
  readonly semestre: string;
  /** Compétences proposées au semestre. */
  readonly competencesDisponibles: number;
  /** Étudiants de l'évaluation, et où en est leur saisie. */
  readonly bilan: { readonly etudiants: number; readonly faits: number; readonly partiels: number };
}

function pluriel(nombre: number, mot: string): string {
  return `${mot}${nombre > 1 ? "s" : ""}`;
}

/** Un résumé : un chiffre en clair, la suite en italique (`em`), comme dans le reste de la barre. */
function resume(hote: HTMLElement | null, clair: string, discret: string): void {
  if (hote === null) return;
  const italique = document.createElement("em");
  italique.textContent = discret;
  hote.replaceChildren(...(clair === "" ? [] : [clair]), ...(discret === "" ? [] : [italique]));
}

/** Montre l'étape affichée, ferme l'étape 4 quand elle n'a pas lieu d'être, et résume chaque étape. */
export function peindreBarreEtapes(contexte: ContexteBarreEtapes): void {
  const etape4 = document.getElementById("li-step4");
  if (etape4 !== null) {
    etape4.hidden = !contexte.moduleEleves;
    const bouton = etape4.querySelector("button");
    if (bouton !== null) {
      bouton.disabled = contexte.brouillon;
      bouton.title = contexte.brouillon ? "Enregistrez d'abord l'évaluation (étape Formulation)" : "";
    }
  }
  for (const numero of [1, 2, 3, 4]) {
    const volet = document.getElementById(`step${String(numero)}`);
    if (volet === null) continue;
    volet.hidden = contexte.etape !== numero;
    document.querySelector(`.steps [data-step="${String(numero)}"]`)?.setAttribute("aria-current", String(contexte.etape === numero));
  }

  const { livrables, retenues, lignes, regroupements, formulees } = resumeEtapes(contexte.evaluation);
  if (livrables > 0) {
    resume(document.getElementById("s1sum"), `${String(livrables)} ${pluriel(livrables, "livrable")}`, ` ${pluriel(livrables, "attendu")}`);
  } else {
    resume(document.getElementById("s1sum"), "", "aucun livrable attendu");
  }
  if (retenues > 0) {
    resume(
      document.getElementById("s2sum"),
      `${String(retenues)} ${pluriel(retenues, "retenue")}`,
      ` sur ${String(contexte.competencesDisponibles)} au ${contexte.semestre}`,
    );
  } else {
    resume(document.getElementById("s2sum"), "", "aucune compétence cochée");
  }
  if (lignes > 0) {
    resume(
      document.getElementById("s3sum"),
      `${String(lignes)} ${pluriel(lignes, "ligne")}`,
      (regroupements > 0 ? ` · ${String(regroupements)} ${pluriel(regroupements, "regroupement")}` : "") +
        (formulees > 0 ? ` · ${String(formulees)} ${pluriel(formulees, "formulée")}` : ""),
    );
  } else {
    resume(document.getElementById("s3sum"), "", "rien à formuler");
  }
  const conseil1 = document.getElementById("n1hint");
  if (conseil1 !== null) conseil1.textContent = livrables > 0 ? "" : "Choisissez au moins un livrable pour pouvoir les associer à l'étape 3.";
  const conseil2 = document.getElementById("n2hint");
  if (conseil2 !== null) conseil2.textContent = retenues > 0 ? "" : "Cochez les compétences évaluées sur ce travail.";

  const { etudiants, faits, partiels } = contexte.bilan;
  const resume4 = document.getElementById("s4sum");
  if (etudiants === 0) {
    resume(resume4, "", "aucun·e étudiant·e");
  } else if (faits >= etudiants) {
    resume(resume4, `${String(etudiants)} ${pluriel(etudiants, "évalué·e")}`, " — complet");
  } else {
    resume(
      resume4,
      `${String(faits)} / ${String(etudiants)}`,
      ` ${pluriel(etudiants, "évalué·e")}${partiels > 0 ? ` · ${String(partiels)} en cours` : ""}`,
    );
  }
}

/** Où en est l'évaluation en cours (voir `etatEnregistrement` dans `domaine/evaluation`). */
export type EtatEnregistrement = "liste" | "bloquee" | "vide";

/** Ce que l'éditeur confie à la ligne d'enregistrement. */
export interface ContexteEnregistrement {
  readonly etat: EtatEnregistrement;
  /** Vrai si l'évaluation est encore un brouillon (pas encore « Enregistrer l'évaluation »). */
  readonly brouillon: boolean;
  /** Référentiel et date de sa version, à citer ; chaîne vide si l'évaluation n'en a pas encore. */
  readonly version: string;
}

/** La ligne sous le titre, la phrase sous la formulation, et le libellé du bouton d'enregistrement. */
export function peindreEnregistrement(contexte: ContexteEnregistrement): void {
  const ligne = document.getElementById("newWhat");
  if (ligne === null) return;
  const { etat } = contexte;
  const brouillon = etat === "vide" || contexte.brouillon;
  const texte =
    etat === "bloquee"
      ? "Non enregistrée : le référentiel doit d'abord être validé"
      : etat === "vide"
        ? "Nouvelle évaluation — gardée en brouillon dès que vous la commencez"
        : brouillon
          ? "Brouillon, gardé automatiquement — à terminer par « Enregistrer l'évaluation », à l'étape Formulation"
          : "Enregistrée automatiquement à chaque modification";
  ligne.textContent = texte + (contexte.version === "" ? "" : ` · référentiel ${contexte.version}`);
  const phrase = document.getElementById("n3save");
  if (phrase !== null) {
    phrase.textContent =
      etat === "bloquee"
        ? ""
        : brouillon
          ? "Brouillon : tant qu'elle n'est pas enregistrée, elle ne peut être ni distribuée ni évaluée et ne compte pas dans Progression."
          : "Déjà dans « Mes évaluations » : c'est de là que sortent le Word et l'Excel.";
  }
  const bouton = document.getElementById("bSave3");
  if (bouton !== null) bouton.textContent = brouillon ? "Enregistrer l'évaluation" : "Retour à « Mes évaluations »";
}
