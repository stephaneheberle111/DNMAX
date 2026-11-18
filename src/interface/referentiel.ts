// SPDX-License-Identifier: CECILL-2.1
/**
 * Référentiel, tel que l'interface le prépare : barre « Constituer /
 * Explorer », page des cinq étapes de Constituer et contexte des étapes 1 à 3,
 * passages vers une étape ou vers la validation.
 *
 * Repris du fichier historique (décision 38). Le temps de la reprise, ces
 * fonctions sont publiées sur la fenêtre sous leur ancien nom ; la carte
 * (Explorer) reste dessinée dans le fichier historique, et la planification
 * par semestre est préparée par `interface/preferences-parametres`.
 */
import { retirerDuReferentiel, supprimerVersion } from "../domaine/constituer";
import { absorber, associationsProposees, referentielDe } from "../domaine/modele-donnees";
import { renumeroterBloc } from "../domaine/numero-bloc";
import { ETAPES_CONSTITUER, peindrePageConstituer, type EtapeConstituer } from "../referentiel/constituer";
import { peindreEtapeBlocs, peindreEtapeEcs, peindreEtapeUes, type ContexteEtape, type VueReferentiel } from "../referentiel/etapes";
import { armerSuppression } from "./etablissement";
import { etat, type Objet } from "./etat";
import { afficherMention, referentielAffiche, referentielAJour, restaurerVersion, usageVersion, validerVersion, versionActive, versionsDe } from "./versions-referentiel";

/** Volets du Référentiel, dans l'ordre de la barre (Explorer par défaut). */
export const VOLETS_REFERENTIEL: Readonly<Record<string, string>> = { constituer: "Constituer", explorer: "Explorer" };

/** Ce que le module appelle encore dans le fichier historique. */
interface FonctionsHistoriques {
  paintExplore(): void;
  paintMatrice(hote: HTMLElement): void;
  paintTabs(): void;
  persistData(): void;
  saveData(redessiner?: boolean, depuisDictionnaire?: boolean): void;
  newId(prefixe: string): string;
  toast(message: string): void;
}

type Fenetre = Record<string, unknown>;

let fenetre: Fenetre = {};

function historique(): FonctionsHistoriques {
  return fenetre as unknown as FonctionsHistoriques;
}

function donnees(): Objet {
  return etat.donnees;
}

function ui(): Objet {
  return etat.ui.ref as Objet;
}

function diplomes(): Objet[] {
  return Array.isArray(donnees().diplomes) ? (donnees().diplomes as Objet[]) : [];
}

/** Texte comparé sans casse ni accents, comme le fichier historique (`norm`). */
function normaliser(valeur: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- même conversion que l'interface historique
  return String(valeur == null ? "" : valeur)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function armement(): ContexteEtape["armement"] {
  return { arme: etat.armement as string | null, armer: (id, supprimer) => { armerSuppression(id, supprimer); } };
}

function annoncer(texte: string): void {
  historique().toast(texte);
}

/** Référentiel : barre des volets, puis Explorer (dessiné dans le fichier historique) ou Constituer. */
export function peindreReferentiel(): void {
  if (!VOLETS_REFERENTIEL[ui().pane as string]) ui().pane = "explorer";
  if (!(ETAPES_CONSTITUER as Record<string, string>)[ui().cp as string]) ui().cp = "ues";
  const volet = ui().pane as string;
  const barre = document.getElementById("refNav");
  if (barre) {
    barre.replaceChildren(
      ...Object.entries(VOLETS_REFERENTIEL).map(([cle, libelle]) => {
        const bouton = document.createElement("button");
        bouton.setAttribute("type", "button");
        bouton.setAttribute("data-pane", cle);
        bouton.setAttribute("aria-pressed", String(volet === cle));
        bouton.textContent = libelle;
        bouton.onclick = () => {
          ui().pane = cle;
          etat.armement = null;
          peindreReferentiel();
          window.scrollTo({ top: 0, behavior: "smooth" });
        };
        return bouton;
      }),
    );
  }
  const explorer = document.getElementById("refExplore");
  const constituer = document.getElementById("refPane");
  if (explorer) explorer.hidden = volet !== "explorer";
  if (constituer) constituer.hidden = volet === "explorer";
  if (volet === "explorer") {
    historique().paintExplore();
    return;
  }
  if (constituer) peindreConstituer(constituer);
}

/** Ouvre une étape de Constituer, filtrée sur un nom ou un code (depuis Explorer ou la planification). */
export function allerALEtape(etape: string, filtre?: string): void {
  ui().pane = "constituer";
  ui().cp = etape;
  ui().cq = filtre || "";
  etat.armement = null;
  peindreReferentiel();
  document.getElementById("cq")?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Mène à la validation du référentiel d'une mention (celle affichée si elle est inconnue). */
export function allerALaValidation(diplome?: string): void {
  if (diplome && diplome !== donnees().activeDiplome && diplomes().some((candidat) => candidat.id === diplome)) afficherMention(diplome);
  etat.ui.tab = "ref";
  ui().pane = "constituer";
  ui().cp = "valider";
  etat.armement = null;
  historique().paintTabs();
  peindreReferentiel();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Page des cinq étapes de Constituer, avec la validation datée et les versions de la mention active. */
export function peindreConstituer(hote: HTMLElement): void {
  const lesDonnees = donnees();
  const diplome = lesDonnees.activeDiplome as string;
  const changerDeMention = (id: unknown): void => {
    lesDonnees.activeDiplome = id;
    ui().filter = { kind: "", value: "" };
    historique().saveData();
  };
  peindrePageConstituer(hote, {
    vue: lesDonnees as unknown as VueReferentiel,
    diplomes: diplomes(),
    actif: diplome,
    etape: ui().cp as EtapeConstituer,
    versions: versionsDe(diplome),
    versionActive: versionActive(diplome),
    aJour: referentielAJour(diplome),
    usage: (version) => {
      const usage = usageVersion(diplome, version as string);
      return { promotions: usage.ps.map((promotion) => (promotion.nom as string) || "promo"), evaluations: usage.fs.length };
    },
    aujourdhui: new Date().toISOString().slice(0, 10),
    choisirEtape: (etape) => {
      ui().cp = etape;
      ui().cq = "";
      etat.armement = null;
      peindreReferentiel();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    choisirDiplome: (nom) => {
      const trouve = diplomes().find((candidat) => normaliser(candidat.nom || "") === normaliser(nom));
      if (trouve) changerDeMention(trouve.id);
    },
    choisirMention: changerDeMention,
    peindreEtape: (etape, zone) => {
      if (etape === "tableau") historique().paintMatrice(zone);
      else peindreEtape(etape, zone);
    },
    valider: validerVersion,
    attester: (id) => {
      const version = versionsDe(diplome).find((candidate) => candidate.id === id);
      if (!version) return;
      version.attestation = new Date().toISOString().slice(0, 10);
      historique().persistData();
      etat.referentiel = referentielAffiche();
      peindreReferentiel();
    },
    retablir: restaurerVersion,
    supprimerVersion: (rang) => {
      supprimerVersion(lesDonnees, diplome, rang);
      historique().persistData();
      peindreReferentiel();
    },
    armement: armement(),
    annoncer,
  });
}

/** Étapes 1 à 3 de Constituer : UE, EC, blocs et compétences. */
export function peindreEtape(etape: string, hote: HTMLElement): void {
  const meta = (etat.referentiel.meta ?? {}) as Objet;
  const contexte = contexteDeLEtape(donnees(), (meta.diplome as string) || "—");
  if (etape === "ues") peindreEtapeUes(hote, contexte);
  else if (etape === "ecs") peindreEtapeEcs(hote, contexte);
  else peindreEtapeBlocs(hote, contexte);
}

/** Contexte des étapes 1 à 3 : la vue du référentiel actif et de quoi l'enregistrer. */
export function contexteDeLEtape(lesDonnees: Objet, diplome: string): ContexteEtape {
  const nouvelIdentifiant = (prefixe: string): string => historique().newId(prefixe);
  return {
    vue: lesDonnees as unknown as VueReferentiel,
    diplome,
    nouvelIdentifiant,
    enregistrer: (redessiner) => {
      historique().saveData(redessiner ? undefined : false);
    },
    filtre: (ui().cq as string) || "",
    filtrer: (texte) => {
      ui().cq = texte;
      peindreReferentiel();
    },
    viderFiltre: () => {
      ui().cq = "";
    },
    reprendre: (sorte, id) => {
      const referentiel = referentielDe(lesDonnees, lesDonnees.activeDiplome as string);
      if (!referentiel[sorte].some((element) => element.id === id)) {
        referentiel[sorte].push(associationsProposees(lesDonnees, lesDonnees.activeDiplome as string, sorte, id));
      }
      historique().saveData(true, true);
    },
    retirer: (sorte, id) => {
      absorber(lesDonnees, nouvelIdentifiant);
      retirerDuReferentiel(referentielDe(lesDonnees, lesDonnees.activeDiplome as string), sorte, id);
      historique().saveData(true, true);
    },
    renumeroterBloc: (id, numero) => {
      absorber(lesDonnees, nouvelIdentifiant);
      const resultat = renumeroterBloc(lesDonnees, id, numero) as unknown as { modifie: boolean; refus?: string; donnees: Objet };
      if (resultat.modifie) {
        lesDonnees.dico = resultat.donnees.dico;
        lesDonnees.refs = resultat.donnees.refs;
        if (resultat.donnees.versions) lesDonnees.versions = resultat.donnees.versions;
        historique().saveData(true, true);
      }
      return resultat;
    },
    redessiner: peindreReferentiel,
    armement: armement(),
    annoncer,
  };
}

/** Publie ces fonctions sous leurs anciens noms, pour le fichier historique. */
export function publierReferentiel(cible: Fenetre): void {
  fenetre = cible;
  Object.assign(cible, {
    paintRef: peindreReferentiel,
    allerEtape: allerALEtape,
    allerValidation: allerALaValidation,
    paintConstituer: peindreConstituer,
    paintEtape: peindreEtape,
    contexteEtape: contexteDeLEtape,
  });
}
