// SPDX-License-Identifier: CECILL-2.1
/**
 * Paramètres > Modules : une carte par module, avec sa case, ce qu'il
 * apporte, sa règle éventuelle et ses boutons (documents, visite guidée).
 * Le catalogue et les règles sont dans `domaine/modules`.
 */
import { MODULES, noteModule, type Actifs } from "../domaine/modules";
import { balise } from "../etablissement/editeur-commun";

export interface ContexteModules {
  readonly actifs: Actifs;
  /** Ouvre les documents à remettre du module Étudiants. */
  ouvrirDocuments(): void;
  /** Avertissement avant d'activer le module Étudiants : vrai si l'enseignant confirme. */
  confirmerEleves(): Promise<boolean>;
  /** Active ou désactive le module, puis redessine. */
  appliquer(cle: string, actif: boolean): void;
}

function carte(contexte: ContexteModules, cle: string): HTMLElement {
  const module = MODULES[cle];
  if (module === undefined) return balise("div");
  const { actifs } = contexte;
  const enAttente = module.req !== undefined && !actifs[module.req];
  const cadre = balise("div", [["class", `mod${enAttente ? " modoff" : ""}`]]);
  const interrupteur = balise("label", [["class", "tg"]]);
  const caseACocher = balise("input", [
    ["type", "checkbox"],
    ["data-mod", cle],
    ...(actifs[cle] ? [["checked", ""] as const] : []),
    ...(module.locked || enAttente ? [["disabled", ""] as const] : []),
    ["aria-label", module.nom],
  ]);
  caseACocher.addEventListener("change", () => {
    if (module.locked) {
      caseACocher.checked = true;
      return;
    }
    // Activer le module Étudiants passe par un avertissement RGPD : la case ne reste cochée que si l'enseignant confirme.
    if (cle === "eleves" && caseACocher.checked && !contexte.actifs.eleves) {
      caseACocher.checked = false;
      void contexte.confirmerEleves().then((confirme) => {
        if (confirme && !contexte.actifs.eleves) {
          caseACocher.checked = true;
          contexte.appliquer(cle, true);
        }
      });
      return;
    }
    contexte.appliquer(cle, caseACocher.checked);
  });
  interrupteur.append(caseACocher, balise("span"));
  const texte = balise("div");
  texte.append(balise("b", [], module.nom));
  if (module.req !== undefined) texte.append(balise("span", [["class", "hint"], ["style", "margin-left:8px;font-size:11.5px"]], `nécessite le module ${MODULES[module.req]?.nom ?? ""}`));
  texte.append(balise("div", [["class", "d"]], module.d));
  if (module.regle) texte.append(balise("div", [["class", "d modregle"]], module.regle()));
  const note = noteModule(module, actifs);
  if (note !== null) texte.append(balise("div", [["class", "off"], ...(note.accent ? [["style", "color:var(--accent)"] as const] : [])], note.texte));
  const actions = balise("div", [["class", "modactions"]]);
  // Les documents RGPD restent disponibles une fois le module Étudiants activé.
  if (cle === "eleves" && actifs.eleves) {
    const documents = balise("button", [["type", "button"], ["class", "btn ghost modvisite"], ["data-docs-eleves", ""]], "Documents à remettre");
    documents.addEventListener("click", () => {
      contexte.ouvrirDocuments();
    });
    actions.append(documents);
  }
  if (module.visite !== undefined) actions.append(balise("button", [["type", "button"], ["class", "btn ghost modvisite"], ["data-parcours", module.visite]], "Visite guidée"));
  texte.append(actions);
  cadre.append(interrupteur, texte);
  return cadre;
}

export function peindreModules(hote: HTMLElement, compteur: HTMLElement, contexte: ContexteModules): void {
  const cles = Object.keys(MODULES);
  compteur.textContent = `${String(cles.filter((cle) => contexte.actifs[cle]).length)} / ${String(cles.length)}`;
  hote.replaceChildren(...cles.map((cle) => carte(contexte, cle)));
}
