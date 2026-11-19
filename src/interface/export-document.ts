// SPDX-License-Identifier: CECILL-2.1
/**
 * Export d'une évaluation en document (Word, OpenDocument, tableur), tel que
 * l'interface le prépare : lignes et colonnes du document, en-tête, nom du
 * fichier, sceau, avertissement avant d'exporter des restitutions
 * incomplètes, et remise du fichier à l'enveloppe.
 *
 * Repris du fichier historique (décision 38) ; la mise en forme des documents
 * est dans `export/`.
 */
import { numeroCode } from "../domaine/constituer";
import { sceauActif as sceauDemande } from "../domaine/preferences";
import { dessinateurJauge } from "../export/image-jauge";
import { colonnesExport } from "../export/modele";
import { construireOdt } from "../export/opendocument";
import { construireTableur } from "../export/tableur";
import { construireDocx } from "../export/word";
import { toast } from "./aides-communes";
import { critLabel } from "./donnees";
import { rangRegroupement } from "./editeur-etape1";
import { etat, type Objet } from "./etat";
import { ligKey, lignesOf, migF, studentsOf } from "./evaluation-courante";
import { libelleNiveauDuSemestre, promotionsAffichees } from "./promotions-calendrier";
import { afficherMention, mentionDe, referentielAffiche } from "./versions-referentiel";

/** Remise d'un fichier à l'enveloppe (boîte « Enregistrer sous »). */
export interface Telechargements {
  save(demande: { filename: string; data: Blob; eleves: boolean }): Promise<unknown>;
}

let telechargements: () => Telechargements | undefined = () => undefined;
let lireFichier: (chemin: string) => Promise<Response> = (chemin) => fetch(chemin);

function evaluation(): Objet {
  return etat.evaluation;
}

function liste(valeur: unknown): Objet[] {
  return Array.isArray(valeur) ? (valeur as Objet[]) : [];
}

function textes(valeur: unknown): string[] {
  return Array.isArray(valeur) ? (valeur as string[]) : [];
}

/** Export de « l'évaluation » (grille vierge) plutôt que des restitutions remplies par étudiant. */
let exportVide = false;

/** Sceau DN MADE en base 64, lu au premier export qui l'affiche. */
let sceau: string | null = null;

/** Une ligne du document : une compétence opérationnelle (plusieurs compétences réunies) ou une compétence seule. */
interface LigneDocument {
  op: boolean;
  bloc: unknown;
  code: string;
  lib: string;
  comp: string;
  ec: string;
  ecn: string;
  livr: string;
  key: string;
  ord: number[];
}

/** Noms des EC désignés par leurs codes, sans doublon, lus dans le référentiel affiché puis dans le dictionnaire. */
export function nomsDesEcs(codes: unknown): string {
  const nomDe = (code: unknown): unknown => {
    const trouve = liste(etat.referentiel.competences)
      .flatMap((competence) => liste(competence.ecs))
      .find((ec) => ec.ec === code);
    if (trouve?.nom) return trouve.nom;
    const ec = liste(etat.donnees.ecs).find((candidat) => candidat.code === code || Object.values((candidat.codes || {}) as Objet).includes(code));
    return ec ? ec.nom || code : code;
  };
  return [...new Set(textes(codes).map(nomDe).filter(Boolean))].join(", ");
}

/** Lignes du document, rangées : compétences opérationnelles d'abord (dans leur ordre), puis compétences seules par bloc et par code. */
export function lignesDuDocument(): LigneDocument[] {
  const courante = evaluation();
  const items = liste(courante.items);
  const competences = liste(etat.referentiel.competences);
  const lignes: LigneDocument[] = [];
  liste(courante.ops).forEach((regroupement) => {
    const membres = items.filter((item) => item.op === regroupement.id);
    if (!membres.length) return;
    const reunies = membres.map((item) => competences.find((competence) => competence.code === item.code)).filter((competence): competence is Objet => Boolean(competence));
    const ecs = [...new Set(membres.flatMap((item) => textes(item.ecs)))];
    lignes.push({
      op: true,
      bloc: [...new Set(reunies.map((competence) => competence.bloc))].sort((un, autre) => Number(un) - Number(autre)).join(", "),
      code: membres.map((item) => item.code).join(" + "),
      lib: (regroupement.libelle as string) || "(compétence opérationnelle à formuler)",
      // Le code facilite le report dans un autre logiciel.
      comp: reunies.map((competence) => `${String(competence.code)} — ${String(competence.libelle)}`).join("\n"),
      ec: ecs.join(", "),
      ecn: nomsDesEcs(ecs),
      livr: textes(regroupement.livrables).join(" ; "),
      key: `op:${String(regroupement.id)}`,
      ord: [0, rangRegroupement(regroupement.id), 0],
    });
  });
  items
    .filter((item) => !item.op)
    .forEach((item) => {
      const competence = competences.find((candidate) => candidate.code === item.code) ?? { libelle: "", bloc: "" };
      lignes.push({
        op: false,
        bloc: competence.bloc,
        code: item.code as string,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- libellé tel que le référentiel le donne, comme avant
        comp: competence.libelle ? `${String(item.code)} — ${String(competence.libelle)}` : (item.code as string),
        lib: item.libelle && item.libelle !== competence.libelle ? (item.libelle as string) : "",
        ec: textes(item.ecs).join(", "),
        ecn: nomsDesEcs(item.ecs),
        livr: textes(item.livrables).join(" ; "),
        key: `one:${String(item.code)}`,
        ord: [1, Number(competence.bloc) || 99, numeroCode(item.code)],
      });
    });
  return lignes.sort((une, autre) => {
    for (let rang = 0; rang < 3; rang++) {
      const ecart = (une.ord[rang] || 0) - (autre.ord[rang] || 0);
      if (ecart) return ecart;
    }
    return 0;
  });
}

export function colonnesDuDocument(): ReturnType<typeof colonnesExport> {
  return colonnesExport(
    textes(evaluation().livrables).length,
    lignesDuDocument().map((ligne) => ligne.livr || ""),
    critLabel(),
  );
}

/** Étudiants du document : ceux de l'évaluation pour des restitutions (module Étudiants), aucun pour une grille vierge. */
export function etudiantsDuDocument(): { id: string; nom: string }[] {
  return etat.modules.eleves && !exportVide ? studentsOf(evaluation()) : [];
}

/** Nom du fichier : semestre, promotions, intitulé et précision, sans caractère interdit, 120 caractères au plus. */
export function nomDuFichier(extension: string, precision?: string): string {
  const courante = evaluation();
  const parties = [courante.semestre, promotionsAffichees(courante), courante.titre || "évaluation", precision].filter(Boolean).join(" - ");
  return `${parties.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").slice(0, 120)}.${extension}`;
}

/** Ligne de contexte de l'en-tête : promotions, livrables, semestre (et niveau d'acquisition avec ce module). */
export function ligneContexte(): string {
  const courante = evaluation();
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- semestre tel que l'évaluation le range, comme avant
  const semestre = `${courante.semestre}${etat.modules.dn ? ` · ${libelleNiveauDuSemestre(courante.semestre as string)}` : ""}`;
  return [promotionsAffichees(courante), textes(courante.livrables).join(" · "), semestre].filter(Boolean).join(" — ");
}

/** Au-dessus de la ligne de contexte : l'établissement et le ou les enseignants, qui signent le document. */
export function ligneSignature(): string {
  const courante = evaluation();
  const profs = (Array.isArray(courante.profs) && courante.profs.length ? (courante.profs as unknown[]) : [courante.prof])
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- nom saisi, converti comme avant
    .map((prof) => String(prof || "").trim())
    .filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- nom saisi, converti comme avant
  return [String(((etat.donnees.etab || {}) as Objet).nom || "").trim(), profs.join(", ")].filter(Boolean).join(" — ");
}

export function sceauActif(): boolean {
  return sceauDemande(etat.preferences);
}

/** L'évaluation en cours mise en forme pour les documents : une fiche par étudiant (module Étudiants), sinon une fiche vierge. */
export function ficheDuDocument(): Parameters<typeof construireTableur>[0] {
  const courante = evaluation();
  const meta = (etat.referentiel.meta ?? {}) as Objet;
  return {
    diplome: (meta.diplome as string) || "",
    titre: (courante.titre as string) || "",
    signature: ligneSignature(),
    contexte: ligneContexte(),
    consignes: (courante.consignes as string) || "",
    prof: (courante.prof as string) || "",
    semestre: courante.semestre,
    promotions: promotionsAffichees(courante),
    plusieursPromotions: textes(courante.classes).length > 1,
    livrables: courante.livrables,
    niveaux: textes(courante.niveaux),
    colonnes: colonnesDuDocument(),
    lignes: lignesDuDocument().map((ligne) => ({
      cle: ligne.key,
      op: ligne.op,
      bloc: ligne.bloc,
      code: ligne.code,
      lib: ligne.lib,
      comp: ligne.comp,
      ec: ligne.ec,
      ecn: ligne.ecn,
      livr: ligne.livr,
    })),
    etudiants: etudiantsDuDocument().map((etudiant) => ({ nom: etudiant.nom, resultat: ((courante.res || {}) as Objet)[etudiant.id] })),
    sceau: sceauActif() ? sceau : null,
  } as unknown as Parameters<typeof construireTableur>[0];
}

export function tableur(format: string): Blob {
  const ods = format === "ods";
  return new Blob([construireTableur(ficheDuDocument(), ods ? "ods" : "xlsx") as BlobPart], {
    type: ods ? "application/vnd.oasis.opendocument.spreadsheet" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Sceau DN MADE (public/documents/sceau-dn-made.png), lu une seule fois. */
export async function chargerSceau(): Promise<string> {
  if (sceau) return sceau;
  const reponse = await lireFichier("/documents/sceau-dn-made.png");
  if (!reponse.ok) throw new Error("image du sceau DN MADE introuvable");
  const octets = new Uint8Array(await reponse.arrayBuffer());
  let texte = "";
  for (let debut = 0; debut < octets.length; debut += 0x8000) texte += String.fromCharCode(...octets.subarray(debut, debut + 0x8000));
  sceau = btoa(texte);
  return sceau;
}

function nombreNiveaux(): number {
  return textes(evaluation().niveaux).length;
}

export async function documentWord(): Promise<Blob> {
  if (sceauActif()) await chargerSceau();
  return new Blob([(await construireDocx(ficheDuDocument(), dessinateurJauge(nombreNiveaux()))) as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export async function documentOpenDocument(): Promise<Blob> {
  if (sceauActif()) await chargerSceau();
  return new Blob([(await construireOdt(ficheDuDocument(), dessinateurJauge(nombreNiveaux()))) as BlobPart], { type: "application/vnd.oasis.opendocument.text" });
}

const NOMS_FORMATS: Readonly<Record<string, string>> = { docx: "Word", odt: "OpenDocument texte", ods: "OpenDocument tableur" };

/**
 * Exporte l'évaluation de la liste au rang donné : la grille vierge
 * (`mode` « eval »), ou les restitutions par étudiant (« rest », module
 * Étudiants). L'évaluation en cours et la mention affichée sont échangées le
 * temps du document, puis rétablies, même en cas d'échec.
 */
export async function exporterEvaluation(rang: number, format: string, mode: string): Promise<void> {
  const exportee = etat.evaluations[rang];
  if (!exportee) return;
  const enCours = etat.evaluation;
  const restitutions = mode === "rest" && !!etat.modules.eleves;
  const mention = etat.donnees.activeDiplome as string;
  const retablir = (): void => {
    etat.evaluation = enCours;
    exportVide = false;
    afficherMention(mention);
    etat.referentiel = referentielAffiche();
  };
  try {
    etat.evaluation = migF(structuredClone(exportee));
    exportVide = !restitutions;
    afficherMention(mentionDe(etat.evaluation));
    etat.referentiel = referentielAffiche();
    const nom = nomDuFichier(format, restitutions ? "restitutions" : "");
    const donnees = format === "docx" ? await documentWord() : format === "odt" ? await documentOpenDocument() : tableur(format);
    retablir();
    await proposerFichier(nom, donnees, restitutions);
  } catch (erreur) {
    retablir();
    const message = erreur instanceof Error ? erreur.message : erreur;
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- message tel quel, comme avant
    toast(`${NOMS_FORMATS[format] ?? "Excel"} : ${message || erreur}`);
  }
}

/** Étudiants pas encore entièrement évalués ; un non-rendu ou une dispense compte comme terminé. */
export function etudiantsNonFinis(exportee: Objet): { id: string; nom: string }[] {
  const cles = lignesOf(exportee).map((ligne) => ligKey(ligne));
  return studentsOf(exportee).filter((etudiant) => {
      const resultat = ((((exportee.res || {}) as Objet)[etudiant.id] as Objet | undefined) || {});
      if (resultat.nr || resultat.disp) return false;
      const niveaux = (resultat.n || {}) as Objet;
      return !(cles.length && cles.every((cle) => niveaux[cle] != null && niveaux[cle] !== ""));
    });
}

function element<Balise extends keyof HTMLElementTagNameMap>(balise: Balise, attributs: Record<string, string> = {}, ...enfants: (Node | string)[]): HTMLElementTagNameMap[Balise] {
  const noeud = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) noeud.setAttribute(nom, valeur);
  noeud.append(...enfants);
  return noeud;
}

/** Avant d'exporter des restitutions : prévient si des étudiants ne sont pas entièrement évalués ; sinon exporte aussitôt. */
export function avertirAvantRestitution(exportee: Objet, suite: () => void): void {
  const nonFinis = etudiantsNonFinis(exportee);
  if (!nonFinis.length) {
    suite();
    return;
  }
  const precedent = document.activeElement as HTMLElement | null;
  const plusieurs = nonFinis.length > 1;
  const noms = nonFinis
    .slice(0, 8)
    .map((etudiant) => etudiant.nom)
    .join(", ");
  const refuser = element("button", { class: "btn ghost", "data-no": "" }, "Annuler");
  const accepter = element("button", { class: "btn primary", "data-yes": "" }, "Exporter quand même");
  const fenetreModale = element("div", { class: "modal" });
  fenetreModale.append(
    element(
      "div",
      { class: "card", role: "dialog", "aria-modal": "true", "aria-labelledby": "rwT", style: "max-width:440px" },
      element(
        "p",
        { id: "rwT" },
        element("b", {}, "Évaluation pas terminée"),
        ` — ${String(nonFinis.length)} étudiant·e${plusieurs ? "s ne sont" : " n'est"} pas entièrement évalué·e${plusieurs ? "s" : ""} : ${noms}${nonFinis.length > 8 ? "…" : ""}.`,
      ),
      element("p", { class: "hint", style: "font-size:12.5px" }, "Les non-rendus et les dispenses comptent comme terminés. Les restitutions de ces étudiant·es seront incomplètes."),
      element("div", { class: "row" }, refuser, accepter),
    ),
  );
  const fermer = (): void => {
    fenetreModale.remove();
    document.removeEventListener("keydown", clavier);
    precedent?.focus();
  };
  const clavier = (evenement: KeyboardEvent): void => {
    if (evenement.key === "Escape") fermer();
  };
  refuser.onclick = fermer;
  fenetreModale.onclick = (evenement) => {
    if (evenement.target === fenetreModale) fermer();
  };
  accepter.onclick = () => {
    fermer();
    suite();
  };
  document.addEventListener("keydown", clavier);
  document.body.appendChild(fenetreModale);
  accepter.focus();
}

/** Remet le fichier à l'enveloppe et dit ce qu'il en est ; une annulation ne dit rien. */
export async function proposerFichier(nom: string, donnees: Blob, eleves = false): Promise<void> {
  const destination = telechargements();
  if (!destination) {
    toast("Téléchargement indisponible ici.");
    return;
  }
  try {
    await destination.save({ filename: nom, data: donnees, eleves });
    toast(`Fichier enregistré : ${nom}`);
  } catch (erreur) {
    const code = (erreur as { code?: unknown } | null)?.code;
    if (code === "declined") return;
    if (code === "rate_limited") toast("Une demande est déjà en cours, réessaie dans un instant.");
    else if (code === "too_large") toast("Fichier trop volumineux pour cette destination.");
    else {
      const message = (erreur as { message?: unknown } | null)?.message;
      // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions -- message tel quel, comme avant
      toast(`Échec de l'enregistrement${message ? ` : ${message}` : "."}`);
    }
  }
}

/**
 * Donne au module `destination`, qui rend la remise des fichiers à
 * l'enveloppe (absente hors de l'interface), et au besoin la lecture des
 * fichiers livrés (le sceau).
 */
export function brancherExportDocument(destination: () => Telechargements | undefined, lecture?: (chemin: string) => Promise<Response>): void {
  telechargements = destination;
  if (lecture) lireFichier = lecture;
}
