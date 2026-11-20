// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { conseilsSelonSysteme } from "./bonnes-pratiques";

describe("conseilsSelonSysteme", () => {
  it("ne cite que les conseils du système reconnu", () => {
    const conseils = conseilsSelonSysteme("Windows");
    expect(conseils.verrouillage).toBe("Windows + L");
    expect(conseils.chiffrement).toContain("BitLocker");
    expect(conseils.chiffrement).not.toContain("FileVault");
    expect(conseils.chiffrement).not.toContain("LUKS");
  });

  it("donne à chaque système son propre raccourci et son propre chiffrement", () => {
    expect(conseilsSelonSysteme("macOS")).toEqual({
      verrouillage: "Ctrl + Cmd + Q",
      chiffrement: "FileVault s'active dans Réglages Système > Confidentialité et sécurité",
    });
    expect(conseilsSelonSysteme("Linux").verrouillage).toBe("Super + L");
    expect(conseilsSelonSysteme("Linux").chiffrement).toContain("LUKS");
  });

  it("cite les trois systèmes, chacun nommé, quand le système n'est pas reconnu", () => {
    const conseils = conseilsSelonSysteme(null);
    expect(conseils.verrouillage).toBe("Windows + L (Windows), Ctrl + Cmd + Q (macOS), Super + L (Linux)");
    expect(conseils.chiffrement).toContain("Windows : BitLocker");
    expect(conseils.chiffrement).toContain("macOS : FileVault");
    expect(conseils.chiffrement).toContain("Linux : LUKS");
  });
});
