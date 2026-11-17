// SPDX-License-Identifier: CECILL-2.1
import { describe, expect, it } from "vitest";
import { attraction, distanceAuRectangle } from "./glisser-aimante";

const LIGNE = { left: 100, right: 300, top: 50, bottom: 90 };

describe("distanceAuRectangle", () => {
  it("vaut 0 sur la ligne", () => {
    expect(distanceAuRectangle(150, 60, LIGNE)).toBe(0);
  });

  it("mesure l'écart au bord le plus proche", () => {
    expect(distanceAuRectangle(150, 120, LIGNE)).toBe(30);
    expect(distanceAuRectangle(330, 130, LIGNE)).toBe(50);
  });
});

describe("attraction", () => {
  it("est entière sur la ligne et nulle à la portée de l'aimant ou au-delà", () => {
    expect(attraction(0)).toBe(1);
    expect(attraction(38)).toBe(0);
    expect(attraction(80)).toBe(0);
  });

  it("croît quand la pastille approche", () => {
    expect(attraction(10)).toBeGreaterThan(attraction(30));
  });
});
