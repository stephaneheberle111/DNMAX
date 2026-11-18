// SPDX-License-Identifier: CECILL-2.1
/**
 * Démarrage de l'interface : lecture des données enregistrées (modules,
 * établissement, évaluations, préférences, promotions, brouillon), état
 * d'affichage de départ, branchement des onglets, du formulaire et des
 * boutons fixes, premier dessin, puis ponts offerts à l'application.
 *
 * Repris du fichier historique (décision 38), dans le même ordre : il
 * s'exécutait à la lecture du script ; il s'exécute maintenant juste après,
 * appelé par le pont. Rien entre-temps ne lisait ces données, hormis la
 * teinte des blocs (`BLOC_TINT`), relevée ici au même moment.
 */
import { nettoyerDiplomesVierges } from "../domaine/diplome-vierge";
import { ECHELLE, enumerer, manquesPourEnregistrer } from "../domaine/evaluation";
import { appliquerDependances, modulesParDefaut } from "../domaine/modules";
import { preferencesInitiales } from "../domaine/preferences";
import { brancherInterface } from "./branchements";
import { brancherOnglets } from "./onglets";
import { brancherFormulaire } from "../editeur/formulaire";
import { LIVRABLES_ORIGINE } from "./constantes";
import { buildData, construireDonnees, materialize, persistData, projectRef, refOf } from "./donnees";
import { migF, syncItemEcs, uid } from "./evaluation-courante";
import { etat, type Objet } from "./etat";

/** Référentiel d'une installation neuve : rien, sinon la teinte des blocs. */
const REFERENTIEL_VIDE = { meta: { diplome: "", niveaux: [], blocTint: "#D1F1DA" }, blocs: [], ues: [], familles: [], competences: [] };

/** Ce que le démarrage appelle encore dans le fichier historique, ou dans les modules repris, par la fenêtre. */
interface FonctionsHistoriques {
  computeREF(): Objet;
  paintTabs(): void;
  paintForm(): void;
  paintPick(): void;
  paintLignes(): void;
  paintSaved(): void;
  paintProg(): void;
  paintRef(): void;
  paintOrg(): void;
  paintSet(): void;
  paintPrefs(): void;
  paintSteps(): void;
  paintEleves(): void;
  applySemDate(): void;
  save(fin?: boolean): void;
  toast(message: string): void;
  loadDemo: () => void;
  nouvelleFiche: () => void;
  goStep: (etape: unknown) => void;
  linkSelection: () => void;
  versionsOf(diplomeId: string): Objet[];
  projectSnap(donnees: Objet, diplomeId: string, instantane: unknown): unknown;
  scrollTo(options: ScrollToOptions): void;
}

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
export function chargerEtat(fenetre: Record<string, unknown>, branchements: BranchementsDemarrage): void {
  const historique = fenetre as unknown as FonctionsHistoriques;
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
      etat.referentiel = historique.computeREF();
      persistData();
    }
  }
  syncItemEcs();
  etat.ui = { tab: "saved", step: 1, sel: [], q: "", org: { pane: "etab" }, ref: { pane: "explorer", chain: "", cq: "", q: "", group: "bloc", annee: "*", sems: [] } };
  const meta = etat.referentiel.meta as Objet | undefined;
  etat.teinteBlocs = (meta && (meta.blocTint as string)) || "#D1F1DA";
}

/** Branche onglets, formulaire et boutons, dessine la page et rend les ponts (lignes de fin de l'ancien script). */
export function brancherEtDessiner(fenetre: Record<string, unknown>, document: Document, branchements: BranchementsDemarrage): PontsDemarrage {
  const historique = fenetre as unknown as FonctionsHistoriques;
  const ui = (): Objet => etat.ui;
  const evaluation = (): Objet => etat.evaluation;
  brancherOnglets(document, (page) => {
    ui().tab = page;
    historique.paintTabs();
    if (ui().tab === "new") {
      historique.paintForm();
      historique.paintPick();
      historique.paintLignes();
    }
    if (ui().tab === "saved") historique.paintSaved();
    if (ui().tab === "prog") historique.paintProg();
    if (ui().tab === "ref") historique.paintRef();
    if (ui().tab === "org") historique.paintOrg();
    if (ui().tab === "set") historique.paintSet();
  });
  brancherFormulaire(document, {
    changerTitre: (titre) => {
      evaluation().titre = titre;
      historique.save();
    },
    changerConsignes: (consignes) => {
      evaluation().consignes = consignes;
      historique.save();
    },
    changerDistribution: (date) => {
      evaluation().distribPrev = date;
      historique.applySemDate();
      historique.save();
      historique.paintForm();
      historique.paintPick();
    },
    changerRendu: (date) => {
      evaluation().renduPrev = date;
      historique.save();
      historique.paintForm();
    },
  });
  const revenirEnHaut = (): void => {
    historique.scrollTo({ top: 0, behavior: "smooth" });
  };
  brancherInterface(document, {
    chargerExemple: historique.loadDemo,
    nouvelleEvaluation: historique.nouvelleFiche,
    revenirALaListe: () => {
      ui().tab = "saved";
      historique.paintTabs();
      historique.paintSaved();
      revenirEnHaut();
    },
    remettreModulesParDefaut: () => {
      etat.modules = modulesParDefaut();
      ecrire(branchements, "dnmade.modules", etat.modules);
      historique.paintSet();
      historique.paintTabs();
      historique.paintForm();
      historique.paintPick();
      historique.paintRef();
      historique.toast("Modules remis par défaut.");
    },
    chercherCompetence: (texte) => {
      ui().q = texte;
      historique.paintPick();
    },
    viderSelection: () => {
      evaluation().items = [];
      evaluation().ops = [];
      ui().sel = [];
      historique.save();
      historique.paintPick();
      historique.paintSteps();
    },
    allerALEtape: historique.goStep,
    regrouperSelection: historique.linkSelection,
    annulerSelection: () => {
      ui().sel = [];
      historique.paintLignes();
    },
    // L'évaluation est déjà enregistrée, modification après modification : le bouton ne fait que ramener à la liste.
    terminer: () => {
      const courante = evaluation();
      const brouillon = !!courante.brouillon || !etat.evaluations.some((enregistree) => enregistree.id === courante.id);
      if (brouillon) {
        const manque = manquesPourEnregistrer(courante);
        if (manque.length) {
          historique.toast("Pour enregistrer l'évaluation, il lui manque " + enumerer(manque) + ".");
          return;
        }
      }
      historique.save(true);
      ui().tab = "saved";
      historique.paintTabs();
      historique.paintSaved();
      revenirEnHaut();
      historique.toast((brouillon ? "Évaluation enregistrée — " : "") + "Le Word et l'Excel se génèrent d'ici, quand vous voulez.");
    },
    choisirModeSaisie: (mode) => {
      ui().emode = mode;
      historique.paintEleves();
    },
    chercherDansReferentiel: (texte) => {
      (ui().ref as Objet).q = texte;
      historique.paintRef();
    },
    regrouperReferentiel: (groupe) => {
      (ui().ref as Objet).group = groupe;
      historique.paintRef();
    },
    filtrerAnneeReferentiel: (annee) => {
      (ui().ref as Objet).annee = annee;
      historique.paintRef();
    },
    effacerFiltresReferentiel: () => {
      Object.assign(ui().ref as Objet, { q: "", group: "bloc", annee: "*", sems: [] });
      historique.paintRef();
    },
  });

  historique.paintTabs();
  historique.paintForm();
  historique.paintPick();
  historique.paintSaved();
  historique.paintRef();
  historique.paintSet();
  historique.paintPrefs();

  const ponts: PontsDemarrage = {
    // Le menu « Mon compte » ouvre les Préférences.
    ouvrirPreferences: () => {
      ui().tab = "pref";
      etat.armement = null;
      historique.paintTabs();
      historique.paintPrefs();
      revenirEnHaut();
    },
    // Contenu lisible du référentiel d'un diplôme, pour une version validée ou le référentiel de travail.
    projeterReferentiel: (diplomeId, versionId) => {
      const donnees = etat.donnees;
      if (!(donnees.diplomes as Objet[]).some((diplome) => diplome.id === diplomeId)) return null;
      const version = historique.versionsOf(diplomeId).find((candidate) => candidate.id === versionId);
      return historique.projectSnap(donnees, diplomeId, JSON.parse(JSON.stringify(version ? version.snap : refOf(donnees, diplomeId))));
    },
    // L'application fait appliquer ses règles aux enseignants (déclarer l'enseignant, reporter son changement de nom).
    ajusterEnseignants: (regle) => {
      const donnees = etat.donnees;
      const resultat = regle({ enseignants: (donnees.enseignants as unknown[]).slice(), moi: donnees.moi });
      if (!resultat || !Array.isArray(resultat.enseignants)) return;
      donnees.enseignants = resultat.enseignants.slice();
      donnees.moi = typeof resultat.moi === "string" ? resultat.moi : donnees.moi;
      persistData();
      if (ui().tab === "org") historique.paintOrg();
    },
    // Les documents RGPD demandent le nom de l'établissement et le contact du délégué : mène à leur saisie.
    ouvrirEtablissement: () => {
      ui().tab = "org";
      (ui().org as Objet).pane = "etab";
      historique.paintTabs();
      historique.paintOrg();
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
