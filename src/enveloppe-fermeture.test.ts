// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Gestionnaire inscrit auprès de la fenêtre, comme Tauri le garde. */
const inscrits = vi.hoisted(() => ({ gestionnaires: [] as (() => Promise<void>)[] }));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: (gestionnaire: () => Promise<void>) => {
      inscrits.gestionnaires.push(gestionnaire);
      return Promise.resolve(() => undefined);
    },
  }),
}));

beforeEach(() => {
  inscrits.gestionnaires.length = 0;
  vi.resetModules();
});

describe("fermeture de la fenêtre", () => {
  it("se prend en charge dès le démarrage, avant l'écran du mot de passe, pour que la fenêtre se ferme même verrouillée", async () => {
    const enveloppe = await import("./enveloppe");
    await enveloppe.installerFermeture();
    expect(inscrits.gestionnaires).toHaveLength(1);
    // Coffre fermé : rien à écrire, la fermeture n'attend rien.
    await expect(inscrits.gestionnaires[0]?.()).resolves.toBeUndefined();
  });

  it("attend, une fois le coffre ouvert, que ce qui est en attente soit écrit", async () => {
    const enveloppe = await import("./enveloppe");
    await enveloppe.installerFermeture();
    const ecrire = vi.fn(() => Promise.resolve());
    enveloppe.attendreAvantFermeture(ecrire);
    await inscrits.gestionnaires[0]?.();
    expect(ecrire).toHaveBeenCalledOnce();
  });

  it("n'inscrit qu'un gestionnaire, même quand le coffre est ouvert ensuite", async () => {
    const enveloppe = await import("./enveloppe");
    await enveloppe.installerFermeture();
    enveloppe.attendreAvantFermeture(() => Promise.resolve());
    expect(inscrits.gestionnaires).toHaveLength(1);
  });
});
