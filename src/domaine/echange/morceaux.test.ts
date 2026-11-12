// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { Reassembleur, TAILLE_MORCEAU, preparerMessages } from "./morceaux";

const TAILLE_MAXIMALE = 1024 * 1024;

function transmettre(messages: readonly unknown[], tailleMaximale = TAILLE_MAXIMALE): ReturnType<Reassembleur["recevoir"]> {
  const reassembleur = new Reassembleur(tailleMaximale);
  let etat: ReturnType<Reassembleur["recevoir"]> = { etat: "erreur", erreur: "message-invalide" };
  for (const message of messages) {
    etat = reassembleur.recevoir(message);
    if (etat.etat !== "en-cours") {
      break;
    }
  }
  return etat;
}

describe("découpage en messages", () => {
  it("restitue un texte de plusieurs morceaux à l'identique", () => {
    const texte = `{"format":"dnmax-echange","titre":"Évaluation « mobilier »"}`.repeat(200);
    const messages = preparerMessages(texte);
    expect(messages.length).toBeGreaterThan(3);
    expect(transmettre(messages)).toEqual({ etat: "complet", texte });
  });

  it("garde chaque message sous 16 Kio une fois encodé, même plein de caractères à échapper", () => {
    const texte = "\u0001\"é😀".repeat(3 * TAILLE_MORCEAU);
    for (const message of preparerMessages(texte)) {
      expect(new TextEncoder().encode(message).length).toBeLessThanOrEqual(16 * 1024);
    }
    expect(transmettre(preparerMessages(texte))).toEqual({ etat: "complet", texte });
  });

  it("ne coupe pas un caractère hors du plan de base entre deux morceaux", () => {
    const texte = `${"a".repeat(TAILLE_MORCEAU - 1)}😀fin`;
    const messages = preparerMessages(texte).map((message) => JSON.parse(message) as { d?: string });
    expect(messages[1]?.d).toBe("a".repeat(TAILLE_MORCEAU - 1));
    expect(transmettre(preparerMessages(texte))).toEqual({ etat: "complet", texte });
  });

  it("transmet un texte vide", () => {
    expect(transmettre(preparerMessages(""))).toEqual({ etat: "complet", texte: "" });
  });

  it("annonce la progression", () => {
    const reassembleur = new Reassembleur(TAILLE_MAXIMALE);
    const [enTete, premier] = preparerMessages("x".repeat(TAILLE_MORCEAU * 2));
    expect(reassembleur.recevoir(enTete)).toEqual({ etat: "en-cours", recus: 0, total: 2 });
    expect(reassembleur.recevoir(premier)).toEqual({ etat: "en-cours", recus: 1, total: 2 });
  });
});

describe("réassemblage de messages reçus", () => {
  it("refuse un texte annoncé au-delà de la taille admise", () => {
    expect(transmettre(preparerMessages("x".repeat(101)), 100)).toEqual({ etat: "erreur", erreur: "trop-volumineux" });
  });

  it("signale un morceau manquant", () => {
    const messages = preparerMessages("x".repeat(TAILLE_MORCEAU * 3));
    expect(transmettre(messages.filter((_, rang) => rang !== 2))).toEqual({ etat: "erreur", erreur: "message-invalide" });
  });

  it("signale une fin arrivée avant tous les morceaux", () => {
    const messages = preparerMessages("x".repeat(TAILLE_MORCEAU * 3));
    expect(transmettre([messages[0], messages[1], messages.at(-1)])).toEqual({ etat: "erreur", erreur: "incomplet" });
  });

  it("signale un contenu altéré en route", () => {
    const messages = preparerMessages("abcdef");
    const altere = messages.map((message) => message.replace("abcdef", "abcdeF"));
    expect(transmettre(altere)).toEqual({ etat: "erreur", erreur: "incomplet" });
  });

  it("refuse un morceau sans en-tête", () => {
    const [, morceau] = preparerMessages("abc");
    expect(transmettre([morceau])).toEqual({ etat: "erreur", erreur: "message-invalide" });
  });

  it("refuse un message qui n'est pas du texte JSON attendu", () => {
    for (const message of [new ArrayBuffer(4), "pas du json", "null", '{"t":"autre"}', '{"t":"debut","taille":-1,"morceaux":0,"controle":"x"}']) {
      expect(transmettre([message])).toEqual({ etat: "erreur", erreur: "message-invalide" });
    }
  });

  it("refuse un en-tête qui annonce trop peu de morceaux pour sa taille", () => {
    const enTete = JSON.stringify({ t: "debut", taille: TAILLE_MORCEAU * 3, morceaux: 1, controle: "00000000" });
    expect(transmettre([enTete])).toEqual({ etat: "erreur", erreur: "message-invalide" });
  });

  it("refuse des morceaux qui dépassent la taille annoncée", () => {
    const enTete = JSON.stringify({ t: "debut", taille: 2, morceaux: 1, controle: "00000000" });
    const morceau = JSON.stringify({ t: "morceau", n: 0, d: "abc" });
    expect(transmettre([enTete, morceau])).toEqual({ etat: "erreur", erreur: "incomplet" });
  });

  it("refuse tout message après un texte complet", () => {
    const reassembleur = new Reassembleur(TAILLE_MAXIMALE);
    for (const message of preparerMessages("abc")) {
      reassembleur.recevoir(message);
    }
    expect(reassembleur.recevoir(preparerMessages("abc")[0])).toEqual({ etat: "erreur", erreur: "message-invalide" });
  });
});
