// SPDX-License-Identifier: AGPL-3.0-or-later
import { estObjet, type ObjetJson } from "./echange/modele";

/**
 * Changer le numéro d'un bloc de compétences.
 *
 * Une compétence désigne son bloc par le numéro de celui-ci, pas par son
 * identifiant ; le numéro lui-même est rangé dans le dictionnaire, commun à
 * toutes les mentions. Renuméroter un bloc doit donc aussi faire suivre les
 * compétences qui le désignaient, dans chaque référentiel qui le retient et
 * dans les versions datées, sans quoi elles se retrouveraient « sans bloc ».
 */

export type RefusRenumerotation = "vide" | "doublon" | "inconnu";

export type Renumerotation =
  | { readonly modifie: true; readonly donnees: ObjetJson }
  | { readonly modifie: false; readonly refus: RefusRenumerotation | null };

function texte(valeur: unknown): string {
  if (typeof valeur === "string") {
    return valeur.trim();
  }
  return typeof valeur === "number" ? String(valeur) : "";
}

function liste(valeur: unknown): unknown[] {
  return Array.isArray(valeur) ? valeur : [];
}

function identifiant(element: unknown): string {
  return estObjet(element) ? texte(element.id) : "";
}

/** Vrai si le référentiel (ou l'instantané d'une version) retient ce bloc. */
function retientBloc(referentiel: unknown, blocId: string): boolean {
  return estObjet(referentiel) && liste(referentiel.blocs).some((bloc) => identifiant(bloc) === blocId);
}

/** Numéros des autres blocs retenus par ce référentiel, lus dans le dictionnaire. */
function autresNumeros(referentiel: ObjetJson, blocId: string, numeros: ReadonlyMap<string, string>): string[] {
  return liste(referentiel.blocs)
    .map(identifiant)
    .filter((id) => id !== "" && id !== blocId)
    .map((id) => numeros.get(id) ?? "");
}

/** Copie du référentiel où les compétences du bloc `ancien` passent au bloc `nouveau`. */
function faireSuivre(referentiel: ObjetJson, ancien: string, nouveau: string): ObjetJson {
  const competences = liste(referentiel.competences).map((competence) =>
    estObjet(competence) && texte(competence.bloc) === ancien ? { ...competence, bloc: nouveau } : competence,
  );
  return { ...referentiel, competences };
}

/**
 * Donne au bloc `blocId` le numéro `nouveau`, dans les données de
 * l'établissement (`dnmade.data`, référentiel de travail déjà enregistré).
 *
 * Refuse un numéro vide, un numéro déjà porté par un autre bloc d'un
 * référentiel qui retient celui-ci (les compétences des deux blocs se
 * confondraient), et un bloc absent du dictionnaire. Rend
 * `{ modifie: false, refus: null }` si le numéro ne change pas. Ne modifie
 * pas les données reçues.
 */
export function renumeroterBloc(donnees: unknown, blocId: string, nouveau: string): Renumerotation {
  const racine = estObjet(donnees) ? donnees : {};
  const dico = estObjet(racine.dico) ? racine.dico : {};
  const blocs = liste(dico.blocs);
  const bloc = blocs.find((candidat) => identifiant(candidat) === blocId);
  if (blocId === "" || !estObjet(bloc)) {
    return { modifie: false, refus: "inconnu" };
  }
  const numero = texte(nouveau);
  if (numero === "") {
    return { modifie: false, refus: "vide" };
  }
  const ancien = texte(bloc.num);
  if (numero === ancien) {
    return { modifie: false, refus: null };
  }

  const numeros = new Map<string, string>();
  blocs.forEach((candidat) => {
    if (estObjet(candidat)) {
      numeros.set(identifiant(candidat), texte(candidat.num));
    }
  });
  const refs = estObjet(racine.refs) ? racine.refs : {};
  const versions = estObjet(racine.versions) ? racine.versions : {};
  const instantanes = Object.values(versions).flatMap((parDiplome) =>
    liste(parDiplome).map((version) => (estObjet(version) ? version.snap : undefined)),
  );
  const concernes = [...Object.values(refs), ...instantanes].filter(
    (referentiel): referentiel is ObjetJson => estObjet(referentiel) && retientBloc(referentiel, blocId),
  );
  if (concernes.some((referentiel) => autresNumeros(referentiel, blocId, numeros).includes(numero))) {
    return { modifie: false, refus: "doublon" };
  }

  const suivre = (referentiel: unknown): unknown =>
    estObjet(referentiel) && retientBloc(referentiel, blocId) ? faireSuivre(referentiel, ancien, numero) : referentiel;
  const nouveauxRefs = Object.fromEntries(Object.entries(refs).map(([id, referentiel]) => [id, suivre(referentiel)]));
  const nouvellesVersions = Object.fromEntries(
    Object.entries(versions).map(([id, parDiplome]) => [
      id,
      Array.isArray(parDiplome)
        ? parDiplome.map((version: unknown) =>
            estObjet(version) && estObjet(version.snap) ? { ...version, snap: suivre(version.snap) } : version,
          )
        : parDiplome,
    ]),
  );
  const nouveauDico = {
    ...dico,
    blocs: blocs.map((candidat) => (identifiant(candidat) === blocId ? { ...bloc, num: numero } : candidat)),
  };
  const resultat: ObjetJson = { ...racine, dico: nouveauDico, refs: nouveauxRefs };
  if (estObjet(racine.versions)) {
    resultat.versions = nouvellesVersions;
  }
  return { modifie: true, donnees: resultat };
}
