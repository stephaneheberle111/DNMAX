// SPDX-License-Identifier: CECILL-2.1
import { beforeEach, describe, expect, it, vi } from "vitest";
import { etat, etatVide } from "./etat";
import { etudiantsNonFinis, nomDuFichier, nomsDesEcs, proposerFichier, brancherExportDocument } from "./export-document";
import { brancherPromotionsCalendrier } from "./promotions-calendrier";

const messages = vi.hoisted(() => [] as string[]);
vi.mock("./evaluation-courante", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./evaluation-courante")>()),
  studentsOf: () => [
    { id: "a", nom: "Ana" },
    { id: "b", nom: "Ben" },
    { id: "c", nom: "Chloé" },
  ],
  lignesOf: () => ["l1", "l2"],
  ligKey: (ligne: string) => ligne,
}));
vi.mock("./aides-communes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./aides-communes")>()),
  toast: (message: string) => messages.push(message),
}));

beforeEach(() => {
  Object.assign(etat, etatVide());
  messages.length = 0;
  brancherPromotionsCalendrier(() => undefined);
  brancherExportDocument(() => undefined);
});

describe("nom du fichier", () => {
  it("réunit semestre, intitulé et précision, sans caractère interdit", () => {
    etat.evaluation = { semestre: "S3", classes: [], titre: 'Maquette : "chaise"' };
    expect(nomDuFichier("docx", "restitutions")).toBe("S3 - Maquette chaise - restitutions.docx");
  });

  it("nomme « évaluation » une évaluation sans intitulé", () => {
    etat.evaluation = { semestre: "S1", classes: [] };
    expect(nomDuFichier("odt")).toBe("S1 - évaluation.odt");
  });

  it("tronque un nom démesuré à 120 caractères avant l'extension", () => {
    etat.evaluation = { semestre: "", classes: [], titre: "x".repeat(300) };
    expect(nomDuFichier("xlsx")).toBe(`${"x".repeat(120)}.xlsx`);
  });
});

describe("étudiants pas entièrement évalués", () => {
  it("compte comme terminés les non-rendus, les dispensés et ceux qui ont un niveau partout", () => {
    const evaluation = { res: { a: { n: { l1: 1, l2: 2 } }, b: { nr: true }, c: { n: { l1: 0, l2: "" } } } };
    expect(etudiantsNonFinis(evaluation).map((etudiant) => etudiant.nom)).toEqual(["Chloé"]);
  });

  it("voit tout le monde à évaluer sans résultat", () => {
    expect(etudiantsNonFinis({})).toHaveLength(3);
  });
});

describe("noms des EC", () => {
  it("lit le nom dans le référentiel affiché, puis dans le dictionnaire, sinon garde le code", () => {
    etat.referentiel = { competences: [{ ecs: [{ ec: "EC 1.1", nom: "Humanités" }] }] };
    etat.donnees = { ecs: [{ code: "EC 2.1", nom: "Atelier" }] };
    expect(nomsDesEcs(["EC 1.1", "EC 2.1", "EC 9", "EC 1.1"])).toBe("Humanités, Atelier, EC 9");
  });
});

describe("remise du fichier", () => {
  it("prévient quand aucun enregistrement n'est possible", async () => {
    await proposerFichier("a.docx", new Blob([]));
    expect(messages).toEqual(["Téléchargement indisponible ici."]);
  });
});
