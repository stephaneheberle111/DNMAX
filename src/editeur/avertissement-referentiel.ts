// SPDX-License-Identifier: CECILL-2.1
/**
 * Avertissement montré quand l'enseignant coche, dans une évaluation, une
 * promotion dont le référentiel n'est pas validé. Il peut évaluer quand même ;
 * la fenêtre rappelle qu'il est responsable du référentiel et mène à sa
 * validation. La règle (qui avertir) est dans `domaine/validation-referentiel`.
 */
import { balise } from "../etablissement/editeur-commun";

export interface ContexteAvertissement {
  /** Promotions cochées dont le référentiel n'est pas validé. */
  readonly promotions: readonly string[];
  /** « DN MADE mention Objet », ou vide si le diplôme est inconnu. */
  readonly diplome: string;
  allerValidation(): void;
}

export function avertirReferentielNonValide(document: Document, contexte: ContexteAvertissement): void {
  const precedent = document.activeElement;
  const fond = balise("div", [["class", "modal"]]);
  const carte = balise("div", [
    ["class", "card"],
    ["role", "alertdialog"],
    ["aria-modal", "true"],
    ["aria-labelledby", "avrnvT"],
    ["aria-describedby", "avrnvD"],
    ["style", "max-width:500px;width:100%"],
  ]);
  const promotions = contexte.promotions.join(", ");
  const titre = balise("p", [["id", "avrnvT"]]);
  titre.append(
    balise(
      "b",
      [],
      `Le référentiel${contexte.diplome === "" ? "" : ` ${contexte.diplome}`} de ${contexte.promotions.length > 1 ? "ces promotions" : "cette promotion"} (${promotions}) n'est pas validé.`,
    ),
  );
  const explication = balise(
    "p",
    [["id", "avrnvD"]],
    "Vous pouvez composer et enregistrer cette évaluation : ses UE, EC et compétences sont celles du référentiel de la promotion. " +
      "Pensez à le vérifier et à le valider dans Référentiel > Constituer > Validation : vous en êtes responsable, pas l'hébergeur ni le développeur de DNMAX.",
  );
  const boutons = balise("div", [["class", "row"]]);
  const continuer = balise("button", [["type", "button"], ["class", "btn primary"], ["data-no", ""]], "Continuer l'évaluation");
  const valider = balise("button", [["type", "button"], ["class", "btn ghost"], ["data-yes", ""]], "Aller à la validation");
  boutons.append(valider, continuer);
  carte.append(titre, explication, boutons);
  fond.append(carte);
  const fermer = (): void => {
    fond.remove();
    document.removeEventListener("keydown", touche);
    if (precedent instanceof HTMLElement && document.contains(precedent)) precedent.focus();
  };
  const touche = (evenement: KeyboardEvent): void => {
    if (evenement.key === "Escape") fermer();
  };
  continuer.addEventListener("click", fermer);
  valider.addEventListener("click", () => {
    fermer();
    contexte.allerValidation();
  });
  fond.addEventListener("click", (evenement) => {
    if (evenement.target === fond) fermer();
  });
  document.addEventListener("keydown", touche);
  document.body.append(fond);
  continuer.focus();
}
