// SPDX-License-Identifier: CECILL-2.1
/**
 * Démarrage de l'interface : lecture des données enregistrées (modules,
 * établissement, évaluations, préférences, promotions, brouillon), état
 * d'affichage de départ, branchement des onglets, du formulaire et des
 * boutons fixes, premier dessin, puis ponts offerts à l'application.
 *
 * Repris du fichier historique (décision 38), dans le même ordre : il
 * s'exécutait à la lecture de l'ancien script ; il est maintenant appelé par
 * le pont (`heritage/pont`). La teinte des blocs (`BLOC_TINT`) est relevée
 * ici, au même moment qu'avant.
 */
import { nettoyerDiplomesVierges } from "../domaine/diplome-vierge";
import { ECHELLE, enumerer, manquesPourEnregistrer } from "../domaine/evaluation";
import { appliquerDependances, modulesParDefaut } from "../domaine/modules";
import { preferencesInitiales } from "../domaine/preferences";
import type { Referentiel } from "../domaine/modele-donnees";
import { TEINTE_BLOCS, teinteBlocsAffichee } from "../domaine/teinte-blocs";
import { brancherInterface } from "./branchements";
import { brancherOnglets } from "./onglets";
import { brancherFormulaire } from "../editeur/formulaire";
import { paintTabs, toast } from "./aides-communes";
import { LIVRABLES_ORIGINE } from "./constantes";
import { buildData, construireDonnees, materialize, persistData, projectRef, refOf } from "./donnees";
import { allerALEtape, enregistrer, lierLaSelection, peindreEtapes, peindreEtudiants, peindreLignes } from "./editeur";
import { nouvelleEvaluation, peindreCompetencesChoisies, peindreFormulaire } from "./editeur-etape1";
import { peindreEtablissement } from "./etablissement";
import { migF, syncItemEcs, uid } from "./evaluation-courante";
import { etat, type Objet } from "./etat";
import { peindreEvaluations } from "./evaluations";
import { chargerExemple } from "./exemple";
import { paintPrefs, paintSet } from "./preferences-parametres";
import { peindreProgression } from "./progression";
import { caleSemestreSurLaDate } from "./promotions-calendrier";
import { peindreReferentiel } from "./referentiel";
import { projeterCopie, referentielAffiche, versionsDe } from "./versions-referentiel";

/** Référentiel d'une installation neuve : rien, sinon la teinte des blocs. */
const REFERENTIEL_VIDE = { meta: { diplome: "", niveaux: [], blocTint: TEINTE_BLOCS }, blocs: [], ues: [], familles: [], competences: [] };

/** Ce que le démarrage demande à l'extérieur. */
export interface BranchementsDemarrage {
  lireStockage(cle: string): string | null;
  ecrireStockage(cle: string, valeur: string): void;
  maintenant(): Date;
}

/** Enseignants et « C'est moi », tels qu'une règle de l'application les reçoit et les rend. */
interface EnseignantsEtMoi {
  enseignants: unknown[];
  moi: unknown;
}

/** Ponts offerts à l'application, posés sur `window.dnmaxPont` après le démarrage. */
export interface PontsDemarrage {
  ouvrirPreferences(): void;
  projeterReferentiel(diplomeId: string, versionId: string): unknown;
  ajusterEnseignants(regle: (donnees: EnseignantsEtMoi) => EnseignantsEtMoi | null): void;
  ouvrirEtablissement(): void;
}

/** Lit une entrée du stockage, ou `defaut` si elle est absente, vide ou illisible. */
function lire(branchements: BranchementsDemarrage, cle: string, defaut: unknown): unknown {
  try {
    const valeur = branchements.lireStockage(cle);
    return valeur ? (JSON.parse(valeur) as unknown) : defaut;
  } catch {
    return defaut;
  }
}

function ecrire(branchements: BranchementsDemarrage, cle: string, valeur: unknown): void {
  try {
    branchements.ecrireStockage(cle, JSON.stringify(valeur));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
}

/** Lit les données enregistrées et pose l'état de départ (lignes de tête de l'ancien script). */
export function chargerEtat(branchements: BranchementsDemarrage): void {
  etat.modules = Object.assign(modulesParDefaut(), lire(branchements, "dnmade.modules", {}));
  appliquerDependances(etat.modules);
  etat.modules.base = true;
  etat.donnees = lire(branchements, "dnmade.data", null) as Objet;
  // Comme avant : une entrée « null » ou absente donne une installation neuve.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- la donnée lue n'est pas typée
  if (etat.donnees) materialize(etat.donnees);
  else etat.donnees = construireDonnees(buildData(REFERENTIEL_VIDE, LIVRABLES_ORIGINE));
  etat.referentiel = projectRef(etat.donnees);
  etat.evaluations = lire(branchements, "dnmade.fiches", []) as Objet[];
  etat.preferences = preferencesInitiales(lire(branchements, "dnmade.prefs", {}) as Objet) as unknown as Objet;
  etat.promotions = lire(branchements, "dnmade.promos", []) as Objet[];
  // Brouillon de départ : une évaluation vide.
  etat.evaluation = (lire(branchements, "dnmade.draft", null) as Objet | null) || {
    id: uid(),
    promoId: "",
    titre: "",
    livrables: [],
    semestre: "S1",
    classe: "",
    date: branchements.maintenant().toISOString().slice(0, 10),
    prof: "",
    ues: [],
    ecCodes: [],
    compCode: "",
    consignes: "",
    ops: [],
    preset: ECHELLE.cle,
    niveaux: [...ECHELLE.niveaux],
    opts: { crit: true, obs: true },
    eleves: "",
    items: [],
    res: {},
  };
  // Une évaluation de la liste est sa propre référence : un brouillon qui s'en écartait ne doit pas l'écraser.
  {
    // La liste lue n'est pas typée : une entrée vide est ignorée, comme avant.
    const enregistree = (etat.evaluations as unknown[]).find((evaluation) => !!evaluation && (evaluation as Objet).id === etat.evaluation.id);
    if (enregistree) etat.evaluation = structuredClone(enregistree as Objet);
  }
  migF(etat.evaluation);
  // Un diplôme-cadre vierge resté à côté d'un vrai diplôme n'a plus lieu d'être.
  {
    const nettoyage = nettoyerDiplomesVierges(etat.donnees, etat.promotions);
    if (nettoyage && nettoyage.modifie) {
      etat.donnees = nettoyage.donnees;
      materialize(etat.donnees);
      etat.referentiel = referentielAffiche();
      persistData();
    }
  }
  syncItemEcs();
  etat.ui = { tab: "saved", step: 1, sel: [], q: "", org: { pane: "etab" }, ref: { pane: "explorer", chain: "", cq: "", q: "", group: "bloc", annee: "*", sems: [] } };
  const meta = etat.referentiel.meta as Objet | undefined;
  etat.teinteBlocs = teinteBlocsAffichee(meta?.blocTint);
}

/** Branche onglets, formulaire et boutons, dessine la page et rend les ponts (lignes de fin de l'ancien script). */
export function brancherEtDessiner(fenetre: Pick<Window, "scrollTo">, document: Document, branchements: BranchementsDemarrage): PontsDemarrage {
  const ui = (): Objet => etat.ui;
  const evaluation = (): Objet => etat.evaluation;
  brancherOnglets(document, (page) => {
    ui().tab = page;
    paintTabs();
    if (ui().tab === "new") {
      peindreFormulaire();
      peindreCompetencesChoisies();
      peindreLignes();
    }
    if (ui().tab === "saved") peindreEvaluations();
    if (ui().tab === "prog") peindreProgression();
    if (ui().tab === "ref") peindreReferentiel();
    if (ui().tab === "org") peindreEtablissement();
    if (ui().tab === "set") paintSet();
  });
  brancherFormulaire(document, {
    changerTitre: (titre) => {
      evaluation().titre = titre;
      enregistrer();
    },
    changerConsignes: (consignes) => {
      evaluation().consignes = consignes;
      enregistrer();
    },
    changerDistribution: (date) => {
      evaluation().distribPrev = date;
      caleSemestreSurLaDate();
      enregistrer();
      peindreFormulaire();
      peindreCompetencesChoisies();
    },
    changerRendu: (date) => {
      evaluation().renduPrev = date;
      enregistrer();
      peindreFormulaire();
    },
  });
  const revenirEnHaut = (): void => {
    fenetre.scrollTo({ top: 0, behavior: "smooth" });
  };
  brancherInterface(document, {
    chargerExemple: () => {
      void chargerExemple();
    },
    nouvelleEvaluation,
    revenirALaListe: () => {
      ui().tab = "saved";
      paintTabs();
      peindreEvaluations();
      revenirEnHaut();
    },
    remettreModulesParDefaut: () => {
      etat.modules = modulesParDefaut();
      ecrire(branchements, "dnmade.modules", etat.modules);
      paintSet();
      paintTabs();
      peindreFormulaire();
      peindreCompetencesChoisies();
      peindreReferentiel();
      toast("Modules remis par défaut.");
    },
    chercherCompetence: (texte) => {
      ui().q = texte;
      peindreCompetencesChoisies();
    },
    viderSelection: () => {
      evaluation().items = [];
      evaluation().ops = [];
      ui().sel = [];
      enregistrer();
      peindreCompetencesChoisies();
      peindreEtapes();
    },
    allerALEtape,
    regrouperSelection: lierLaSelection,
    annulerSelection: () => {
      ui().sel = [];
      peindreLignes();
    },
    // L'évaluation est déjà enregistrée, modification après modification : le bouton ne fait que ramener à la liste.
    terminer: () => {
      const courante = evaluation();
      const brouillon = !!courante.brouillon || !etat.evaluations.some((enregistree) => enregistree.id === courante.id);
      if (brouillon) {
        const manque = manquesPourEnregistrer(courante);
        if (manque.length) {
          toast("Pour enregistrer l'évaluation, il lui manque " + enumerer(manque) + ".");
          return;
        }
      }
      enregistrer(true);
      ui().tab = "saved";
      paintTabs();
      peindreEvaluations();
      revenirEnHaut();
      toast((brouillon ? "Évaluation enregistrée — " : "") + "Le Word et l'Excel se génèrent d'ici, quand vous voulez.");
    },
    choisirModeSaisie: (mode) => {
      ui().emode = mode;
      peindreEtudiants();
    },
    chercherDansReferentiel: (texte) => {
      (ui().ref as Objet).q = texte;
      peindreReferentiel();
    },
    regrouperReferentiel: (groupe) => {
      (ui().ref as Objet).group = groupe;
      peindreReferentiel();
    },
    filtrerAnneeReferentiel: (annee) => {
      (ui().ref as Objet).annee = annee;
      peindreReferentiel();
    },
    effacerFiltresReferentiel: () => {
      Object.assign(ui().ref as Objet, { q: "", group: "bloc", annee: "*", sems: [] });
      peindreReferentiel();
    },
  });

  paintTabs();
  peindreFormulaire();
  peindreCompetencesChoisies();
  peindreEvaluations();
  peindreReferentiel();
  paintSet();
  paintPrefs();

  const ponts: PontsDemarrage = {
    // Le menu « Mon compte » ouvre les Préférences.
    ouvrirPreferences: () => {
      ui().tab = "pref";
      etat.armement = null;
      paintTabs();
      paintPrefs();
      revenirEnHaut();
    },
    // Contenu lisible du référentiel d'un diplôme, pour une version validée ou le référentiel de travail.
    projeterReferentiel: (diplomeId, versionId) => {
      const donnees = etat.donnees;
      if (!(donnees.diplomes as Objet[]).some((diplome) => diplome.id === diplomeId)) return null;
      const version = versionsDe(diplomeId).find((candidate) => candidate.id === versionId);
      return projeterCopie(donnees, diplomeId, JSON.parse(JSON.stringify(version ? version.snap : refOf(donnees, diplomeId))) as Referentiel);
    },
    // L'application fait appliquer ses règles aux enseignants (déclarer l'enseignant, reporter son changement de nom).
    ajusterEnseignants: (regle) => {
      const donnees = etat.donnees;
      const resultat = regle({ enseignants: (donnees.enseignants as unknown[]).slice(), moi: donnees.moi });
      if (!resultat || !Array.isArray(resultat.enseignants)) return;
      donnees.enseignants = resultat.enseignants.slice();
      donnees.moi = typeof resultat.moi === "string" ? resultat.moi : donnees.moi;
      persistData();
      if (ui().tab === "org") peindreEtablissement();
    },
    // Les documents RGPD demandent le nom de l'établissement et le contact du délégué : mène à leur saisie.
    ouvrirEtablissement: () => {
      ui().tab = "org";
      (ui().org as Objet).pane = "etab";
      paintTabs();
      peindreEtablissement();
      revenirEnHaut();
      const etablissement = (etat.donnees.etab || {}) as Objet;
      const cle = !((etablissement.nom as string | undefined) || "").trim() ? "nom" : "contactDpo";
      const champ = document.getElementById("et-" + cle);
      if (champ) champ.focus();
    },
  };
  return ponts;
}

/** Fin du démarrage : les données de l'établissement sont inscrites dès le chargement, pour l'échange entre enseignants. */
export function terminerDemarrage(): void {
  persistData();
}
