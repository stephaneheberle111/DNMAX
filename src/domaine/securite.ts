// SPDX-License-Identifier: AGPL-3.0-or-later
import { analyserJson, estObjet } from "./echange/modele";
import type { Entrees } from "./magasin-memoire";
import { CLE_MODULES } from "./parcours";

/** Vrai si le module Étudiants est actif dans ces données ; une entrée absente ou illisible vaut « inactif ». */
export function moduleElevesActif(entrees: Entrees): boolean {
  const modules = analyserJson(entrees[CLE_MODULES]);
  return estObjet(modules) && modules.eleves === true;
}

/**
 * Décide quand verrouiller l'application faute d'activité.
 *
 * L'heure est lue à chaque question plutôt que confiée à une minuterie :
 * pendant la mise en veille de l'ordinateur, une minuterie peut se figer,
 * alors que l'horloge continue d'avancer. Une activité signalée après le
 * délai (au réveil, par exemple) ne relance donc pas le compte : elle
 * déclenche le verrouillage.
 *
 * Une fois expirée, la surveillance le reste jusqu'à `repartir`.
 */
export class SurveillanceInactivite {
  readonly #delaiMs: number;
  readonly #horloge: () => number;
  readonly #verrouillageExige: () => boolean;
  #derniereActivite: number;
  #expiree = false;

  /**
   * @param delaiMs durée sans activité au-delà de laquelle verrouiller, en millisecondes
   * @param horloge rend l'heure courante en millisecondes (passée en paramètre pour les tests)
   * @param verrouillageExige dit si le verrouillage s'applique en ce moment (module Étudiants actif)
   * @throws RangeError si le délai n'est pas un nombre positif et fini
   */
  constructor(delaiMs: number, horloge: () => number, verrouillageExige: () => boolean) {
    if (!Number.isFinite(delaiMs) || delaiMs <= 0) {
      throw new RangeError("le délai d'inactivité doit être un nombre positif");
    }
    this.#delaiMs = delaiMs;
    this.#horloge = horloge;
    this.#verrouillageExige = verrouillageExige;
    this.#derniereActivite = horloge();
  }

  /** Note une action de l'enseignant ; sans effet si le délai est déjà dépassé. */
  signalerActivite(): void {
    if (this.estExpiree()) {
      return;
    }
    this.#derniereActivite = this.#horloge();
  }

  /** Vrai si l'application doit être verrouillée maintenant. */
  estExpiree(): boolean {
    // Le délai d'abord : la question au module, plus coûteuse, n'est posée qu'une fois le délai écoulé.
    if (!this.#expiree && this.#horloge() - this.#derniereActivite >= this.#delaiMs && this.#verrouillageExige()) {
      this.#expiree = true;
    }
    return this.#expiree;
  }

  /** Recommence le compte à partir de maintenant (après un verrouillage qui n'a pas pu se faire). */
  repartir(): void {
    this.#expiree = false;
    this.#derniereActivite = this.#horloge();
  }
}
