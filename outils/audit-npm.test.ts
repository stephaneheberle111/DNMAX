// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { ALERTES_ADMISES, alertesNonAdmises, lireAlertes } from "./audit-npm";

function rapport(vulnerabilities: unknown): string {
  return JSON.stringify({ auditReportVersion: 2, vulnerabilities, metadata: {} });
}

const AVIS_XLSX = { source: 1, name: "xlsx", title: "Prototype Pollution in sheetJS", url: "https://github.com/advisories/GHSA-4r6h-8v6p-xvw6", severity: "high" };
const AVIS_NOUVEAU = { source: 2, name: "jszip", title: "Faille fictive", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc", severity: "critical" };

describe("lireAlertes", () => {
  it("rend une alerte par avis, avec le paquet fautif", () => {
    expect(lireAlertes(rapport({ xlsx: { via: [AVIS_XLSX] } }))).toEqual([
      { paquet: "xlsx", identifiant: "GHSA-4r6h-8v6p-xvw6", gravite: "high", titre: "Prototype Pollution in sheetJS" },
    ]);
  });

  it("ne compte pas un paquet signalé seulement à cause d'un autre", () => {
    expect(lireAlertes(rapport({ eslint: { via: ["minimatch"] } }))).toEqual([]);
  });

  it("rend une liste vide pour un rapport sans alerte", () => {
    expect(lireAlertes(rapport({}))).toEqual([]);
  });

  it("refuse un texte qui n'est pas un rapport d'audit", () => {
    expect(() => lireAlertes('{"error":{"code":"ENOLOCK"}}')).toThrow("illisible");
    expect(() => lireAlertes("pas du JSON")).toThrow();
  });
});

describe("alertesNonAdmises", () => {
  it("laisse passer les alertes connues de xlsx", () => {
    expect(alertesNonAdmises(lireAlertes(rapport({ xlsx: { via: [AVIS_XLSX] } })))).toEqual([]);
    expect(ALERTES_ADMISES.has("GHSA-5pgg-2g8v-p4x9")).toBe(true);
  });

  it("retient une alerte nouvelle, même à côté d'une alerte connue", () => {
    const restantes = alertesNonAdmises(lireAlertes(rapport({ xlsx: { via: [AVIS_XLSX] }, jszip: { via: [AVIS_NOUVEAU] } })));
    expect(restantes.map((alerte) => alerte.identifiant)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
  });

  it("n'admet jamais une alerte sans identifiant", () => {
    expect(alertesNonAdmises([{ paquet: "x", identifiant: "", gravite: "high", titre: "" }], new Set([""]))).toHaveLength(1);
  });
});
