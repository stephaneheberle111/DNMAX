// SPDX-License-Identifier: CECILL-2.1
/**
 * « Charger un exemple » sans référentiel installé : l'exemple apporte le
 * référentiel DN MADE mention Objet livré avec DNMAX, installé par le même
 * circuit qu'à la bienvenue (un fichier reçu, tout accepté).
 */
import { diplomeDeVersion } from "../domaine/bienvenue";
import { lirePaquet } from "../domaine/echange/paquet";
import { appliquerReferentiels, calculerPlanReferentiels } from "../domaine/echange/plan-referentiels";
import type { Entrees } from "../domaine/magasin-memoire";
import { REFERENTIELS_EMBARQUES } from "../referentiels-embarques";
import { dresserCatalogue } from "./referentiels";

const LONGUEUR_IDENTIFIANT = 9;

/**
 * Installe le référentiel Objet livré dans les entrées du magasin et rend
 * l'identifiant du diplôme installé (ou `null` s'il n'a pu être retrouvé).
 * Seules les entrées modifiées sont réécrites.
 */
export async function installerReferentielExemple(
  magasin: { entrees(): Entrees; setItem(cle: string, valeur: string): void },
  maintenant: Date,
): Promise<string | null> {
  const referentiel = REFERENTIELS_EMBARQUES.find((candidat) => candidat.mention === "Objet");
  if (referentiel === undefined) throw new Error("référentiel de l'exemple introuvable");
  const paquet = lirePaquet(referentiel.texte);
  if (typeof paquet === "string") throw new Error(`référentiel de l'exemple illisible (${paquet})`);
  const entrees = magasin.entrees();
  const lignes = calculerPlanReferentiels(paquet, await dresserCatalogue(entrees));
  const { entrees: apres, versionsCreees } = appliquerReferentiels(
    entrees,
    lignes,
    new Set(lignes.filter((ligne) => ligne.action !== "aucune").map((ligne) => ligne.identifiant)),
    {
      dateDuJour: maintenant.toISOString().slice(0, "AAAA-MM-JJ".length),
      note: "Livré avec DNMAX, installé par l'exemple",
      genererIdentifiant: (partie) => `${partie.charAt(0)}${crypto.randomUUID().replaceAll("-", "").slice(0, LONGUEUR_IDENTIFIANT)}`,
    },
  );
  for (const [cle, valeur] of Object.entries(apres)) {
    if (entrees[cle] !== valeur) magasin.setItem(cle, valeur);
  }
  const version = [...versionsCreees.values()][0];
  return version === undefined ? lignes[0]?.diplomeId || null : diplomeDeVersion(apres, version);
}
