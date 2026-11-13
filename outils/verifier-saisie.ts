// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Démarre l'interface dans un navigateur, charge l'exemple et vérifie que la
 * saisie d'une évaluation est enregistrée sans rien demander à l'enseignant :
 * ce qui est saisi rejoint « Mes évaluations » aussitôt, ouvrir une autre
 * évaluation ne fait rien perdre et affiche bien la sienne. Sort en erreur
 * sinon.
 *
 * L'interface historique n'a pas de tests unitaires : ce contrôle regarde ce
 * que voit l'enseignant et ce qui est réellement écrit dans le stockage.
 *
 * Usage : node outils/verifier-saisie.ts
 */
import { chromium, type Page } from "playwright";
import { createServer } from "vite";

const CLE_EVALUATIONS = "dnmade.fiches";
const CLE_BROUILLON = "dnmade.draft";
const EVALUATION_A = "Évaluation intermédiaire — Mobilier modulaire en frêne";
const EVALUATION_B = "Soutenance intermédiaire — oral et planches";
const ETUDIANT = "Elif Yilmaz";
const NOUVEL_INTITULE = "Contrôle de l'enregistrement automatique";
const DELAI_MS = 20000;

interface EvaluationLue {
  id?: string;
  titre?: string;
  res?: Record<string, { nr?: string }>;
}

/** Lit une entrée du stockage ; hors de l'enveloppe, c'est un magasin en mémoire qui sait lister ses entrées. */
async function lireEntree(page: Page, cle: string): Promise<unknown> {
  const texte = await page.evaluate((cleLue) => {
    const stockage = window.dnmaxPont?.stockage as unknown as { entrees(): Record<string, string> } | undefined;
    return stockage?.entrees()[cleLue] ?? "null";
  }, cle);
  return JSON.parse(texte) as unknown;
}

async function lireEvaluations(page: Page): Promise<EvaluationLue[]> {
  const lues = await lireEntree(page, CLE_EVALUATIONS);
  return Array.isArray(lues) ? (lues as EvaluationLue[]) : [];
}

/** Ouvre la saisie des étudiants, comme l'enseignant : « Actions… » puis « Évaluer les étudiants ». */
async function ouvrirSaisie(page: Page, intitule: string): Promise<void> {
  await page.locator("tr[data-open]", { hasText: intitule }).first().locator("[data-xm]").click();
  await page.locator("[data-sai]").click();
  await page.locator(".egrid .er").first().waitFor();
}

/** Ouvre l'évaluation par un clic sur sa ligne, l'autre chemin offert par la liste. */
async function ouvrirParSaLigne(page: Page, intitule: string): Promise<void> {
  await page.locator("tr[data-open]", { hasText: intitule }).first().click();
  await page.locator("#f-titre, .egrid").first().waitFor({ state: "attached" });
}

async function revenirALaListe(page: Page): Promise<void> {
  await page.locator("#bBack").click();
  await page.locator("tr[data-open]").first().waitFor();
}

/** Nombre de compétences évaluées que la grille affiche, et le « fait/total » de chaque ligne. */
async function lireGrille(page: Page): Promise<{ colonnes: number; totaux: string[] }> {
  return await page.evaluate(() => ({
    colonnes: document.querySelectorAll(".egrid .eh b").length,
    totaux: [...document.querySelectorAll(".egrid .er .n")].map((cellule) => cellule.textContent.split("/")[1] ?? ""),
  }));
}

async function verifier(page: Page): Promise<string[]> {
  const ecarts: string[] = [];

  await page.locator("#bDemo2").click();
  await page.locator("tr[data-open]", { hasText: EVALUATION_A }).first().waitFor({ timeout: DELAI_MS });

  // 1. Une saisie rejoint « Mes évaluations » sans cliquer sur un bouton.
  await ouvrirSaisie(page, EVALUATION_A);
  const ligne = page.locator(".egrid .er", { hasText: ETUDIANT });
  const idEtudiant = (await ligne.getAttribute("data-row")) ?? "";
  await ligne.locator("select.est").selectOption("nr");
  const nonRenduEnregistre = async (): Promise<boolean> => {
    const evaluation = (await lireEvaluations(page)).find((lue) => lue.titre === EVALUATION_A);
    return evaluation?.res?.[idEtudiant]?.nr !== undefined;
  };
  if (!(await nonRenduEnregistre())) {
    ecarts.push("un « Non rendu » saisi n'est pas enregistré dans « Mes évaluations » sans cliquer sur un bouton");
  }

  // 2. Ouvrir une autre évaluation affiche sa grille à elle, pas celle de la précédente.
  //    A compte quatre lignes à évaluer, B trois : une grille restée sur A se voit à son nombre de colonnes.
  await revenirALaListe(page);
  await ouvrirParSaLigne(page, EVALUATION_B);
  const titreAffiche = await page.locator("#f-titre").inputValue();
  if (titreAffiche !== EVALUATION_B) {
    ecarts.push(`l'évaluation ouverte n'est pas celle demandée : « ${titreAffiche} »`);
  }
  if (await page.locator(".egrid").isVisible()) {
    ecarts.push("ouvrir une évaluation par sa ligne laisse à l'écran la grille des étudiants de la précédente");
  }
  await revenirALaListe(page);
  await ouvrirSaisie(page, EVALUATION_B);
  const grilleB = await lireGrille(page);
  if (grilleB.colonnes !== 3 || grilleB.totaux.some((total) => total !== "3")) {
    ecarts.push("la grille affichée n'est pas celle de l'évaluation ouverte");
  }

  // 3. Revenir à la première : ce qui avait été saisi est toujours là, à l'écran comme dans le stockage.
  await revenirALaListe(page);
  await ouvrirSaisie(page, EVALUATION_A);
  const affiche = await page.locator(".egrid .er", { hasText: ETUDIANT }).locator("select.est").inputValue();
  if (affiche !== "nr" || !(await nonRenduEnregistre())) {
    ecarts.push("la saisie est perdue après être passé par une autre évaluation");
  }

  // 4. Une nouvelle évaluation rejoint la liste dès qu'elle a un intitulé, et y reste si l'on en ouvre une autre.
  await revenirALaListe(page);
  const nombreAvant = (await lireEvaluations(page)).length;
  await page.locator("#bNew").click();
  await page.locator("#f-titre").fill(NOUVEL_INTITULE);
  await page.locator("#f-titre").blur();
  await revenirALaListe(page);
  await ouvrirParSaLigne(page, EVALUATION_B);
  const apres = await lireEvaluations(page);
  if (apres.length !== nombreAvant + 1 || !apres.some((lue) => lue.titre === NOUVEL_INTITULE)) {
    ecarts.push("une nouvelle évaluation dotée d'un intitulé n'est pas enregistrée d'elle-même");
  }

  // 5. Une nouvelle évaluation laissée vide n'encombre pas la liste.
  await revenirALaListe(page);
  await page.locator("#bNew").click();
  await revenirALaListe(page);
  if ((await lireEvaluations(page)).length !== nombreAvant + 1) {
    ecarts.push("une nouvelle évaluation vide a été ajoutée à la liste");
  }

  // 6. Une évaluation supprimée ne revient pas : le brouillon ne la garde pas.
  if ((await page.locator("tr[data-open]", { hasText: NOUVEL_INTITULE }).count()) === 0) {
    ecarts.push("la nouvelle évaluation n'apparaît pas dans la liste");
    return ecarts;
  }
  await page.locator("tr[data-open]", { hasText: NOUVEL_INTITULE }).first().click();
  const idNouvelle = (await lireEvaluations(page)).find((lue) => lue.titre === NOUVEL_INTITULE)?.id;
  await revenirALaListe(page);
  const rangee = page.locator("tr[data-open]", { hasText: NOUVEL_INTITULE }).first();
  await rangee.locator("[data-xm]").click();
  await page.locator('[data-act="annul"]').click();
  await page.locator("[data-del]").first().click();
  await page.locator("[data-del]").first().click();
  const brouillon = (await lireEntree(page, CLE_BROUILLON)) as EvaluationLue | null;
  if ((await lireEvaluations(page)).some((lue) => lue.id === idNouvelle)) {
    ecarts.push("l'évaluation supprimée est toujours dans la liste");
  } else if (brouillon?.id === idNouvelle) {
    ecarts.push("le brouillon garde l'évaluation supprimée : la prochaine modification la ferait réapparaître");
  }

  return ecarts;
}

const serveur = await createServer({ server: { port: 0, strictPort: false }, logLevel: "error" });
await serveur.listen();
const adresse = serveur.resolvedUrls?.local[0];
const navigateur = await chromium.launch();
let code = 0;
try {
  if (adresse === undefined) {
    throw new Error("le serveur de développement n'a pas d'adresse");
  }
  const contexte = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  const page = await contexte.newPage();
  page.setDefaultTimeout(DELAI_MS);
  const erreurs: string[] = [];
  page.on("pageerror", (erreur) => erreurs.push(String(erreur)));
  await page.goto(adresse);
  await page.waitForFunction(() => window.dnmaxPont?.stockage !== undefined, undefined, { timeout: DELAI_MS });
  const ecarts = [...(await verifier(page)), ...erreurs.map((erreur) => `erreur de page : ${erreur}`)];
  if (ecarts.length > 0) {
    console.error(`La saisie n'est pas enregistrée comme attendu :\n- ${ecarts.join("\n- ")}`);
    code = 1;
  } else {
    console.log("Saisie enregistrée d'elle-même : rien n'est perdu en changeant d'évaluation.");
  }
} finally {
  await navigateur.close();
  await serveur.close();
}
process.exit(code);
