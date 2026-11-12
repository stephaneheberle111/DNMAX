// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErreurDirect, Expediteur, configurationConnexion, type ParametresDirect } from "./canal-direct";

const PARAMETRES: ParametresDirect = {
  delais: { rassemblement: 1_000, attenteCorrespondant: 1_000, connexion: 1_000, inactivite: 1_000 },
  tailleMaximale: 1_000,
};

/** Configurations reçues par la fausse connexion, pour vérifier ce que DNMAX demande au navigateur. */
const configurationsRecues: RTCConfiguration[] = [];

/** Connexion simulée : rassemble ses candidats aussitôt, sans aucun accès au réseau. */
class FausseConnexion extends EventTarget {
  iceGatheringState: RTCIceGatheringState = "complete";
  localDescription: RTCSessionDescriptionInit | null = null;

  constructor(configuration: RTCConfiguration) {
    super();
    configurationsRecues.push(configuration);
  }

  createDataChannel(): object {
    return {};
  }

  createOffer(): Promise<RTCSessionDescriptionInit> {
    return Promise.resolve({ type: "offer", sdp: "v=0\r\n" });
  }

  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description;
    return Promise.resolve();
  }

  close(): void {
    // Rien à fermer : aucune connexion réelle.
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  configurationsRecues.length = 0;
});

describe("configurationConnexion", () => {
  it("ne déclare aucun serveur, ni de découverte d'adresse ni relais", () => {
    expect(configurationConnexion().iceServers).toEqual([]);
  });

  it("rend une configuration neuve à chaque appel", () => {
    const premiere = configurationConnexion();
    premiere.iceServers?.push({ urls: "stun:exemple.invalid" });
    expect(configurationConnexion().iceServers).toEqual([]);
  });
});

describe("Expediteur.preparer", () => {
  it("ouvre la connexion sans aucun serveur", async () => {
    vi.stubGlobal("RTCPeerConnection", FausseConnexion);
    const expediteur = await Expediteur.preparer(PARAMETRES);
    expect(configurationsRecues).toHaveLength(1);
    expect(configurationsRecues[0]?.iceServers).toEqual([]);
    expect(expediteur.codeInvitation.startsWith("DNMAX-DIRECT:")).toBe(true);
  });

  it("échoue en « indisponible » quand l'afficheur web ne connaît pas WebRTC", async () => {
    vi.stubGlobal("RTCPeerConnection", undefined);
    await expect(Expediteur.preparer(PARAMETRES)).rejects.toEqual(new ErreurDirect("indisponible"));
  });
});
