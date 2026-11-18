// SPDX-License-Identifier: CECILL-2.1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide } from "./etat";
import { blocName, ecColor, ecNomRef, ecOrd, esc, hueOf, lienEc, publierAidesCommunes, refEcByCode, toast, ueColor, ueOrd } from "./aides-communes";

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.referentiel = {
    blocs: [{ num: "2", nom: "Concevoir" }],
    ues: [{ nom: "UE 1", couleur: "#abc" }, { nom: "UE-2" }],
    ecs: [
      { ue: "UE 1", nom: "Dessin", codes: { 1: "EC 1.1", 2: "EC 2.1" }, couleur: "#123" },
      { ue: "UE2", nom: "Volume", codes: { 1: "EC 1.2" } },
    ],
  };
});

describe("publierAidesCommunes", () => {
  it("publie les aides sous leurs noms historiques", () => {
    const fenetre: Record<string, unknown> = {};
    publierAidesCommunes(fenetre, null);
    for (const nom of ["esc", "toast", "askModal", "paintTabs", "blocName", "ecColor", "ueColor", "ueOrd", "ecNum", "lienEc", "ecOrd"]) {
      expect(typeof fenetre[nom]).toBe("function");
    }
  });
});

describe("esc", () => {
  it("échappe &, <, > et les guillemets doubles", () => {
    expect(esc(`<a href="x">A & B</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;");
  });

  it("laisse l'apostrophe, et rend un texte vide pour null", () => {
    expect(esc("l'UE")).toBe("l'UE");
    expect(esc(null)).toBe("");
  });
});

describe("blocs, EC et UE", () => {
  it("nomme un bloc connu, et « Bloc n » sinon", () => {
    expect(blocName(2)).toBe("Concevoir");
    expect(blocName(7)).toBe("Bloc 7");
  });

  it("retrouve un EC par l'un de ses codes, toutes années confondues", () => {
    expect(refEcByCode("EC 2.1")?.nom).toBe("Dessin");
    expect(refEcByCode("EC 9.9")).toBeNull();
  });

  it("prend la couleur et le nom de l'EC, sinon une teinte tirée du code et le code lui-même", () => {
    expect(ecColor("EC 1.1")).toBe("#123");
    expect(ecColor("EC 1.2")).toBe(hueOf("EC 1.2"));
    expect(ecNomRef("EC 1.2")).toBe("Volume");
    expect(ecNomRef("EC 9.9")).toBe("EC 9.9");
  });

  it("compare les UE sans les traits d'union entre capitales", () => {
    expect(ueColor("UE 1")).toBe("#abc");
    expect(ueColor("UE2")).toBe(hueOf("UE2"));
    expect(ueOrd("UE2")).toBe(1);
    expect(ueOrd("UE 9")).toBe(99);
  });

  it("donne une teinte stable, la même pour un texte vide et null", () => {
    expect(hueOf("EC 1.1")).toBe(hueOf("EC 1.1"));
    expect(hueOf("")).toBe("hsl(0 52% 60%)");
    expect(hueOf(null)).toBe("hsl(0 52% 60%)");
  });

  it("trouve le lien d'une compétence vers un EC, ou rien", () => {
    expect(lienEc({ ecs: [{ id: "e1", sem: "S1" }] }, "e1")).toEqual({ id: "e1", sem: "S1" });
    expect(lienEc(null, "e1")).toBeNull();
  });

  it("range un EC sans code après les autres", () => {
    expect(ecOrd({ codes: { 1: "EC 1.1" } })).toBeLessThan(ecOrd(null));
  });
});

describe("toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("affiche une bulle puis la retire après quelques secondes", () => {
    vi.useFakeTimers();
    const ajoutees: { className: string; textContent: string; retiree: boolean; remove(): void }[] = [];
    const document = {
      createElement: () => {
        const bulle = {
          className: "",
          textContent: "",
          retiree: false,
          remove() {
            bulle.retiree = true;
          },
        };
        return bulle;
      },
      body: { appendChild: (bulle: (typeof ajoutees)[number]) => ajoutees.push(bulle) },
    } as unknown as Document;
    publierAidesCommunes({}, document);
    toast("Enregistré.");
    expect(ajoutees).toHaveLength(1);
    expect(ajoutees[0]).toMatchObject({ className: "toast", textContent: "Enregistré.", retiree: false });
    vi.advanceTimersByTime(3200);
    expect(ajoutees[0]?.retiree).toBe(true);
  });
});
