// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { decoderCode, encoderCode, garderServeursStun, sommeControle, type ContenuCode } from "./code-direct";

/** Description de session factice, de la forme d'une vraie (aucune adresse réelle). */
const DESCRIPTION = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "a=candidate:1 1 udp 2113937151 poste-fictif.local 54400 typ host",
  "a=fingerprint:sha-256 AB:CD:EF",
  "",
].join("\r\n");

const INVITATION: ContenuCode = { role: "invitation", seance: "seance-01234567", description: DESCRIPTION };

describe("code de l'échange en direct", () => {
  it("relit le contenu qu'il a encodé", () => {
    expect(decoderCode(encoderCode(INVITATION), "invitation")).toEqual(INVITATION);
  });

  it("produit un code d'un seul tenant, sans espace ni caractère à échapper", () => {
    expect(encoderCode(INVITATION)).toMatch(/^DNMAX-DIRECT:1:[A-Za-z0-9_-]+:[0-9a-f]{8}$/);
  });

  it("garde les caractères accentués de la description", () => {
    const contenu = { ...INVITATION, description: `${DESCRIPTION}a=note:élève\r\n` };
    expect(decoderCode(encoderCode(contenu), "invitation")).toEqual(contenu);
  });

  it("tolère les espaces, retours à la ligne et guillemets ajoutés par une messagerie", () => {
    const code = encoderCode(INVITATION);
    const abime = `  « ${code.slice(0, 30)}\r\n${code.slice(30, 61)} \n> ${code.slice(61)} ».\n`;
    expect(decoderCode(abime, "invitation")).toEqual(INVITATION);
  });

  it("signale un code tronqué", () => {
    const code = encoderCode(INVITATION);
    expect(decoderCode(code.slice(0, code.length - 20), "invitation")).toBe("incomplet");
  });

  it("signale un code amputé de sa somme de contrôle", () => {
    const code = encoderCode(INVITATION);
    expect(decoderCode(code.slice(0, code.lastIndexOf(":")), "invitation")).toBe("incomplet");
  });

  it("signale un caractère mal recopié", () => {
    const code = encoderCode(INVITATION);
    const position = 40;
    const remplace = code.charAt(position) === "A" ? "B" : "A";
    expect(decoderCode(code.slice(0, position) + remplace + code.slice(position + 1), "invitation")).toBe("incomplet");
  });

  it("refuse un texte qui n'est pas un code DNMAX", () => {
    expect(decoderCode("Bonjour, voici le code !", "invitation")).toBe("prefixe-inconnu");
    expect(decoderCode(encoderCode(INVITATION).replace("DNMAX-DIRECT", "AUTRE-CODE"), "invitation")).toBe(
      "prefixe-inconnu",
    );
  });

  it("signale un code d'une version inconnue", () => {
    expect(decoderCode(encoderCode(INVITATION).replace(":1:", ":2:"), "invitation")).toBe("version-inconnue");
  });

  it("signale un collage vide", () => {
    expect(decoderCode(" \n\t ", "invitation")).toBe("vide");
  });

  it("signale une invitation collée à la place d'une réponse", () => {
    expect(decoderCode(encoderCode(INVITATION), "reponse")).toBe("mauvais-role");
  });

  it("refuse un code complet dont le contenu n'est pas une description de session", () => {
    const charge = btoa(JSON.stringify({ r: "invitation", s: "seance-01234567", d: "<script>" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decoderCode(`DNMAX-DIRECT:1:${charge}:${sommeControle(charge)}`, "invitation")).toBe("illisible");
  });

  it("refuse un identifiant de séance hors de la forme attendue", () => {
    const code = encoderCode({ ...INVITATION, seance: "court" });
    expect(decoderCode(code, "invitation")).toBe("illisible");
  });

  it("refuse une charge qui n'est pas du JSON", () => {
    const charge = "bm9uLWpzb24";
    expect(decoderCode(`DNMAX-DIRECT:1:${charge}:${sommeControle(charge)}`, "invitation")).toBe("illisible");
  });

  it("refuse un texte démesuré sans l'analyser", () => {
    expect(decoderCode("A".repeat(200 * 1024), "invitation")).toBe("illisible");
  });
});

describe("somme de contrôle", () => {
  it("est la CRC-32 du texte lu en UTF-16 petit-boutiste", () => {
    // Valeur de référence : CRC-32 des octets 61 00 62 00 63 00 (« abc » en UTF-16LE).
    expect(sommeControle("abc")).toBe("ad957ab0");
  });

  it("distingue deux caractères de même octet faible", () => {
    expect(sommeControle("\u00e9")).not.toBe(sommeControle("\u01e9"));
  });

  it("vaut 00000000 pour un texte vide", () => {
    expect(sommeControle("")).toBe("00000000");
  });
});

describe("serveurs de connexion", () => {
  it("garde les serveurs STUN", () => {
    expect(garderServeursStun(["stun:stun.exemple.fr:3478", "stun:stun.exemple.fr"])).toEqual([
      "stun:stun.exemple.fr:3478",
      "stun:stun.exemple.fr",
    ]);
  });

  it("écarte tout serveur relais, par lequel les données transiteraient", () => {
    expect(garderServeursStun(["turn:relais.exemple.fr:3478", "turns:relais.exemple.fr:5349", "stun:a.fr"])).toEqual([
      "stun:a.fr",
    ]);
  });

  it("écarte une adresse qui embarque des paramètres ou des identifiants", () => {
    expect(garderServeursStun(["stun:a.fr?transport=tcp", "stun:moi@a.fr", ""])).toEqual([]);
  });
});
