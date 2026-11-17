// SPDX-License-Identifier: CECILL-2.1
/**
 * Glisser-déposer « à l'aimant » de l'étape Formulation : en approchant une
 * pastille d'une ligne, la ligne s'allume et la pastille vient s'y coller.
 * Lâchée à l'écart, elle peut se détacher de là où elle était.
 */

/** Distance (en pixels) à partir de laquelle une ligne attire la pastille. */
const PORTEE_AIMANT = 38;
/** Déplacement minimal (en pixels) avant qu'un appui devienne un glisser, pour laisser passer les clics. */
const SEUIL_GLISSER = 5;

export interface OptionsGlisser {
  /** Texte de la pastille qui suit le pointeur. */
  readonly libelle: string;
  /** `competence` (réunir) ou `livrable` (associer) : change l'aspect et les indications. */
  readonly nature: "competence" | "livrable";
  /** Lignes où déposer : chacune porte sa clé dans `data-drop`. */
  readonly zones: readonly HTMLElement[];
  /** Vrai si, lâchée à l'écart, la pastille se détache de là où elle était. */
  readonly detachable: boolean;
  surDepot(cle: string): void;
  surDetachement(): void;
}

/** Distance du point à un rectangle : 0 dedans. */
export function distanceAuRectangle(x: number, y: number, zone: { left: number; right: number; top: number; bottom: number }): number {
  const ecartX = Math.max(zone.left - x, 0, x - zone.right);
  const ecartY = Math.max(zone.top - y, 0, y - zone.bottom);
  return Math.hypot(ecartX, ecartY);
}

/** Force de l'aimant, de 0 (à la portée) à 1 (sur la ligne). */
export function attraction(distance: number, portee: number = PORTEE_AIMANT): number {
  return Math.pow(1 - Math.min(1, distance / portee), 1.5);
}

let glisseEnCours = false;

/** Vrai pendant un glisser et jusqu'à la fin de l'événement qui le termine : le clic qui suit est ignoré. */
export function glisserEnCours(): boolean {
  return glisseEnCours;
}

/**
 * Commence, à l'appui `evenement` sur `source`, un glisser aimanté. Un simple
 * clic (moins de 5 pixels de déplacement) ne déclenche rien.
 */
export function commencerGlisser(evenement: PointerEvent, source: HTMLElement, options: OptionsGlisser): void {
  if (evenement.button !== 0) return;
  const departX = evenement.clientX;
  const departY = evenement.clientY;
  let commence = false;
  let fantome: HTMLElement | null = null;
  let texteFantome: HTMLElement | null = null;
  let indication: HTMLElement | null = null;
  let cible: HTMLElement | null = null;

  const commencer = (): void => {
    commence = true;
    glisseEnCours = true;
    source.classList.add("dragging");
    document.body.classList.add("dragging-now");
    fantome = document.createElement("div");
    fantome.className = `dragghost ${options.nature === "competence" ? "gcomp" : "gliv"}`;
    texteFantome = document.createElement("span");
    texteFantome.className = "gtxt";
    texteFantome.textContent = options.libelle;
    indication = document.createElement("span");
    indication.className = "ghint";
    fantome.append(texteFantome, indication);
    document.body.append(fantome);
  };

  const deplacer = (mouvement: PointerEvent): void => {
    if (!commence) {
      if (Math.hypot(mouvement.clientX - departX, mouvement.clientY - departY) < SEUIL_GLISSER) return;
      commencer();
    }
    mouvement.preventDefault();
    const x = mouvement.clientX;
    const y = mouvement.clientY;
    let meilleure: HTMLElement | null = null;
    let distanceMin = Number.POSITIVE_INFINITY;
    for (const zone of options.zones) {
      const distance = distanceAuRectangle(x, y, zone.getBoundingClientRect());
      if (distance < distanceMin) {
        distanceMin = distance;
        meilleure = zone;
      }
    }
    const attire = meilleure !== null && distanceMin <= PORTEE_AIMANT;
    for (const zone of options.zones) zone.classList.toggle("magnet", attire && zone === meilleure);
    cible = attire ? meilleure : null;
    let positionX = x + 14;
    let positionY = y + 10;
    if (cible !== null) {
      const zone = cible.getBoundingClientRect();
      const force = attraction(distanceMin) * 0.9;
      positionX += (zone.left + 26 - positionX) * force;
      positionY += (zone.top + 18 - positionY) * force;
    }
    if (fantome === null || indication === null) return;
    fantome.style.transform = `translate(${String(positionX)}px,${String(positionY)}px)`;
    fantome.classList.toggle("snap", attire);
    fantome.classList.toggle("off", !attire && options.detachable);
    indication.textContent = attire
      ? options.nature === "competence"
        ? "réunir ici"
        : "associer ici"
      : options.detachable
        ? options.nature === "competence"
          ? "détacher du groupe"
          : "retirer de la ligne"
        : "";
  };

  const terminer = (): void => {
    document.removeEventListener("pointermove", deplacer);
    document.removeEventListener("pointerup", terminer);
    document.removeEventListener("pointercancel", terminer);
    if (!commence) return;
    source.classList.remove("dragging");
    document.body.classList.remove("dragging-now");
    fantome?.remove();
    for (const zone of options.zones) zone.classList.remove("magnet");
    // Le clic qui suit le relâchement ne doit pas compter comme un clic sur la pastille.
    setTimeout(() => {
      glisseEnCours = false;
    }, 0);
    const cle = cible?.dataset.drop;
    if (cle !== undefined) {
      options.surDepot(cle);
    } else if (options.detachable) {
      options.surDetachement();
    }
  };

  document.addEventListener("pointermove", deplacer, { passive: false });
  document.addEventListener("pointerup", terminer);
  document.addEventListener("pointercancel", terminer);
}
