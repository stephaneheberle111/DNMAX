// SPDX-License-Identifier: AGPL-3.0-or-later
import { CLE_DONNEES, lireDonneesEtablissement } from "../domaine/echange/modele";
import { calculerEmpreinteReferentiel, type ReferentielLocal } from "../domaine/echange/referentiel";
import type { Entrees } from "../domaine/magasin-memoire";

/**
 * Dresse la liste des référentiels présents sur ce poste, avec leur empreinte :
 * pour chaque diplôme, son référentiel de travail et chacune de ses versions validées.
 *
 * Le contenu lisible de chaque référentiel est demandé à l'interface
 * historique, seule à savoir le reconstituer à partir de son dictionnaire.
 * Un référentiel qu'elle ne sait pas fournir est laissé de côté.
 */
export async function dresserCatalogue(entrees: Entrees): Promise<ReferentielLocal[]> {
  const projeter = window.dnmaxPont?.projeterReferentiel;
  if (projeter === undefined) {
    return [];
  }
  const donnees = lireDonneesEtablissement(entrees[CLE_DONNEES]);
  const catalogue: ReferentielLocal[] = [];
  for (const diplome of donnees.diplomes) {
    const versions = [{ id: "", date: "" }, ...(donnees.versions.get(diplome.id) ?? [])];
    for (const version of versions) {
      const contenu = projeter(diplome.id, version.id);
      if (contenu !== null && contenu !== undefined) {
        catalogue.push({
          diplomeId: diplome.id,
          diplome: diplome.nom,
          mention: diplome.mention,
          versionId: version.id,
          dateVersion: version.date,
          empreinte: await calculerEmpreinteReferentiel(contenu),
        });
      }
    }
  }
  return catalogue;
}
