// SPDX-License-Identifier: AGPL-3.0-or-later

/** Rectangle à l'écran, en pixels. */
export interface Rectangle {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Position du coin gauche-haut de la bulle. */
export interface Coin {
  readonly gauche: number;
  readonly haut: number;
}

function recouvrement(a: Rectangle, b: Rectangle): number {
  const largeur = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const hauteur = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return largeur > 0 && hauteur > 0 ? largeur * hauteur : 0;
}

/**
 * Choisit le coin de la fenêtre où ranger la bulle de la visite : en bas à droite
 * de préférence, mais jamais sur les éléments à cliquer. Les boutons principaux de
 * l'application sont alignés à droite, en bas : sans ce choix, la bulle les cachait.
 * Si tous les coins recouvrent ces éléments, garde celui qui en cache le moins.
 */
export function choisirCoin(
  bulle: { readonly width: number; readonly height: number },
  fenetre: { readonly width: number; readonly height: number; readonly piedPage: number },
  evite: readonly Rectangle[],
  marge: number,
): Coin {
  const droite = fenetre.width - bulle.width - marge;
  const bas = fenetre.height - fenetre.piedPage - bulle.height - marge;
  const coins: readonly Coin[] = [
    { gauche: droite, haut: bas },
    { gauche: marge, haut: bas },
    { gauche: droite, haut: marge },
    { gauche: marge, haut: marge },
  ];
  let meilleur = coins[0] as Coin;
  let plusPetit = Number.POSITIVE_INFINITY;
  for (const coin of coins) {
    const place = { left: coin.gauche, top: coin.haut, width: bulle.width, height: bulle.height };
    const cache = evite.reduce((total, zone) => total + recouvrement(place, zone), 0);
    if (cache < plusPetit) {
      plusPetit = cache;
      meilleur = coin;
    }
    if (cache === 0) {
      break;
    }
  }
  return meilleur;
}
