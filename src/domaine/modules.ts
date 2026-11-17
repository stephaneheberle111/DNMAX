// SPDX-License-Identifier: CECILL-2.1
/**
 * Modules de l'application (Paramètres > Modules) : ce que chacun apporte,
 * s'il est actif par défaut, s'il en requiert un autre. Un module qui en
 * requiert un autre ne reste pas actif sans lui.
 */
import { regleNiveauxAcquisition } from "./regles-affichees";

export interface Module {
  readonly nom: string;
  /** Actif à l'installation. */
  readonly def: boolean;
  /** Toujours actif, sans case à décocher. */
  readonly locked?: true;
  /** Module requis. */
  readonly req?: string;
  /** Ce que le module apporte. */
  readonly d: string;
  /** Règle affichée dans la carte du module, en lecture seule. */
  readonly regle?: () => string;
  /** Visite guidée du module (voir `parcours-etapes`). */
  readonly visite?: string;
}

export const MODULES: Readonly<Record<string, Module>> = {
  base: {
    nom: "Base",
    def: true,
    locked: true,
    d: "Toujours actif. Composer une évaluation (livrables, compétences, regroupements, consignes et attendus, rattachement aux UE et EC), l'enregistrer dans Mes évaluations avec son suivi, l'exporter en Word, Excel ou OpenDocument ; explorer et importer le référentiel ; décrire l'établissement (mentions, enseignants, promotions, répartition de service) et suivre la progression des promotions.",
  },
  eleves: {
    nom: "Étudiants",
    def: false,
    d: "Gestion nominative des évaluations directement dans l'application, étudiant par étudiant : promotions nominatives, saisie de chaque étudiant ligne par ligne (grille de la promo ou fiche individuelle, observations, appréciation), non-rendus, restitution par étudiant, un document Word par étudiant, et la page « Progression étudiant » pour savoir où en est chacun dans le semestre et dans l'acquisition des compétences.",
    visite: "eleves",
  },
  dn: {
    nom: "Niveaux d'acquisition",
    def: false,
    req: "eleves",
    d: "Attribue à chaque étudiant son niveau d'acquisition sur chaque compétence, selon l'année et le niveau de maîtrise obtenu. Affiché dans « Progression étudiant », dans les intitulés d'année et dans les exports.",
    regle: regleNiveauxAcquisition,
    visite: "niveaux",
  },
};

export type Actifs = Record<string, boolean>;

/** Modules actifs à l'installation. */
export function modulesParDefaut(): Actifs {
  return Object.fromEntries(Object.entries(MODULES).map(([cle, module]) => [cle, module.def]));
}

/** Désactive, en place, chaque module dont le module requis est inactif. */
export function appliquerDependances(actifs: Actifs): void {
  for (const [cle, module] of Object.entries(MODULES)) if (module.req !== undefined && !actifs[module.req]) actifs[cle] = false;
}

/** Vrai si désactiver ce module en désactive un autre, actif, qui le requiert. */
export function entraineDautres(cle: string, actifs: Actifs): boolean {
  return Object.entries(MODULES).some(([autre, module]) => module.req === cle && actifs[autre]);
}

/** Ce qu'indique la carte d'un module sous sa description : toujours actif, en attente du module requis, ou inactif par défaut. */
export function noteModule(module: Module, actifs: Actifs): { texte: string; accent: boolean } | null {
  if (module.locked) return { texte: "toujours actif", accent: true };
  if (module.req !== undefined && !actifs[module.req]) return { texte: `activez d'abord le module ${MODULES[module.req]?.nom ?? ""}`, accent: false };
  if (!module.def) return { texte: "désactivé par défaut", accent: false };
  return null;
}
