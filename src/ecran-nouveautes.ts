// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-nouveautes.css";
import journal from "../CHANGELOG.md?raw";
import {
  INTITULES_RUBRIQUES,
  nouveautesAMontrer,
  nouveautesEntre,
  type GroupeNouveautes,
} from "./domaine/nouveautes";
import { creer, creerBouton, ouvrirBoite } from "./ecran-echange";
import { lireVersion } from "./enveloppe";

/** Dernière version dont l'enseignant a vu les nouveautés (réglage du poste, rien de personnel). */
const CLE_VERSION_VUE = "dnmax.versionVue";

/**
 * Liste des nouveautés, une rubrique par type de changement. Au-delà de
 * `maximum` entrées, les suivantes sont résumées en une ligne.
 */
export function creerListeNouveautes(groupes: readonly GroupeNouveautes[], maximum = Number.POSITIVE_INFINITY): HTMLElement {
  const liste = creer("div", "nouveautes");
  let restantes = maximum;
  let omises = 0;
  for (const groupe of groupes) {
    const montrees = groupe.entrees.slice(0, Math.max(0, restantes));
    omises += groupe.entrees.length - montrees.length;
    restantes -= montrees.length;
    if (montrees.length === 0) continue;
    const titre = creer("h3", `nouveautes-rubrique nouveautes-${groupe.rubrique === "Ajouté" ? "ajout" : groupe.rubrique === "Corrigé" ? "correction" : groupe.rubrique === "Sécurité" ? "securite" : "amelioration"}`, INTITULES_RUBRIQUES[groupe.rubrique]);
    const entrees = creer("ul");
    for (const texte of montrees) entrees.append(creer("li", "", texte));
    liste.append(titre, entrees);
  }
  if (omises > 0) {
    liste.append(creer("p", "nouveautes-suite", omises === 1 ? "Et un autre changement." : `Et ${String(omises)} autres changements.`));
  }
  return liste;
}

function lireVersionVue(): string | null {
  try {
    return localStorage.getItem(CLE_VERSION_VUE);
  } catch {
    return null;
  }
}

function noterVersionVue(version: string): void {
  try {
    localStorage.setItem(CLE_VERSION_VUE, version);
  } catch {
    // Sans stockage, les nouveautés seront simplement remontrées au prochain lancement.
  }
}

/**
 * Au premier lancement d'une nouvelle version, montre ce qui a changé depuis la
 * dernière version utilisée sur ce poste, classé par type de changement.
 *
 * @param installationExistante vrai si des données existaient avant ce lancement
 * @returns une promesse tenue quand la boîte est fermée (aussitôt s'il n'y a rien à montrer)
 */
export async function montrerNouveautesAuLancement(installationExistante: boolean): Promise<void> {
  const version = await lireVersion();
  const decision = nouveautesAMontrer(lireVersionVue(), version, installationExistante);
  if (version !== "") noterVersionVue(version);
  if (decision === null) return;
  const groupes = nouveautesEntre(journal, decision.depuis, version);
  if (groupes.length === 0) return;
  let signalerFermeture: () => void = () => undefined;
  const fermee = new Promise<void>((tenir) => {
    signalerFermeture = tenir;
  });
  const { boite, fermer } = ouvrirBoite(`Nouveautés de DNMAX ${version}`, () => {
    signalerFermeture();
  });
  boite.classList.add("nouveautes-boite");
  boite.append(
    creer(
      "p",
      "",
      decision.depuis === null
        ? "Voici ce qui change dans cette version. Vos données sont conservées."
        : `Voici ce qui a changé depuis la version ${decision.depuis}. Vos données sont conservées.`,
    ),
    creerListeNouveautes(groupes),
  );
  const actions = creer("div", "echange-actions");
  actions.append(creerBouton("J'ai compris", "btn primary", fermer));
  boite.append(actions);
  await fermee;
}
