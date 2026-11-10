// SPDX-License-Identifier: AGPL-3.0-or-later

/** Entrées du magasin : une valeur texte par clé, comme le stockage d'un navigateur. */
export type Entrees = Readonly<Record<string, string>>;

/**
 * Magasin clé → texte tenu en mémoire, à l'interface synchrone attendue par
 * l'interface historique (`getItem`, `setItem`, `removeItem`).
 *
 * Il ne touche ni au disque ni au navigateur : `surChangement` prévient
 * l'appelant, qui décide quoi faire des données.
 */
export class MagasinMemoire {
  readonly #valeurs: Map<string, string>;
  readonly #surChangement: (entrees: Entrees) => void;

  constructor(entreesInitiales: Entrees, surChangement: (entrees: Entrees) => void) {
    this.#valeurs = new Map(Object.entries(entreesInitiales));
    this.#surChangement = surChangement;
  }

  getItem(cle: string): string | null {
    return this.#valeurs.get(cle) ?? null;
  }

  setItem(cle: string, valeur: string): void {
    if (this.#valeurs.get(cle) === valeur) {
      return;
    }
    this.#valeurs.set(cle, valeur);
    this.#surChangement(this.entrees());
  }

  removeItem(cle: string): void {
    if (this.#valeurs.delete(cle)) {
      this.#surChangement(this.entrees());
    }
  }

  /** Copie des entrées : la modifier ne change pas le magasin. */
  entrees(): Entrees {
    return Object.fromEntries(this.#valeurs);
  }
}
