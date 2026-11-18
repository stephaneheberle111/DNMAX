// SPDX-License-Identifier: CECILL-2.1
/**
 * Préférences, Paramètres et planification, tels que l'interface les
 * prépare : contexte de la planification par semestre (étape 4 de
 * Constituer), de l'éditeur commun (Diplômes et mentions, Enseignants,
 * Livrables), des Préférences (vocabulaire, sceau, dossier des exports) et de
 * Paramètres > Modules, et activation d'un module.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom, que le fichier
 * historique appelle encore ; les écrans sont dans `referentiel/`,
 * `etablissement/`, `preferences/` et `parametres/`, les règles dans
 * `domaine/`.
 */
import { MODULES, entraineDautres, type Module } from "../domaine/modules";
import { semestreRetenu } from "../domaine/planification";
import { peindreDiplomes, type DonneesDiplomes } from "../etablissement/diplomes";
import { peindreEnseignants } from "../etablissement/enseignants";
import { peindreLivrables, type Livrable } from "../etablissement/livrables";
import { peindreModules } from "../parametres/modules";
import { peindreDossierExports, peindreSceau, peindreVocabulaire, type DossierExports } from "../preferences/preferences";
import { peindrePlanification, type ContextePlanification } from "../referentiel/planification";
import { LIVRABLES_ORIGINE } from "./constantes";
import { etat, type Objet } from "./etat";

/** Ce que le module appelle encore dans le fichier historique, ou dans d'autres modules repris. */
interface FonctionsHistoriques {
  toast: (message: string) => void;
  paintTabs(): void;
  paintForm(): void;
  paintPick(): void;
  paintLignes(): void;
  paintRef(): void;
  saveData(redessiner?: boolean, depuisDictionnaire?: boolean): void;
  persistData(): void;
  savePrefs(): void;
  critLabel(): string;
  sceauActif(): boolean;
  modDeps(): void;
  allerEtape(etape: string, filtre?: string): void;
  armDel(id: unknown, supprimer: () => void): void;
  dipVisibles(): Objet[];
  estCadreVierge: (id: unknown) => boolean;
  addMention: (source: unknown, nom: string) => Objet;
  newId(prefixe: string): string;
  migPromoCohorte(promotion: Objet): Objet;
  savePromos(): void;
}

/** Ce que l'application pose sous `window.dnmaxPont` et que ces écrans lisent au moment voulu. */
interface PontLu {
  renommerMoi?: (prenom: unknown, nomFamille: unknown) => void;
  dossierExports?: DossierExports;
  documentsModuleEleves(etablissement: unknown): void;
  confirmerModuleEleves(etablissement: unknown): Promise<boolean>;
}

/** Ce que le module demande à l'extérieur : stockage et horloge (ceux du navigateur en vrai). */
export interface BranchementsPreferences {
  ecrireStockage(cle: string, valeur: string): void;
  maintenant(): number;
}

type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};
let branchements: BranchementsPreferences = { ecrireStockage: () => undefined, maintenant: () => 0 };

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function pont(): PontLu {
  return fenetre.dnmaxPont as PontLu;
}

function zone(id: string): HTMLElement {
  // Comme avant : une zone absente est passée telle quelle à l'écran.
  return document.getElementById(id) as HTMLElement;
}

/** Étape 4 de Constituer : la planification par semestre. */
export function paintMatrice(hote: HTMLElement): void {
  const ui = etat.ui.ref as Objet;
  peindrePlanification(hote, {
    vue: etat.donnees as unknown as ContextePlanification["vue"],
    semestre: semestreRetenu(ui.msem),
    choisirSemestre: (semestre) => {
      (etat.ui.ref as Objet).msem = semestre;
      etat.armement = null;
      historique().paintRef();
    },
    teinteBlocs: etat.teinteBlocs,
    enregistrer: () => {
      historique().saveData(false);
    },
    allerALaCompetence: (code) => {
      historique().allerEtape("blocs", code);
    },
  });
}

/**
 * Volets de l'éditeur commun : Diplômes et mentions, Enseignants (Mon
 * établissement), Livrables (Préférences). Sans hôte, le panneau du
 * Référentiel. Les données lues sont celles du moment du dessin.
 */
export function paintEditor(volet: string, hoteDemande?: HTMLElement | null): void {
  const hote = hoteDemande || zone("refPane");
  const donnees = etat.donnees;
  const armement = {
    arme: etat.armement as string | null,
    armer: (id: string, supprimer: () => void) => {
      historique().armDel(id, supprimer);
    },
  };
  const enregistrer = (redessiner: boolean): void => {
    historique().saveData(redessiner ? undefined : false);
  };
  const annoncer = (texte: string): void => {
    historique().toast(texte);
  };
  if (volet === "diplome") {
    peindreDiplomes(hote, {
      donnees: donnees as unknown as DonneesDiplomes,
      visibles: historique().dipVisibles(),
      estCadreVierge: historique().estCadreVierge,
      nouvelIdentifiant: () => historique().newId("d"),
      ajouterMention: historique().addMention,
      enregistrer,
      apresChangementDuree: () => {
        etat.promotions.forEach((promotion) => historique().migPromoCohorte(promotion));
        historique().savePromos();
      },
      armement,
      annoncer,
    });
    return;
  }
  if (volet === "enseignants") {
    peindreEnseignants(hote, {
      enseignants: donnees.enseignants as Objet[],
      moi: () => donnees.moi as string,
      definirMoi: (id) => {
        donnees.moi = id;
        historique().persistData();
      },
      armement,
      nouvelIdentifiant: () => "t" + branchements.maintenant().toString(36),
      enregistrer,
      renommerMoi: (prenom, nomFamille) => {
        const lePont = pont();
        if (lePont.renommerMoi) lePont.renommerMoi(prenom, nomFamille);
      },
      annoncer,
    });
    return;
  }
  if (volet === "livrables") {
    peindreLivrables(hote, {
      livrables: () => donnees.livrables as Livrable[],
      remplacer: (livrables) => {
        donnees.livrables = livrables;
      },
      listeOrigine: LIVRABLES_ORIGINE,
      retirerDeLEvaluation: (nom) => {
        etat.evaluation.livrables = (etat.evaluation.livrables as unknown[]).filter((livrable) => livrable !== nom);
      },
      armement,
      enregistrer,
      annoncer,
    });
  }
}

/** Préférences > Documents exportés : sceau DN MADE et dossier proposé à l'enregistrement. */
export function paintSceau(): void {
  peindreSceau(document, {
    actif: historique().sceauActif(),
    choisir: (actif) => {
      etat.preferences.sceau = actif;
      historique().savePrefs();
    },
  });
  peindreDossierExports(document, pont().dossierExports, historique().toast);
}

/** Préférences : nom du champ d'évaluation ; les lignes de l'évaluation le reprennent. */
export function paintVocab(): void {
  peindreVocabulaire(document, {
    libelle: historique().critLabel(),
    choisir: (libelle) => {
      etat.preferences.critLabel = libelle;
      historique().savePrefs();
      historique().paintLignes();
    },
  });
}

/** Préférences (menu « Mon compte ») : vocabulaire, documents exportés et livrables proposés. */
export function paintPrefs(): void {
  paintVocab();
  paintSceau();
  paintEditor("livrables", document.getElementById("prefLivr"));
}

/** Paramètres > Modules. */
export function paintSet(): void {
  peindreModules(zone("modList"), zone("mCount"), {
    actifs: etat.modules,
    ouvrirDocuments: () => {
      pont().documentsModuleEleves(etat.donnees.etab || {});
    },
    confirmerEleves: () => pont().confirmerModuleEleves(etat.donnees.etab || {}),
    appliquer: appliquerModule,
  });
}

function nomDuModule(cle: string): string {
  // Comme avant : une clé inconnue lève une erreur.
  return (MODULES[cle] as Module).nom;
}

/**
 * Active ou désactive un module, applique les dépendances, l'enregistre et
 * redessine ce qui en dépend. Désactiver un module requis par un autre
 * désactive aussi celui-ci, et le dit.
 */
export function appliquerModule(cle: string, actif: boolean): void {
  if (!actif && entraineDautres(cle, etat.modules)) {
    historique().toast("Niveaux d'acquisition désactivé aussi : il nécessite le module " + nomDuModule(cle) + ".");
  }
  etat.modules[cle] = actif;
  historique().modDeps();
  try {
    branchements.ecrireStockage("dnmade.modules", JSON.stringify(etat.modules));
  } catch {
    // Comme avant : une écriture refusée n'interrompt pas l'interface.
  }
  paintSet();
  historique().paintTabs();
  historique().paintForm();
  historique().paintPick();
  historique().paintLignes();
  paintVocab();
  historique().paintRef();
  historique().toast(nomDuModule(cle) + (actif ? " : activé" : " : désactivé"));
}

/** Pose ces fonctions sur `cible` (la fenêtre) sous leurs noms historiques. */
export function publierPreferencesParametres(cible: Fenetre, branchementsReels: BranchementsPreferences): void {
  fenetre = cible;
  branchements = branchementsReels;
  Object.assign(cible, {
    paintMatrice,
    paintEditor,
    paintSceau,
    paintVocab,
    paintPrefs,
    paintSet,
    appliquerModule,
  });
}
