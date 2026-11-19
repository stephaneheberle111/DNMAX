// SPDX-License-Identifier: CECILL-2.1
/**
 * Mon établissement > Diplômes et mentions : code et libellé d'un diplôme,
 * regroupement des mentions, création et suppression. Règles reprises telles
 * quelles de l'ancienne interface ; les données sont modifiées sur place,
 * comme elle les tient.
 */

type Diplome = Record<string, unknown>;

function texte(valeur: unknown): string {
  return typeof valeur === "string" ? valeur : typeof valeur === "number" && valeur !== 0 ? String(valeur) : "";
}

function champ(diplome: unknown, cle: string): unknown {
  return typeof diplome === "object" && diplome !== null ? (diplome as Diplome)[cle] : undefined;
}

/** Code composé seul : deux lettres du diplôme et une de la mention, en capitales (DN MADE mention Objet : DNO). */
export function codeAutomatique(diplome: unknown): string {
  const lettres = (valeur: unknown, nombre: number): string =>
    texte(valeur)
      .replace(/[^A-Za-zÀ-ÿ]/g, "")
      .slice(0, nombre)
      .toUpperCase();
  return lettres(champ(diplome, "nom"), 2) + lettres(champ(diplome, "mention"), 1);
}

/** Code du diplôme : celui écrit par l'enseignant, sinon le code automatique. */
export function codeDiplome(diplome: unknown): string {
  return texte(champ(diplome, "code")).trim() || codeAutomatique(diplome);
}

/** « DN MADE mention Objet » ; sans mention, le seul nom du diplôme. */
export function libelleDiplome(diplome: unknown): string {
  if (typeof diplome !== "object" || diplome === null) return "";
  const mention = texte(champ(diplome, "mention"));
  return texte(champ(diplome, "nom")) + (mention === "" ? "" : ` mention ${mention}`);
}

/** Les mentions d'un même diplôme, et le rang de chacune parmi tous les diplômes. */
export interface GroupeDiplome {
  readonly cle: string;
  /** Nom du diplôme, modifié par la saisie. */
  nom: string;
  readonly mentions: { readonly diplome: Diplome; readonly rang: number }[];
}

/**
 * Réunit les mentions visibles d'un même diplôme, reconnu à son nom sans
 * tenir compte de la casse ni des espaces autour, dans l'ordre d'apparition.
 */
export function grouperDiplomes(visibles: readonly Diplome[], tous: readonly Diplome[]): GroupeDiplome[] {
  const groupes: GroupeDiplome[] = [];
  for (const diplome of visibles) {
    const cle = texte(diplome.nom).trim().toLowerCase();
    let groupe = groupes.find((candidat) => candidat.cle === cle);
    if (groupe === undefined) {
      groupe = { cle, nom: texte(diplome.nom), mentions: [] };
      groupes.push(groupe);
    }
    groupe.mentions.push({ diplome, rang: tous.indexOf(diplome) });
  }
  return groupes;
}

/**
 * Crée un diplôme de trois ans, « Nouveau diplôme ». Le cadre caché d'une
 * installation neuve devient ce diplôme, plutôt que d'en ajouter un second.
 *
 * @returns le diplôme créé ou repris
 */
export function nouveauDiplome(diplomes: Diplome[], estCadreVierge: (id: unknown) => boolean, nouvelIdentifiant: () => string): Diplome {
  const cadre = diplomes.find((diplome) => estCadreVierge(diplome.id));
  const diplome = Object.assign(cadre ?? { id: nouvelIdentifiant() }, { nom: "Nouveau diplôme", mention: "", code: "", duree: 3 });
  delete (diplome as Diplome).cadre;
  if (cadre === undefined) diplomes.push(diplome);
  return diplome;
}

/**
 * Retire la mention au rang donné et son référentiel ; si elle était active,
 * la première mention restante le devient. Un rang absent ne change rien.
 */
export function supprimerDiplome(donnees: { diplomes: Diplome[]; refs?: Record<string, unknown>; activeDiplome?: unknown }, rang: number): void {
  const [retire] = donnees.diplomes.splice(rang, 1);
  if (retire === undefined) return;
  if (donnees.refs !== undefined) Reflect.deleteProperty(donnees.refs, texte(retire.id));
  if (donnees.activeDiplome === retire.id) donnees.activeDiplome = texte(donnees.diplomes[0]?.id);
}
