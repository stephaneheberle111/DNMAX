// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { renumeroterBloc } from "./numero-bloc";

function donnees(): Record<string, unknown> {
  return {
    dico: {
      blocs: [
        { id: "b1", num: "1", nom: "Outils numériques" },
        { id: "b2", num: "2", nom: "S'exprimer" },
        { id: "b5e", num: "5", nom: "Agir en professionnel (Espace)" },
      ],
      competences: [],
    },
    refs: {
      objet: {
        blocs: [{ id: "b1" }, { id: "b2" }],
        competences: [
          { id: "c1", bloc: "1", ecs: [] },
          { id: "c2", bloc: "2", ecs: [] },
        ],
      },
      espace: {
        blocs: [{ id: "b1" }, { id: "b5e" }],
        competences: [
          { id: "c1", bloc: "1", ecs: [] },
          { id: "c5", bloc: "5", ecs: [] },
        ],
      },
      autre: { blocs: [], competences: [{ id: "c9", bloc: "1", ecs: [] }] },
    },
    versions: {
      objet: [{ id: "v1", attestation: "2026-11-01", snap: { blocs: [{ id: "b1" }], competences: [{ id: "c1", bloc: "1" }] } }],
    },
  };
}

describe("renumeroterBloc", () => {
  it("change le numéro dans le dictionnaire et fait suivre les compétences de chaque référentiel qui retient le bloc", () => {
    const resultat = renumeroterBloc(donnees(), "b1", "7");
    expect(resultat.modifie).toBe(true);
    if (!resultat.modifie) return;
    const sortie = resultat.donnees as ReturnType<typeof donnees> & {
      dico: { blocs: { id: string; num: string }[] };
      refs: Record<string, { competences: { id: string; bloc: string }[] }>;
      versions: Record<string, { snap: { competences: { bloc: string }[] } }[]>;
    };
    expect(sortie.dico.blocs.find((bloc) => bloc.id === "b1")?.num).toBe("7");
    expect(sortie.refs.objet?.competences.map((c) => c.bloc)).toEqual(["7", "2"]);
    expect(sortie.refs.espace?.competences.map((c) => c.bloc)).toEqual(["7", "5"]);
    expect(sortie.versions.objet?.[0]?.snap.competences[0]?.bloc).toBe("7");
  });

  it("laisse intact un référentiel qui ne retient pas le bloc", () => {
    const resultat = renumeroterBloc(donnees(), "b1", "7");
    if (!resultat.modifie) throw new Error("renumérotation attendue");
    const refs = resultat.donnees.refs as Record<string, { competences: { bloc: string }[] }>;
    expect(refs.autre?.competences[0]?.bloc).toBe("1");
  });

  it("ne modifie pas les données reçues", () => {
    const entree = donnees();
    const avant = JSON.stringify(entree);
    renumeroterBloc(entree, "b1", "7");
    expect(JSON.stringify(entree)).toBe(avant);
  });

  it("refuse un numéro déjà porté par un autre bloc d'un référentiel qui retient celui-ci", () => {
    expect(renumeroterBloc(donnees(), "b1", "5")).toEqual({ modifie: false, refus: "doublon" });
  });

  it("accepte un numéro porté par un bloc d'une autre mention seulement", () => {
    expect(renumeroterBloc(donnees(), "b2", "5").modifie).toBe(true);
  });

  it("refuse un numéro vide ou fait d'espaces", () => {
    expect(renumeroterBloc(donnees(), "b1", "  ")).toEqual({ modifie: false, refus: "vide" });
  });

  it("refuse un bloc absent du dictionnaire ou des données illisibles", () => {
    expect(renumeroterBloc(donnees(), "bx", "3")).toEqual({ modifie: false, refus: "inconnu" });
    expect(renumeroterBloc(null, "b1", "3")).toEqual({ modifie: false, refus: "inconnu" });
  });

  it("ne change rien quand le numéro est le même, espaces autour compris", () => {
    expect(renumeroterBloc(donnees(), "b1", " 1 ")).toEqual({ modifie: false, refus: null });
  });
});
