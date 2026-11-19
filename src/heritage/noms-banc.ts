// SPDX-License-Identifier: CECILL-2.1
/**
 * Fonctions que le banc de comparaison (`outils/banc/banc.cjs`) appelle dans
 * la page, sous leurs noms de l'ancienne interface (décision 38). Les modules
 * de `interface/` s'appellent entre eux par des imports : ces noms ne sont
 * publiés sur la fenêtre que pour le banc, qui rejoue les mêmes gestes sur
 * `main` et sur une branche. Le garde-fou `appels-historiques.test.ts` vérifie
 * que la liste suit ce que le banc appelle, ni plus ni moins.
 */
import { paintTabs } from "../interface/aides-communes";
import { materialize, saveData } from "../interface/donnees";
import { allerALEtape, peindreLignes } from "../interface/editeur";
import { nouvelleEvaluation, peindreCompetencesChoisies, peindreFormulaire } from "../interface/editeur-etape1";
import { peindreEtablissement } from "../interface/etablissement";
import { migF } from "../interface/evaluation-courante";
import { peindreEvaluations } from "../interface/evaluations";
import { chargerExemple } from "../interface/exemple";
import { avertirAvantRestitution, exporterEvaluation } from "../interface/export-document";
import { paintPrefs, paintSet } from "../interface/preferences-parametres";
import { peindreProgression } from "../interface/progression";
import { peindreReferentiel } from "../interface/referentiel";
import { referentielAffiche } from "../interface/versions-referentiel";

/** Fonctions appelées par le banc, sous leur ancien nom. */
export function nomsDuBanc(): Record<string, unknown> {
  return {
    askRestitWarn: avertirAvantRestitution,
    computeREF: referentielAffiche,
    exportFiche: exporterEvaluation,
    goStep: allerALEtape,
    loadDemo: chargerExemple,
    materialize,
    migF,
    nouvelleFiche: nouvelleEvaluation,
    paintForm: peindreFormulaire,
    paintLignes: peindreLignes,
    paintOrg: peindreEtablissement,
    paintPick: peindreCompetencesChoisies,
    paintPrefs,
    paintProg: peindreProgression,
    paintRef: peindreReferentiel,
    paintSaved: peindreEvaluations,
    paintSet,
    paintTabs,
    saveData,
  };
}

/** Pose ces fonctions sur `fenetre` sous leur ancien nom. */
export function publierNomsDuBanc(fenetre: Record<string, unknown>): void {
  Object.assign(fenetre, nomsDuBanc());
}
