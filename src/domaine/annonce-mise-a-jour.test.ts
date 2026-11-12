// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { LONGUEUR_MAXIMALE_NOTES, decrireVerification, resumerNotes } from "./annonce-mise-a-jour";

describe("decrireVerification", () => {
  it("dit que DNMAX est à jour, avec sa version", () => {
    expect(decrireVerification("a-jour", "0.1.2")).toBe("DNMAX est à jour (version 0.1.2).");
  });

  it("dit que DNMAX est à jour même si sa version est inconnue", () => {
    expect(decrireVerification("a-jour", "")).toBe("DNMAX est à jour.");
  });

  it("dit qu'une vérification impossible est à refaire, sans prétendre que tout est à jour", () => {
    const message = decrireVerification("impossible", "0.1.2");
    expect(message).toContain("n'a pas abouti");
    expect(message).not.toContain("à jour");
  });
});

describe("resumerNotes", () => {
  it("ramène les notes à une seule ligne", () => {
    expect(resumerNotes("  Corrections :\n- export\n- import  ")).toBe("Corrections : - export - import");
  });

  it("laisse intactes des notes courtes", () => {
    expect(resumerNotes("Corrections.")).toBe("Corrections.");
  });

  it("rend un texte vide pour des notes vides ou blanches", () => {
    expect(resumerNotes("")).toBe("");
    expect(resumerNotes(" \n ")).toBe("");
  });

  it("coupe des notes trop longues et le signale", () => {
    const resume = resumerNotes("é".repeat(1000));
    expect(Array.from(resume)).toHaveLength(LONGUEUR_MAXIMALE_NOTES + 1);
    expect(resume.endsWith("…")).toBe(true);
  });
});
