// SPDX-License-Identifier: CECILL-2.1
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOGOTYPE_DNMAX, dessinerLettres, peintureCouleurs, svgDN, svgLogotype } from "./identite-pieces";

const INDEX = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("logotype en pièces", () => {
  it("compte quatorze pièces sur cinq lettres (planche 40)", () => {
    expect(LOGOTYPE_DNMAX.map((lettre) => lettre.lettre).join("")).toBe("DNMAX");
    const pieces = LOGOTYPE_DNMAX.flatMap((lettre) => lettre.pieces);
    // Le X a deux pièces de design dans un seul tracé, d'où treize tracés pour quatorze pièces.
    expect(pieces).toHaveLength(13);
    expect(pieces.map((piece) => piece.d.split("M").length - 1).reduce((somme, nombre) => somme + nombre, 0)).toBe(14);
  });

  it("met chaque lettre à sa place et peint ses pièces de leur couleur", () => {
    const groupes = dessinerLettres(LOGOTYPE_DNMAX.slice(0, 2), peintureCouleurs("#10555F", "#C27A2C"));
    expect(groupes).toContain('<g transform="translate(80.00 0)">');
    expect(groupes).toContain('<path d="M38 10 A40 40 0 0 1 38 90 Z" fill="#C27A2C"/>');
    expect(groupes).toContain('<path d="M10 10 H34 V90 H10 Z" fill="#10555F"/>');
  });

  it("se nomme DNMAX pour les lecteurs d'écran", () => {
    expect(svgLogotype("logotype")).toContain('role="img" aria-label="DNMAX"');
  });

  it("laisse les couleurs à la feuille de styles par défaut, pour suivre le thème", () => {
    const svg = svgLogotype("logotype");
    expect(svg).toContain('class="piece-design"');
    expect(svg).toContain('class="piece-art"');
    expect(svg).not.toContain("fill=");
  });

  it("cadre le DN au plus près de ses pièces, comme décor", () => {
    const svg = svgDN("dn");
    expect(svg).toContain('viewBox="10 10 156 80"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('translate(168.00 0)');
  });
});

describe("logotype du site", () => {
  const SITE = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");

  it("reprend les tracés du module dans l'en-tête et dans la reconstitution de l'application", () => {
    expect(SITE).toContain(svgLogotype("logo-site"));
    expect(SITE).toContain(svgLogotype("logo-app"));
    expect(SITE).not.toContain("signe-plein");
  });
});

describe("logotype de la barre de l'application", () => {
  it("reprend les tracés du module, sans l'ancien nom « DNMA » suivi du X", () => {
    expect(INDEX).toContain(svgLogotype("logotype"));
    expect(INDEX).not.toContain("signe-plein");
  });

  it("donne à chacun des cinq menus un picto en deux pièces", () => {
    for (const onglet of ["t-saved", "t-prog", "t-ref", "t-org", "t-set"]) {
      const bouton = new RegExp(`<button role="tab" id="${onglet}"[^>]*><svg class="picto"[^]*?</svg>`).exec(INDEX)?.[0] ?? "";
      expect(bouton).toContain('class="picto-design"');
      expect(bouton).toContain('class="picto-art"');
    }
  });
});
