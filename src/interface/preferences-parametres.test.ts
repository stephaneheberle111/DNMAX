// SPDX-License-Identifier: CECILL-2.1
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContexteDiplomes } from "../etablissement/diplomes";
import type { ContexteEnseignants } from "../etablissement/enseignants";
import type { ContexteLivrables } from "../etablissement/livrables";
import type { ContexteModules } from "../parametres/modules";
import type { ContexteSceau, ContexteVocabulaire } from "../preferences/preferences";
import type { ContextePlanification } from "../referentiel/planification";
import { etat, etatVide } from "./etat";

/** Contextes reçus par les écrans, simulés : le module ne fait que les construire. */
const recus = vi.hoisted(() => ({ ecrans: [] as { ecran: string; hote: unknown; contexte: unknown }[] }));

function noter(ecran: string) {
  return (hote: unknown, contexte: unknown) => {
    recus.ecrans.push({ ecran, hote, contexte });
  };
}

vi.mock("../referentiel/planification", () => ({ peindrePlanification: noter("planification") }));
vi.mock("../etablissement/diplomes", () => ({ peindreDiplomes: noter("diplomes") }));
vi.mock("../etablissement/enseignants", () => ({ peindreEnseignants: noter("enseignants") }));
vi.mock("../etablissement/livrables", () => ({ peindreLivrables: noter("livrables") }));
vi.mock("../parametres/modules", () => ({
  peindreModules: (liste: unknown, compteur: unknown, contexte: unknown) => {
    recus.ecrans.push({ ecran: "modules", hote: [liste, compteur], contexte });
  },
}));
vi.mock("../preferences/preferences", () => ({
  peindreVocabulaire: (_document: unknown, contexte: unknown) => {
    recus.ecrans.push({ ecran: "vocabulaire", hote: null, contexte });
  },
  peindreSceau: (_document: unknown, contexte: unknown) => {
    recus.ecrans.push({ ecran: "sceau", hote: null, contexte });
  },
  peindreDossierExports: (_document: unknown, dossier: unknown, annoncer: unknown) => {
    recus.ecrans.push({ ecran: "dossier", hote: null, contexte: { dossier, annoncer } });
  },
}));

/** Appels aux autres modules, relevés sous un nom court, avec leurs arguments. */
const appels = vi.hoisted(() => [] as string[]);
const noterAppel = vi.hoisted(() => (nom: string) => (...valeurs: unknown[]) => {
  appels.push(valeurs.length ? `${nom}:${valeurs.map(String).join(":")}` : nom);
});

vi.mock("./aides-communes", () => ({ toast: noterAppel("toast"), paintTabs: noterAppel("onglets") }));
vi.mock("./editeur-etape1", () => ({ peindreFormulaire: noterAppel("formulaire"), peindreCompetencesChoisies: noterAppel("competences") }));
vi.mock("./editeur", () => ({ peindreLignes: noterAppel("lignes") }));
vi.mock("./referentiel", () => ({ peindreReferentiel: noterAppel("referentiel"), allerALEtape: noterAppel("etape") }));
vi.mock("./donnees", () => ({
  saveData: (redessiner?: boolean) => appels.push(`enregistrer:${String(redessiner)}`),
  persistData: noterAppel("persist"),
  savePrefs: noterAppel("prefs"),
  critLabel: () => "Critère",
  modDeps: () => {
    if (!etat.modules.eleves) etat.modules.dn = false;
  },
  dipVisibles: () => [{ id: "d1" }],
  estCadreVierge: () => false,
  addMention: () => ({ id: "d2" }),
  newId: (prefixe: string) => `${prefixe}1`,
}));
vi.mock("./export-document", () => ({ sceauActif: () => true }));
vi.mock("./etablissement", () => ({ armerSuppression: noterAppel("armer") }));
vi.mock("./promotions-calendrier", () => ({
  normaliserPromotion: (promotion: { id: string }) => appels.push(`migrer:${promotion.id}`),
  enregistrerPromotions: noterAppel("promos"),
}));

const { appliquerModule, paintEditor, paintMatrice, paintPrefs, paintSet, brancherPreferencesParametres } = await import("./preferences-parametres");

let stockage: Record<string, string>;
let fenetre: Record<string, unknown>;
let horloge: number;

function contexte(ecran: string): unknown {
  const trouve = recus.ecrans.find((recu) => recu.ecran === ecran);
  if (!trouve) throw new Error(`écran ${ecran} non dessiné`);
  return trouve.contexte;
}

function hote(ecran: string): unknown {
  return recus.ecrans.find((recu) => recu.ecran === ecran)?.hote;
}

beforeEach(() => {
  Object.assign(etat, etatVide());
  etat.ui = { tab: "pref", ref: { msem: "S3" } };
  etat.armement = "x";
  etat.teinteBlocs = "#D1F1DA";
  etat.modules = { base: true, eleves: true, dn: true };
  etat.preferences = {};
  etat.evaluation = { livrables: ["Carnet", "Oral"] };
  etat.promotions = [{ id: "p1" }, { id: "p2" }];
  etat.donnees = { diplomes: [], enseignants: [{ id: "t1" }], moi: "t1", livrables: [{ nom: "Carnet" }], etab: { nom: "Lycée" } };
  recus.ecrans = [];
  appels.length = 0;
  stockage = {};
  horloge = 36 ** 3;
  // Sans navigateur : chaque zone demandée est rendue par son identifiant.
  vi.stubGlobal("document", { getElementById: (id: string) => ({ id }) });
  fenetre = {
    dnmaxPont: {
      dossierExports: { lire: () => Promise.resolve(null) },
      documentsModuleEleves: noterAppel("documents"),
      confirmerModuleEleves: (etablissement: unknown) => {
        appels.push(`confirmer:${JSON.stringify(etablissement)}`);
        return Promise.resolve(true);
      },
    },
  };
  brancherPreferencesParametres(fenetre, {
    ecrireStockage: (cle, valeur) => {
      stockage[cle] = valeur;
    },
    maintenant: () => horloge,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planification par semestre", () => {
  it("passe les données, le semestre choisi et la teinte des blocs", () => {
    paintMatrice({} as HTMLElement);
    const recu = (contexte("planification") as ContextePlanification);
    expect([recu.vue, recu.semestre, recu.teinteBlocs]).toEqual([etat.donnees, "S3", "#D1F1DA"]);
  });

  it("montre tous les semestres quand le semestre retenu est inconnu", () => {
    (etat.ui.ref as Record<string, unknown>).msem = "S9";
    paintMatrice({} as HTMLElement);
    expect((contexte("planification") as ContextePlanification).semestre).toBe("");
  });

  it("change de semestre, désarme la suppression et redessine", () => {
    paintMatrice({} as HTMLElement);
    (contexte("planification") as ContextePlanification).choisirSemestre("S1");
    expect([(etat.ui.ref as Record<string, unknown>).msem, etat.armement, appels]).toEqual(["S1", null, ["referentiel"]]);
  });

  it("enregistre sans redessiner et ouvre l'étape 3 sur une compétence", () => {
    paintMatrice({} as HTMLElement);
    const recu = (contexte("planification") as ContextePlanification);
    recu.enregistrer();
    recu.allerALaCompetence("C1");
    expect(appels).toEqual(["enregistrer:false", "etape:blocs:C1"]);
  });
});

describe("éditeur commun", () => {
  it("dessine dans le panneau du Référentiel sans hôte", () => {
    paintEditor("diplome");
    expect(hote("diplomes")).toEqual({ id: "refPane" });
  });

  it("ne dessine rien pour un volet inconnu", () => {
    paintEditor("inconnu", {} as HTMLElement);
    expect(recus.ecrans).toEqual([]);
  });

  it("enregistre en redessinant, ou sans redessiner pendant la frappe", () => {
    paintEditor("diplome");
    const recu = (contexte("diplomes") as ContexteDiplomes);
    recu.enregistrer(true);
    recu.enregistrer(false);
    expect(appels).toEqual(["enregistrer:undefined", "enregistrer:false"]);
  });

  it("recompose les promotions après un changement de durée", () => {
    paintEditor("diplome");
    const recu = (contexte("diplomes") as ContexteDiplomes);
    recu.apresChangementDuree();
    expect([recu.visibles, recu.nouvelIdentifiant(), appels]).toEqual([[{ id: "d1" }], "d1", ["migrer:p1", "migrer:p2", "promos"]]);
  });

  it("arme la suppression par la fenêtre, avec l'élément armé au moment du dessin", () => {
    paintEditor("enseignants", {} as HTMLElement);
    const recu = (contexte("enseignants") as ContexteEnseignants);
    etat.armement = null;
    recu.armement.armer("t1", () => undefined);
    expect([recu.armement.arme, appels]).toEqual(["x", ["armer:t1:() => undefined"]]);
  });

  it("tire l'identifiant d'un enseignant de l'horloge et désigne « C'est moi »", () => {
    paintEditor("enseignants", {} as HTMLElement);
    const recu = (contexte("enseignants") as ContexteEnseignants);
    recu.definirMoi("t2");
    expect([recu.nouvelIdentifiant(), recu.moi(), etat.donnees.moi, appels]).toEqual(["t1000", "t2", "t2", ["persist"]]);
  });

  it("transmet un changement de nom de « C'est moi » à l'application, si elle le suit", () => {
    paintEditor("enseignants", {} as HTMLElement);
    const recu = (contexte("enseignants") as ContexteEnseignants);
    recu.renommerMoi("Ada", "Lovelace");
    (fenetre.dnmaxPont as Record<string, unknown>).renommerMoi = (prenom: string, nom: string) => appels.push(`renommer:${prenom}:${nom}`);
    recu.renommerMoi("Ada", "Byron");
    expect(appels).toEqual(["renommer:Ada:Byron"]);
  });

  it("garde les données du moment du dessin pour les enseignants", () => {
    paintEditor("enseignants", {} as HTMLElement);
    const avant = etat.donnees;
    etat.donnees = { moi: "autre" };
    (contexte("enseignants") as ContexteEnseignants).definirMoi("t3");
    expect([avant.moi, etat.donnees.moi]).toEqual(["t3", "autre"]);
  });

  it("remplace les livrables et retire un livrable supprimé de l'évaluation en cours", () => {
    paintEditor("livrables", {} as HTMLElement);
    const recu = (contexte("livrables") as ContexteLivrables);
    recu.remplacer([{ nom: "Oral" }]);
    recu.retirerDeLEvaluation("Carnet");
    expect([recu.livrables(), etat.evaluation.livrables, recu.listeOrigine.length]).toEqual([[{ nom: "Oral" }], ["Oral"], 10]);
  });
});

describe("Préférences", () => {
  it("dessine le vocabulaire, le sceau, le dossier des exports puis les livrables", () => {
    paintPrefs();
    expect(recus.ecrans.map((recu) => recu.ecran)).toEqual(["vocabulaire", "sceau", "dossier", "livrables"]);
    expect(hote("livrables")).toEqual({ id: "prefLivr" });
    expect((contexte("dossier") as { dossier: unknown }).dossier).toBe((fenetre.dnmaxPont as Record<string, unknown>).dossierExports);
  });

  it("enregistre le sceau choisi sans redessiner", () => {
    paintPrefs();
    const recu = (contexte("sceau") as ContexteSceau);
    recu.choisir(false);
    expect([recu.actif, etat.preferences.sceau, appels]).toEqual([true, false, ["prefs"]]);
  });

  it("enregistre le nom du champ d'évaluation et redessine les lignes", () => {
    paintPrefs();
    const recu = (contexte("vocabulaire") as ContexteVocabulaire);
    recu.choisir("Indicateur");
    expect([recu.libelle, etat.preferences.critLabel, appels]).toEqual(["Critère", "Indicateur", ["prefs", "lignes"]]);
  });
});

describe("Paramètres > Modules", () => {
  it("ouvre les documents et l'avertissement du module Étudiants avec l'établissement", async () => {
    paintSet();
    const recu = (contexte("modules") as ContexteModules);
    recu.ouvrirDocuments();
    expect(await recu.confirmerEleves()).toBe(true);
    expect([hote("modules"), appels]).toEqual([[{ id: "modList" }, { id: "mCount" }], ["documents:[object Object]", 'confirmer:{"nom":"Lycée"}']]);
  });

  it("passe un établissement vide quand il n'est pas saisi", async () => {
    delete etat.donnees.etab;
    paintSet();
    await (contexte("modules") as ContexteModules).confirmerEleves();
    expect(appels).toEqual(["confirmer:{}"]);
  });

  it("active un module, l'enregistre et redessine dans l'ordre", () => {
    etat.modules.eleves = false;
    appliquerModule("eleves", true);
    expect(JSON.parse(stockage["dnmade.modules"] ?? "null")).toEqual({ base: true, eleves: true, dn: true });
    expect(appels).toEqual(["onglets", "formulaire", "competences", "lignes", "referentiel", "toast:Étudiants : activé"]);
    expect(recus.ecrans.map((recu) => recu.ecran)).toEqual(["modules", "vocabulaire"]);
  });

  it("prévient quand désactiver un module en désactive un autre", () => {
    appliquerModule("eleves", false);
    expect(etat.modules).toEqual({ base: true, eleves: false, dn: false });
    expect(appels[0]).toBe("toast:Niveaux d'acquisition désactivé aussi : il nécessite le module Étudiants.");
    expect(appels.at(-1)).toBe("toast:Étudiants : désactivé");
  });

  it("ne prévient pas quand aucun autre module n'en dépend", () => {
    appliquerModule("dn", false);
    expect(appels.filter((appel) => appel.startsWith("toast:"))).toEqual(["toast:Niveaux d'acquisition : désactivé"]);
  });

  it("continue quand le stockage refuse l'écriture", () => {
    brancherPreferencesParametres(fenetre, {
      ecrireStockage: () => {
        throw new Error("plein");
      },
      maintenant: () => 0,
    });
    appliquerModule("dn", true);
    expect(appels.at(-1)).toBe("toast:Niveaux d'acquisition : activé");
  });
});
