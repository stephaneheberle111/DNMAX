// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-documentation.css";
// Une seule source pour le site et l'application : la documentation et la page Confidentialité
// sont lues dans le site livré avec DNMAX, et s'affichent sans connexion.
import site from "../site/index.html?raw";
import licence from "../LICENSE?raw";
import { LICENCE } from "./configuration";
import { classerLien } from "./domaine/pied-de-page";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";
import { ouvrirDansNavigateur } from "./enveloppe";

let pageDuSite: Document | null = null;

/** Le site, lu une fois ; le texte est celui livré avec l'application, jamais interprété comme du script. */
function lireSite(): Document {
  pageDuSite ??= new DOMParser().parseFromString(site, "text/html");
  return pageDuSite;
}

interface Rubrique {
  identifiant: string;
  titre: string;
  contenu: Element;
}

function rubriques(): Rubrique[] {
  return [...lireSite().querySelectorAll<HTMLElement>("[data-doc]")].map((element) => ({
    identifiant: element.dataset.doc ?? "",
    titre: element.dataset.titre ?? element.querySelector("h3")?.textContent ?? "",
    contenu: element,
  }));
}

/**
 * Copie une partie du site pour l'afficher dans l'application : les scripts et
 * gestionnaires d'évènements sont retirés, et chaque lien est rebranché (voir `classerLien`).
 */
function copier(source: Element, allerA: (rubrique: string) => void, message: HTMLElement): HTMLElement {
  const copie = document.importNode(source, true) as HTMLElement;
  copie.hidden = false;
  copie.querySelectorAll("script, form, iframe, object, embed").forEach((element) => {
    element.remove();
  });
  for (const element of copie.querySelectorAll("*")) {
    for (const attribut of [...element.attributes]) {
      if (attribut.name.startsWith("on")) {
        element.removeAttribute(attribut.name);
      }
    }
  }
  for (const lien of copie.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const destination = classerLien(lien.getAttribute("href") ?? "", lien.dataset.docLien);
    lien.removeAttribute("target");
    lien.addEventListener("click", (evenement) => {
      evenement.preventDefault();
      if (destination.type === "rubrique") {
        allerA(destination.rubrique);
      } else if (destination.type === "confidentialite") {
        montrerConfidentialite();
      } else if (destination.type === "externe") {
        ouvrirDansNavigateur(destination.adresse).catch(() => {
          message.textContent = `Cette adresse s'ouvre dans votre navigateur ou votre messagerie : ${destination.adresse.replace(/^mailto:/, "")}`;
          message.hidden = false;
        });
      }
    });
    if (destination.type === "inerte") {
      lien.removeAttribute("href");
    }
  }
  return copie;
}

function boiteDocument(titre: string): { boite: HTMLElement; fermer: () => void; message: HTMLElement } {
  const { boite, fermer } = ouvrirBoite(titre);
  boite.classList.add("doc-boite");
  const message = creer("p", "doc-message");
  message.setAttribute("role", "status");
  message.hidden = true;
  return { boite, fermer, message };
}

function actionsFermer(fermer: () => void): HTMLElement {
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("Fermer", "btn ghost", fermer));
  return actions;
}

/** Documentation de DNMAX, consultable hors ligne : rubriques à gauche, texte à droite. */
export function montrerDocumentation(rubriqueDepart?: string): void {
  const liste = rubriques();
  const { boite, fermer, message } = boiteDocument("Documentation");
  const sommaire = creer("nav", "doc-sommaire");
  sommaire.setAttribute("aria-label", "Rubriques");
  const texte = creer("article", "doc-texte");
  texte.tabIndex = -1;
  const boutons = new Map<string, HTMLButtonElement>();
  const allerA = (identifiant: string): void => {
    const rubrique = liste.find((candidate) => candidate.identifiant === identifiant) ?? liste[0];
    if (rubrique === undefined) {
      return;
    }
    message.hidden = true;
    texte.replaceChildren(copier(rubrique.contenu, allerA, message));
    texte.scrollTop = 0;
    boutons.forEach((bouton, cle) => {
      bouton.setAttribute("aria-current", String(cle === rubrique.identifiant));
    });
  };
  for (const rubrique of liste) {
    const bouton = creerBouton(rubrique.titre, "doc-entree", () => {
      allerA(rubrique.identifiant);
      texte.focus({ preventScroll: true });
    });
    boutons.set(rubrique.identifiant, bouton);
    sommaire.append(bouton);
  }
  const corps = creer("div", "doc-corps");
  corps.append(sommaire, texte);
  boite.append(corps, message, actionsFermer(fermer));
  allerA(rubriqueDepart ?? liste[0]?.identifiant ?? "");
}

/** Page « Confidentialité et mentions légales » du site, affichée hors ligne. */
export function montrerConfidentialite(): void {
  const { boite, fermer, message } = boiteDocument("Confidentialité");
  const texte = creer("article", "doc-texte doc-seul");
  const source = lireSite().querySelector('[data-vue="confidentialite"] .legal');
  if (source !== null) {
    texte.append(copier(source, (rubrique) => {
      fermer();
      montrerDocumentation(rubrique);
    }, message));
  }
  boite.append(texte, message, actionsFermer(fermer));
}

/** Texte de la licence, tel que livré avec DNMAX (fichier LICENSE). */
export function montrerLicence(): void {
  const { boite, fermer } = boiteDocument(`Licence ${LICENCE}`);
  const resume = creer(
    "p",
    "doc-resume",
    "DNMAX est un logiciel libre : vous pouvez l'utiliser, l'étudier, le modifier et le redistribuer, aux conditions de la licence ci-dessous. " +
      "Il est fourni sans garantie. Le texte qui fait foi est celui de la licence elle-même.",
  );
  const texte = creer("pre", "doc-licence", licence);
  boite.append(resume, texte, actionsFermer(fermer));
}
