// SPDX-License-Identifier: AGPL-3.0-or-later
import "./ecran-verrouillage.css";
import { DELAI_VERROUILLAGE_INACTIVITE_MS, INTERVALLE_CONTROLE_INACTIVITE_MS } from "./configuration";
import { SurveillanceInactivite } from "./domaine/securite";
import { verrouillerCoffre } from "./enveloppe";

/**
 * Marque laissée dans le stockage de session de la page, le temps d'un
 * rechargement, pour expliquer à l'enseignant pourquoi son mot de passe est
 * redemandé. Elle ne contient aucune donnée.
 */
const CLE_VERROUILLAGE = "dnmax.verrouille-par-inactivite";

/** Ce qui compte comme une action de l'enseignant. */
const EVENEMENTS_ACTIVITE = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/** Ce que la surveillance demande à l'application. */
export interface OptionsVerrouillage {
  /** Vrai si le verrouillage s'applique en ce moment (module Élèves actif). */
  verrouillageExige: () => boolean;
  /**
   * Écrit tout ce qui est en attente ; rend `false` si une écriture a échoué,
   * auquel cas l'application ne se verrouille pas, pour ne rien perdre.
   */
  ecrireEnAttente: () => Promise<boolean>;
}

function noterVerrouillage(): void {
  try {
    sessionStorage.setItem(CLE_VERROUILLAGE, "1");
  } catch {
    // Sans stockage de session, l'écran d'ouverture s'affiche simplement sans explication.
  }
}

/** Vrai si la page vient d'être rechargée par un verrouillage après inactivité ; la marque est effacée. */
export function lireVerrouillageParInactivite(): boolean {
  try {
    const marque = sessionStorage.getItem(CLE_VERROUILLAGE) !== null;
    sessionStorage.removeItem(CLE_VERROUILLAGE);
    return marque;
  } catch {
    return false;
  }
}

/**
 * Écrit ce qui est en attente, referme les données dans l'enveloppe, puis
 * recharge la page : tout ce qu'elle tenait en mémoire disparaît et le mot de
 * passe est redemandé.
 *
 * @returns `false` si le verrouillage n'a pas pu se faire (écriture ou enveloppe en échec).
 */
async function verrouiller(options: OptionsVerrouillage): Promise<boolean> {
  // Le voile cache les données tout de suite et arrête les clics ; quitter le
  // champ en cours de saisie le fait enregistrer avant l'écriture qui suit.
  const voile = document.createElement("div");
  voile.className = "voile-verrouillage";
  voile.textContent = "Verrouillage…";
  document.body.append(voile);
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  try {
    if (!(await options.ecrireEnAttente())) {
      voile.remove();
      return false;
    }
    await verrouillerCoffre();
  } catch {
    voile.remove();
    return false;
  }
  noterVerrouillage();
  window.location.reload();
  return true;
}

/**
 * Verrouille l'application après `DELAI_VERROUILLAGE_INACTIVITE_MS` sans
 * action de l'enseignant, tant que `verrouillageExige` le demande.
 */
export function surveillerInactivite(options: OptionsVerrouillage): void {
  const surveillance = new SurveillanceInactivite(
    DELAI_VERROUILLAGE_INACTIVITE_MS,
    () => Date.now(),
    options.verrouillageExige,
  );
  let verrouillageEnCours = false;
  const controler = (): void => {
    if (verrouillageEnCours || !surveillance.estExpiree()) {
      return;
    }
    verrouillageEnCours = true;
    void verrouiller(options).then((verrouille) => {
      if (!verrouille) {
        // Le bandeau d'enregistrement signale déjà l'échec ; on réessaiera après un nouveau délai.
        surveillance.repartir();
        verrouillageEnCours = false;
      }
    });
  };
  for (const type of EVENEMENTS_ACTIVITE) {
    document.addEventListener(
      type,
      () => {
        surveillance.signalerActivite();
        controler();
      },
      { capture: true, passive: true },
    );
  }
  // Au retour sur la fenêtre (après une mise en veille, par exemple), sans attendre le prochain contrôle.
  document.addEventListener("visibilitychange", controler);
  window.addEventListener("focus", controler);
  window.setInterval(controler, INTERVALLE_CONTROLE_INACTIVITE_MS);
}
