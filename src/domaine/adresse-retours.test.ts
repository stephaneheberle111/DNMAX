// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { construireAdresseRetours, deduireSysteme } from "./adresse-retours";

const ADRESSE = "https://dnmax.fr/#idees";

describe("construireAdresseRetours", () => {
  it("transmet une version valide et le système, en gardant l'ancre", () => {
    expect(construireAdresseRetours(ADRESSE, "0.2.0", "Linux")).toBe("https://dnmax.fr/?version=0.2.0&systeme=Linux#idees");
  });

  it("omet une version vide", () => {
    expect(construireAdresseRetours(ADRESSE, "", "Windows")).toBe("https://dnmax.fr/?systeme=Windows#idees");
  });

  it("omet une version qui ne suit pas le motif X.Y.Z", () => {
    expect(construireAdresseRetours(ADRESSE, "0.3.0-beta&x=1", "macOS")).toBe("https://dnmax.fr/?systeme=macOS#idees");
  });

  it("rend l'adresse de départ sans version ni système", () => {
    expect(construireAdresseRetours(ADRESSE, "", null)).toBe(ADRESSE);
  });
});

describe("deduireSysteme", () => {
  it("reconnaît Windows, macOS et Linux", () => {
    expect(deduireSysteme("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")).toBe("Windows");
    expect(deduireSysteme("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15")).toBe("macOS");
    expect(deduireSysteme("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15")).toBe("Linux");
  });

  it("rend null pour un système inconnu", () => {
    expect(deduireSysteme("Mozilla/5.0 (FreeBSD amd64)")).toBeNull();
    expect(deduireSysteme("")).toBeNull();
  });
});
