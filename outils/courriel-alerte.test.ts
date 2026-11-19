// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { composerCourriel, type Alerte, type Envoi } from "./courriel-alerte";

const ENVOI: Envoi = {
  expediteur: "alerte@exemple.invalid",
  destinataire: "contact@exemple.invalid",
  lien: "https://exemple.invalid/execution/1",
  date: new Date("2026-03-09T10:00:00.000Z"),
};
const FAILLE: Alerte = { titre: "Faille dans une dépendance", quoiFaire: ["Mettre à jour la dépendance.", "Publier une version."], detail: "tauri 2.0.0 : RUSTSEC-0000-0000" };

function corpsDe(courriel: string): string {
  const [, encode = ""] = courriel.split("\r\n\r\n");
  return Buffer.from(encode.replace(/\r\n/g, ""), "base64").toString("utf8");
}

function objetDe(courriel: string): string {
  const enTetes = courriel.split("\r\n\r\n")[0] ?? "";
  const ligne = /Subject: ((?:.|\r\n )*)/.exec(enTetes)?.[1] ?? "";
  return [...ligne.matchAll(/=\?UTF-8\?B\?([^?]*)\?=/g)].map((mot) => Buffer.from(mot[1] ?? "", "base64").toString("utf8")).join("");
}

describe("composerCourriel", () => {
  it("marque le message urgent, dans l'objet et dans les en-têtes", () => {
    const courriel = composerCourriel([FAILLE], ENVOI);
    expect(objetDe(courriel)).toBe("URGENT - DNMAX : Faille dans une dépendance");
    expect(courriel).toContain("X-Priority: 1 (Highest)\r\n");
    expect(courriel).toContain("Importance: high\r\n");
    expect(courriel).toContain("To: <contact@exemple.invalid>\r\n");
    expect(courriel).toContain("Date: Mon, 09 Mar 2026 10:00:00 +0000\r\n");
  });

  it("dit en tête ce qui se passe, puis quoi faire, le détail et le lien", () => {
    const corps = corpsDe(composerCourriel([FAILLE], ENVOI));
    expect(corps).toContain("URGENT - ALERTE DE SÉCURITÉ DNMAX");
    expect(corps).toContain("1. FAILLE DANS UNE DÉPENDANCE");
    expect(corps.indexOf("QUE FAIRE")).toBeLessThan(corps.indexOf("DÉTAIL :"));
    expect(corps).toContain("- Mettre à jour la dépendance.");
    expect(corps).toContain("tauri 2.0.0 : RUSTSEC-0000-0000");
    expect(corps).toContain("https://exemple.invalid/execution/1");
  });

  it("compte les alertes dans l'objet quand il y en a plusieurs", () => {
    const courriel = composerCourriel([FAILLE, { ...FAILLE, titre: "Installeur différent en ligne" }], ENVOI);
    expect(objetDe(courriel)).toBe("URGENT - DNMAX : 2 alertes de sécurité");
    expect(corpsDe(courriel)).toContain("2. INSTALLEUR DIFFÉRENT EN LIGNE");
  });

  it("ne laisse pas un titre ou une adresse ajouter un en-tête", () => {
    const courriel = composerCourriel([{ ...FAILLE, titre: "Titre\r\nBcc: tiers@exemple.invalid" }], ENVOI);
    expect(courriel.split("\r\n\r\n")[0]).not.toContain("Bcc:");
    expect(() => composerCourriel([FAILLE], { ...ENVOI, destinataire: "a@b.fr\r\nBcc: x@y.fr" })).toThrow("invalide");
    expect(() => composerCourriel([FAILLE], { ...ENVOI, expediteur: "pas une adresse" })).toThrow("invalide");
  });

  it("garde des lignes courtes et coupe un détail démesuré", () => {
    const courriel = composerCourriel([{ ...FAILLE, titre: "é".repeat(200), detail: "x".repeat(50_000) }], ENVOI);
    expect(Math.max(...courriel.split("\r\n").map((ligne) => ligne.length))).toBeLessThanOrEqual(78);
    expect(corpsDe(courriel).length).toBeLessThan(8000);
  });

  it("accepte un détail vide", () => {
    expect(corpsDe(composerCourriel([{ ...FAILLE, detail: "  " }], ENVOI))).toContain("(aucun détail)");
  });
});
