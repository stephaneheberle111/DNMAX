// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel > Explorer, tel que l'interface le prépare : habillage de la
 * carte (diplôme et mention, tuiles de filtre, barre des vues, tableaux),
 * carte radiale ou chaîne, et vue « Recherche ».
 *
 * Repris du fichier historique (décision 38) à l'identique : mêmes contextes
 * passés aux écrans (`referentiel/habillage-carte`, `referentiel/recherche`,
 * appelés par `window.dnmaxPont`, comme avant), valeurs calculées dans le
 * même ordre, gestes de la carte branchés de la même façon.
 */
import { blocName, ecColor, ecNomRef, ecOrd, ueColor, ueOrd } from "./aides-communes";
import { ecsMiens, filtEcs, filtUes, refFilter, repartitionCarte } from "./carte-donnees";
import { chainBind, paintChain } from "./chaine-dessin";
import { norm } from "./constantes";
import { anneeCode } from "./donnees";
import { etat, type Objet } from "./etat";
import { paintRadial } from "./radiale-dessin";
import { radialWire } from "./radiale-gestes";
import { versionActive } from "./versions-referentiel";
import type { ContexteHabillage } from "../referentiel/habillage-carte";
import type { ContexteRecherche } from "../referentiel/recherche";

/** Ce que le module appelle par la fenêtre, comme le faisait le fichier historique. */
interface FonctionsHistoriques {
  /** Passée telle quelle aux écrans pour redessiner, comme avant : déclarée en propriété. */
  paintRef: () => void;
  saveData(redessiner?: boolean, depuisDictionnaire?: boolean): void;
  anneeLabel(annee: unknown): string;
  semsOfAnnee(annee: unknown): string[];
  refAJour(diplome: unknown): boolean;
  allerEtape(etape: string, filtre?: unknown): void;
  GROUPS: Readonly<Record<string, string>>;
}

type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};
let documentCourant: Document | null = null;

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function page(): Document {
  if (documentCourant === null) throw new Error("Explorer : document absent");
  return documentCourant;
}

/** État d'Explorer (`ui.ref`), relu à chaque appel comme le faisait le fichier historique. */
function carte(): Objet {
  return etat.ui.ref as Objet;
}

function pont(): NonNullable<Window["dnmaxPont"]> {
  return window.dnmaxPont as NonNullable<Window["dnmaxPont"]>;
}

/** Dessine Explorer : la carte (et son habillage), puis la vue « Recherche », masquée hors de cette vue. */
export function paintExplore(): void {
  const m = (etat.referentiel.meta || {}) as Objet;
  paintMap();
  (page().getElementById("refSearch") as HTMLElement).hidden = ((carte().view as string) || "radial") !== "search";
  const contexte = {
    competences: etat.referentiel.competences,
    recherche: carte(),
    filtre: refFilter(),
    modes: historique().GROUPS,
    annees: ((m.niveaux || []) as Objet[]).map((n) => ({ annee: String(n.annee), libelle: historique().anneeLabel(n.annee) })),
    teinteBlocs: etat.teinteBlocs,
    nomBloc: blocName,
    rangUe: ueOrd,
    couleurUe: ueColor,
    couleurEc: ecColor,
    nomEcReferentiel: ecNomRef,
    sousTitreAnnee: (p: Objet) =>
      etat.modules.dn
        ? (p.dn as string) + " · " + ((((((etat.referentiel.meta as Objet).niveaux || []) as Objet[]).find((n) => +(n.annee as string) === p.annee) || {}).label || "") as string)
        : "Semestres " + historique().semsOfAnnee(p.annee).join(" et "),
    sousTitreSemestre: (p: Objet) => "Année " + (p.annee as string) + (etat.modules.dn ? " · " + (p.dn as string) : ""),
    diplome: ((etat.referentiel.meta as Objet).diplome || "") as string,
    redessiner: historique().paintRef,
    ecsRetenus: ecsMiens(),
  };
  pont().referentiel.peindreRecherche(contexte as unknown as ContexteRecherche);
}

/**
 * Dessine l'habillage de la carte dans `#refMeta` avec la vue choisie
 * (radiale par défaut), puis branche la chaîne ou la carte radiale dessinée.
 */
export function paintMap(): void {
  const D = etat.donnees,
    m = (etat.referentiel.meta || {}) as Objet,
    host = page().getElementById("refMeta") as HTMLElement;
  const ecs = (): Objet[] => D.ecs as Objet[];
  const ecsOfUe = (u: Objet): Objet[] => filtEcs(ecs().filter((e) => e.ueId === u.id)).sort((a, b) => ecOrd(a) - ecOrd(b));
  const compsOfUe = (u: Objet): number => {
    const ids = ecsOfUe(u).map((e) => e.id);
    return (D.competences as Objet[]).filter((c) => ((c.ecIds || []) as unknown[]).some((x) => ids.includes(x))).length;
  };
  const orphan = filtEcs(ecs().filter((e) => !(D.ues as Objet[]).some((u) => u.id === e.ueId)));
  const groups = [
    ...filtUes(D.ues as Objet[]).map((u) => ({ u, ecs: ecsOfUe(u) })),
    ...(orphan.length && refFilter().kind !== "ue" ? [{ u: { nom: "Sans UE", couleur: "#9aa2ae", id: "" } as Objet, ecs: orphan }] : []),
  ].filter((g) => g.ecs.length);
  const toSearch = (v: string): void => {
    carte().q = v;
    carte().view = "search";
    historique().paintRef();
    const t = page().getElementById("r-search");
    if (t) t.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const view = (carte().view as string) || "radial";
  const contexte = {
    diplomes: D.diplomes,
    actif: D.activeDiplome,
    versionActive: versionActive(D.activeDiplome as string),
    aJour: historique().refAJour(D.activeDiplome),
    filtre: refFilter(),
    vue: view,
    ues: etat.referentiel.ues,
    blocs: etat.referentiel.blocs,
    competences: etat.referentiel.competences,
    ecs: ecs()
      .slice()
      .sort((a, b) => ecOrd(a) - ecOrd(b)),
    competencesVue: D.competences,
    groupesTableau: view === "table" ? groups.map((g) => ({ ue: g.u, ecs: g.ecs, competences: compsOfUe(g.u) })) : [],
    codeAnnee: (a: number) => anneeCode(a),
    nomBloc: blocName,
    couleurEc: ecColor,
    teinteBlocs: etat.teinteBlocs,
    niveaux: etat.modules.dn ? ((m.niveaux || []) as Objet[]).map((n) => anneeCode(n.annee as number) + " " + (n.label as string)).join(" · ") : null,
    carteRadiale: () => paintRadial(),
    carteChaine: () => paintChain(),
    choisirVue: (v: string) => {
      carte().view = v;
      historique().paintRef();
    },
    filtrer: (kind: string, value: string) => {
      carte().filter = value ? { kind, value } : { kind: "", value: "" };
      if (carte().view === "chain" && value) {
        const pk = ({ comp: "comp", ec: "ec", ue: "ue" } as Record<string, string | undefined>)[kind],
          cur = (carte().piv || {}) as Objet;
        const hit =
          pk === "comp"
            ? (D.competences as Objet[]).find((c) => c.code === value)
            : pk === "ec"
              ? (D.ecs as Objet[]).find((e) => e.id === value)
              : pk === "ue"
                ? (D.ues as Objet[]).find((u) => u.nom === value)
                : null;
        if (hit && pk === cur.kind) carte().piv = { kind: pk, id: hit.id };
      }
      historique().paintRef();
    },
    choisirMention: (id: string) => {
      D.activeDiplome = id;
      carte().filter = { kind: "", value: "" };
      historique().saveData();
    },
    choisirDiplome: (nom: string) => {
      const dp = (D.diplomes as Objet[]).find((x) => norm(x.nom || "") === norm(nom));
      if (!dp) return false;
      D.activeDiplome = dp.id;
      carte().filter = { kind: "", value: "" };
      historique().saveData();
      return true;
    },
    allerALEc: (nom: string) => {
      historique().allerEtape("ecs", nom);
    },
    rechercher: (texte: string, parUe: boolean) => {
      if (parUe) carte().group = "ue";
      toSearch(texte);
    },
    repartition: repartitionCarte(historique().paintRef),
  };
  pont().referentiel.peindreHabillageCarte(host, contexte as unknown as ContexteHabillage);
  if (host.querySelector(".chainbox")) chainBind(host);
  const svgHost = host.querySelector<HTMLElement>(".radwrap");
  if (svgHost) radialWire(svgHost);
}

/** Pose ces fonctions sur `cible` (la fenêtre) sous leurs noms historiques. */
export function publierExplorer(cible: Fenetre, document: Document | null): void {
  fenetre = cible;
  documentCourant = document;
  Object.assign(cible, { paintExplore, paintMap });
}
