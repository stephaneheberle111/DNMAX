// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entrees } from "./magasin-memoire";

/** Horloge passée en paramètre, pour pouvoir tester sans attendre. */
export interface Minuteur {
  armer(rappel: () => void, delaiMs: number): unknown;
  desarmer(jeton: unknown): void;
}

export type ResultatEnregistrement = { reussi: true } | { reussi: false; erreur: unknown };

/**
 * Regroupe les modifications rapprochées en une seule écriture.
 *
 * L'interface modifie souvent plusieurs clés d'affilée : plutôt que de
 * rechiffrer et réécrire le coffre à chaque fois, on attend un court silence.
 * Une seule écriture a lieu à la fois, et c'est toujours l'état le plus récent
 * qui est écrit.
 *
 * Après un échec, l'état refusé reste en attente : il sera retenté à la
 * prochaine modification ou au prochain appel de `vider`.
 */
export class EnregistreurDiffere {
  readonly #enregistrer: (entrees: Entrees) => Promise<void>;
  readonly #delaiMs: number;
  readonly #minuteur: Minuteur;
  readonly #surResultat: (resultat: ResultatEnregistrement) => void;
  #enAttente: Entrees | null = null;
  #jeton: unknown = null;
  #ecritureEnCours: Promise<void> | null = null;

  constructor(
    enregistrer: (entrees: Entrees) => Promise<void>,
    delaiMs: number,
    minuteur: Minuteur,
    surResultat: (resultat: ResultatEnregistrement) => void,
  ) {
    this.#enregistrer = enregistrer;
    this.#delaiMs = delaiMs;
    this.#minuteur = minuteur;
    this.#surResultat = surResultat;
  }

  /** Retient `entrees` comme prochain état à écrire et (ré)arme le délai. */
  planifier(entrees: Entrees): void {
    this.#enAttente = entrees;
    this.#desarmer();
    this.#jeton = this.#minuteur.armer(() => {
      this.#jeton = null;
      void this.#ecrire();
    }, this.#delaiMs);
  }

  /** Écrit tout de suite ce qui est en attente ; à appeler avant de fermer l'application. */
  async vider(): Promise<void> {
    this.#desarmer();
    await this.#ecrire();
  }

  #desarmer(): void {
    if (this.#jeton !== null) {
      this.#minuteur.desarmer(this.#jeton);
      this.#jeton = null;
    }
  }

  #ecrire(): Promise<void> {
    this.#ecritureEnCours ??= this.#ecrireJusquAEpuisement().finally(() => {
      this.#ecritureEnCours = null;
    });
    return this.#ecritureEnCours;
  }

  async #ecrireJusquAEpuisement(): Promise<void> {
    while (this.#enAttente !== null) {
      const entrees = this.#enAttente;
      this.#enAttente = null;
      try {
        await this.#enregistrer(entrees);
        this.#surResultat({ reussi: true });
      } catch (erreur: unknown) {
        // Ne pas écraser un état plus récent arrivé pendant la tentative.
        this.#enAttente ??= entrees;
        this.#surResultat({ reussi: false, erreur });
        return;
      }
    }
  }
}
