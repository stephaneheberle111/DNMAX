// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  comparerContenus,
  integrerVersion,
  lireListes,
  preparerEnvoi,
  type Partie,
  type ReferentielEchange,
} from "./referentiel-echange";

const BASE = { diplome: "DN MADE", mention: "Objet", empreinte: "e".repeat(64), dateVersion: "2026-01-15" };
const VERSION = { id: "vNouvelle", date: "2026-01-15", note: "Reçu de Noé Baptiste" };

const DICTIONNAIRE = {
  ues: [{ id: "u0", nom: "UE Ateliers", code: "UE1", couleur: "#111" }],
  ecs: [{ id: "e0", nom: "Technologies", couleur: "#222" }],
  blocs: [{ id: "b0", num: "1", nom: "Outils numériques" }],
  competences: [
    { id: "c0", code: "C1.1", libelle: "Analyser" },
    { id: "c1", code: "C1.2", libelle: "Concevoir" },
  ],
};
const STRUCTURE = {
  ues: [{ id: "u0", sems: ["S1"] }],
  ecs: [{ id: "e0", ueId: "u0", sems: ["S1"], ects: "", codes: {} }],
  blocs: [{ id: "b0" }],
  competences: [{ id: "c0", bloc: "1", ecs: [{ id: "e0", sems: ["S1"] }] }],
};

function compteur(): (partie: Partie) => string {
  let numero = 0;
  return (partie) => {
    numero += 1;
    return `${partie}-neuf-${String(numero)}`;
  };
}

function recu(surcharge: Partial<ReferentielEchange> = {}): ReferentielEchange {
  const envoi = preparerEnvoi(BASE, STRUCTURE, DICTIONNAIRE, {});
  if (envoi === null) {
    throw new Error("jeu d'essai invalide");
  }
  return { ...envoi, ...surcharge };
}

describe("lireListes", () => {
  it("refuse ce qui n'a pas quatre listes d'éléments identifiés", () => {
    expect(lireListes(null)).toBeNull();
    expect(lireListes({ ...STRUCTURE, ecs: "pas une liste" })).toBeNull();
    expect(lireListes({ ...STRUCTURE, blocs: [{ nom: "sans identifiant" }] })).toBeNull();
  });

  it("accepte quatre listes vides", () => {
    expect(lireListes({ ues: [], ecs: [], blocs: [], competences: [] })).not.toBeNull();
  });
});

describe("preparerEnvoi", () => {
  it("n'emporte que les libellés utilisés par la structure", () => {
    expect(recu().dictionnaire.competences).toEqual([{ id: "c0", code: "C1.1", libelle: "Analyser" }]);
  });

  it("rend null quand le dictionnaire est inutilisable", () => {
    expect(preparerEnvoi(BASE, STRUCTURE, {}, {})).toBeNull();
  });

  it("retire identifiants et couleurs du contenu lisible", () => {
    const envoi = preparerEnvoi(BASE, STRUCTURE, DICTIONNAIRE, { ues: [{ id: "u0", nom: "UE", couleur: "#000" }] });
    expect(envoi?.contenuLisible).toEqual({ ues: [{ nom: "UE" }] });
  });
});

describe("integrerVersion", () => {
  const donnees = { diplomes: [{ id: "d0" }], dico: DICTIONNAIRE, refs: { d0: STRUCTURE }, versions: {}, valide: {} };

  it("ajoute la version sans toucher au référentiel de travail ni à la version en vigueur", () => {
    const apres = integrerVersion(donnees, "d0", recu(), VERSION, compteur());
    expect(apres?.versions).toEqual({ d0: [{ ...VERSION, snap: STRUCTURE }] });
    expect(apres?.refs).toEqual(donnees.refs);
    expect(apres?.valide).toEqual({});
    expect(apres?.dico).toEqual(DICTIONNAIRE);
  });

  it("ne modifie pas les données reçues en paramètre", () => {
    const avant = JSON.stringify(donnees);
    integrerVersion(donnees, "d0", recu(), VERSION, compteur());
    expect(JSON.stringify(donnees)).toBe(avant);
  });

  it("garde les versions déjà présentes du diplôme", () => {
    const avecVersion = { ...donnees, versions: { d0: [{ id: "v1", date: "2025-09-01", snap: STRUCTURE }] } };
    const apres = integrerVersion(avecVersion, "d0", recu(), VERSION, compteur());
    expect((apres?.versions as Record<string, { id: string }[]>).d0?.map((version) => version.id)).toEqual([
      "v1",
      "vNouvelle",
    ]);
  });

  it("ajoute au dictionnaire un libellé inconnu, sous son identifiant d'origine", () => {
    const sansCompetence = { ...donnees, dico: { ...DICTIONNAIRE, competences: [] } };
    const apres = integrerVersion(sansCompetence, "d0", recu(), VERSION, compteur());
    expect((apres?.dico as typeof DICTIONNAIRE).competences).toEqual([{ id: "c0", code: "C1.1", libelle: "Analyser" }]);
  });

  it("ne modifie jamais un libellé local : un identifiant déjà pris reçoit un nouvel identifiant", () => {
    const libelleDifferent = {
      ...donnees,
      dico: { ...DICTIONNAIRE, competences: [{ id: "c0", code: "C1.1", libelle: "Libellé local" }] },
    };
    const apres = integrerVersion(libelleDifferent, "d0", recu(), VERSION, compteur());
    expect((apres?.dico as typeof DICTIONNAIRE).competences).toEqual([
      { id: "c0", code: "C1.1", libelle: "Libellé local" },
      { id: "competences-neuf-1", code: "C1.1", libelle: "Analyser" },
    ]);
    const version = (apres?.versions as Record<string, { snap: typeof STRUCTURE }[]>).d0?.[0];
    expect(version?.snap.competences[0]?.id).toBe("competences-neuf-1");
  });

  it("rattache un libellé reçu au libellé local de même identité rangé sous un autre identifiant", () => {
    const autreIdentifiant = {
      ...donnees,
      dico: {
        ...DICTIONNAIRE,
        ecs: [
          { id: "e0", nom: "Langues", couleur: "#333" },
          { id: "e7", nom: "Technologies", couleur: "#444" },
        ],
      },
    };
    const apres = integrerVersion(autreIdentifiant, "d0", recu(), VERSION, compteur());
    const version = (apres?.versions as Record<string, { snap: typeof STRUCTURE }[]>).d0?.[0];
    expect(version?.snap.ecs[0]?.id).toBe("e7");
    expect(version?.snap.competences[0]?.ecs).toEqual([{ id: "e7", sems: ["S1"] }]);
    expect((apres?.dico as typeof DICTIONNAIRE).ecs).toHaveLength(2);
  });

  it("suit le renvoi d'un EC vers une UE renumérotée", () => {
    const ueDifferente = { ...donnees, dico: { ...DICTIONNAIRE, ues: [{ id: "u0", nom: "Autre UE", code: "UE9" }] } };
    const apres = integrerVersion(ueDifferente, "d0", recu(), VERSION, compteur());
    const version = (apres?.versions as Record<string, { snap: typeof STRUCTURE }[]>).d0?.[0];
    expect(version?.snap.ues[0]?.id).toBe("ues-neuf-1");
    expect(version?.snap.ecs[0]?.ueId).toBe("ues-neuf-1");
  });

  it("ignore une différence de couleur seule", () => {
    const autreCouleur = { ...donnees, dico: { ...DICTIONNAIRE, ecs: [{ id: "e0", nom: "Technologies", couleur: "#fff" }] } };
    const apres = integrerVersion(autreCouleur, "d0", recu(), VERSION, compteur());
    expect((apres?.dico as typeof DICTIONNAIRE).ecs).toEqual([{ id: "e0", nom: "Technologies", couleur: "#fff" }]);
  });

  it("rend null quand les données locales n'ont pas la forme attendue", () => {
    expect(integrerVersion(null, "d0", recu(), VERSION, compteur())).toBeNull();
    expect(integrerVersion({ dico: "illisible" }, "d0", recu(), VERSION, compteur())).toBeNull();
  });
});

describe("comparerContenus", () => {
  const local = {
    blocs: [{ num: "1", nom: "Outils" }],
    ues: [{ nom: "UE A", sems: ["S1"] }],
    ecs: [],
    competences: [
      { code: "C1.1", libelle: "Analyser", id: "c0" },
      { code: "C1.2", libelle: "Concevoir" },
    ],
  };

  it("ne trouve aucun écart entre deux contenus identiques, identifiants et couleurs mis à part", () => {
    const memeContenu = { ...local, competences: [{ code: "C1.1", libelle: "Analyser", id: "c99", couleur: "#000" }, local.competences[1]] };
    expect(comparerContenus(local, memeContenu).competences).toEqual({ ajoutes: [], retires: [], modifies: [] });
  });

  it("désigne par leur code les compétences ajoutées, retirées et modifiées", () => {
    const fichier = {
      ...local,
      competences: [
        { code: "C1.1", libelle: "Analyser un contexte" },
        { code: "C1.3", libelle: "Réaliser" },
      ],
    };
    expect(comparerContenus(local, fichier).competences).toEqual({
      ajoutes: ["C1.3"],
      retires: ["C1.2"],
      modifies: ["C1.1"],
    });
  });

  it("traite un contenu absent ou illisible comme vide", () => {
    expect(comparerContenus(null, local).ues).toEqual({ ajoutes: ["UE A"], retires: [], modifies: [] });
    expect(comparerContenus(local, "illisible").blocs).toEqual({ ajoutes: [], retires: ["1"], modifies: [] });
  });
});
