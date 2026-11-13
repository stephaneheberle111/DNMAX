// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from "vitest";
import { EnregistreurDiffere, type Minuteur, type ResultatEnregistrement } from "./enregistrement-differe";
import type { Entrees } from "./magasin-memoire";

const DELAI_MS = 300;

/** Minuteur à déclenchement manuel : le test décide quand le délai est écoulé. */
class MinuteurManuel implements Minuteur {
  #rappel: (() => void) | null = null;
  delais: number[] = [];

  armer(rappel: () => void, delaiMs: number): unknown {
    this.#rappel = rappel;
    this.delais.push(delaiMs);
    return rappel;
  }

  desarmer(jeton: unknown): void {
    if (this.#rappel === jeton) {
      this.#rappel = null;
    }
  }

  get arme(): boolean {
    return this.#rappel !== null;
  }

  ecouler(): void {
    const rappel = this.#rappel;
    this.#rappel = null;
    rappel?.();
  }
}

/** Promesse que le test résout ou rejette lui-même, pour simuler une écriture lente. */
function creerEcritureManuelle() {
  let resoudre: () => void = () => undefined;
  let rejeter: (erreur: Error) => void = () => undefined;
  const promesse = new Promise<void>((accepter, refuser) => {
    resoudre = accepter;
    rejeter = refuser;
  });
  return { promesse, resoudre, rejeter };
}

function creerEnregistreur(enregistrer: (entrees: Entrees) => Promise<void>) {
  const minuteur = new MinuteurManuel();
  const surResultat = vi.fn<(resultat: ResultatEnregistrement) => void>();
  return {
    enregistreur: new EnregistreurDiffere(enregistrer, DELAI_MS, minuteur, surResultat),
    minuteur,
    surResultat,
  };
}

/** Laisse s'exécuter les suites de promesses déjà résolues. */
async function laisserPasser(): Promise<void> {
  await new Promise((resoudre) => setTimeout(resoudre, 0));
}

describe("EnregistreurDiffere", () => {
  it("n'écrit rien tant que le délai n'est pas écoulé", () => {
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockResolvedValue();
    const { enregistreur, minuteur } = creerEnregistreur(enregistrer);
    enregistreur.planifier({ a: "1" });
    expect(enregistrer).not.toHaveBeenCalled();
    expect(minuteur.delais).toEqual([DELAI_MS]);
  });

  it("écrit une seule fois le dernier état après une rafale", async () => {
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockResolvedValue();
    const { enregistreur, minuteur, surResultat } = creerEnregistreur(enregistrer);
    enregistreur.planifier({ a: "1" });
    enregistreur.planifier({ a: "2" });
    enregistreur.planifier({ a: "3" });
    minuteur.ecouler();
    await laisserPasser();
    expect(enregistrer).toHaveBeenCalledExactlyOnceWith({ a: "3" });
    expect(surResultat).toHaveBeenCalledExactlyOnceWith({ reussi: true });
  });

  it("vider écrit sans attendre le délai", async () => {
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockResolvedValue();
    const { enregistreur, minuteur } = creerEnregistreur(enregistrer);
    enregistreur.planifier({ a: "1" });
    await enregistreur.vider();
    expect(enregistrer).toHaveBeenCalledExactlyOnceWith({ a: "1" });
    expect(minuteur.arme).toBe(false);
  });

  it("vider ne fait rien quand rien n'est en attente", async () => {
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockResolvedValue();
    const { enregistreur } = creerEnregistreur(enregistrer);
    await enregistreur.vider();
    expect(enregistrer).not.toHaveBeenCalled();
  });

  it("n'écrit jamais deux fois en même temps et finit par l'état le plus récent", async () => {
    const premiere = creerEcritureManuelle();
    const enregistrer = vi
      .fn<(entrees: Entrees) => Promise<void>>()
      .mockReturnValueOnce(premiere.promesse)
      .mockResolvedValue();
    const { enregistreur, minuteur } = creerEnregistreur(enregistrer);

    enregistreur.planifier({ a: "1" });
    minuteur.ecouler();
    enregistreur.planifier({ a: "2" });
    minuteur.ecouler();
    await laisserPasser();
    expect(enregistrer).toHaveBeenCalledTimes(1);

    premiere.resoudre();
    await laisserPasser();
    expect(enregistrer).toHaveBeenCalledTimes(2);
    expect(enregistrer).toHaveBeenLastCalledWith({ a: "2" });
  });

  it("vider attend la fin d'une écriture déjà en cours", async () => {
    const premiere = creerEcritureManuelle();
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockReturnValueOnce(premiere.promesse);
    const { enregistreur, minuteur } = creerEnregistreur(enregistrer);
    enregistreur.planifier({ a: "1" });
    minuteur.ecouler();

    let termine = false;
    const vidage = enregistreur.vider().then(() => {
      termine = true;
    });
    await laisserPasser();
    expect(termine).toBe(false);

    premiere.resoudre();
    await vidage;
    expect(termine).toBe(true);
  });

  it("signale un échec et garde l'état pour le retenter", async () => {
    const panne = new Error("disque plein");
    const enregistrer = vi
      .fn<(entrees: Entrees) => Promise<void>>()
      .mockRejectedValueOnce(panne)
      .mockResolvedValue();
    const { enregistreur, minuteur, surResultat } = creerEnregistreur(enregistrer);

    enregistreur.planifier({ a: "1" });
    minuteur.ecouler();
    await laisserPasser();
    expect(surResultat).toHaveBeenCalledExactlyOnceWith({ reussi: false, erreur: panne });

    await enregistreur.vider();
    expect(enregistrer).toHaveBeenCalledTimes(2);
    expect(enregistrer).toHaveBeenLastCalledWith({ a: "1" });
    expect(surResultat).toHaveBeenLastCalledWith({ reussi: true });
  });

  it("ne signale plus rien en attente après un vidage réussi", async () => {
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockResolvedValue();
    const { enregistreur } = creerEnregistreur(enregistrer);
    enregistreur.planifier({ a: "1" });
    expect(enregistreur.aDesModificationsEnAttente).toBe(true);
    await enregistreur.vider();
    expect(enregistreur.aDesModificationsEnAttente).toBe(false);
  });

  it("signale l'état encore en attente après un vidage en échec", async () => {
    const enregistrer = vi.fn<(entrees: Entrees) => Promise<void>>().mockRejectedValue(new Error("disque plein"));
    const { enregistreur } = creerEnregistreur(enregistrer);
    enregistreur.planifier({ a: "1" });
    await enregistreur.vider();
    expect(enregistreur.aDesModificationsEnAttente).toBe(true);
  });

  it("après un échec, retente avec l'état le plus récent et non l'ancien", async () => {
    const premiere = creerEcritureManuelle();
    const enregistrer = vi
      .fn<(entrees: Entrees) => Promise<void>>()
      .mockReturnValueOnce(premiere.promesse)
      .mockResolvedValue();
    const { enregistreur, minuteur } = creerEnregistreur(enregistrer);

    enregistreur.planifier({ a: "1" });
    minuteur.ecouler();
    enregistreur.planifier({ a: "2" });
    premiere.rejeter(new Error("disque plein"));
    await laisserPasser();

    await enregistreur.vider();
    expect(enregistrer).toHaveBeenLastCalledWith({ a: "2" });
  });
});
