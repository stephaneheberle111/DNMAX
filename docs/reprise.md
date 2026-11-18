# Reprise du travail en cours

État au 18 novembre 2026, à la fusion de #208 (fin de la 0.9.1), pour reprendre le chantier sans rien perdre. À lire avec `CLAUDE.md` (règles du projet), `DECISIONS.md` (décisions 36 à 38 surtout) et `docs/revue-coherence.md`.

## Où en est le projet

- **Version 0.9.0** : fusionnée dans `main` (#132), **pas publiée**. L'atelier « Publication » n'a pas été lancé ; il ne se lance qu'avec le feu vert de l'auteur.
- **Recette sur le bureau de l'auteur** : en cours de son côté, avec les installeurs d'essai de l'atelier « Installeurs », exécution n° 8 (Windows et Linux ; macOS annulé faute de machine, comme les fois précédentes), et la fiche `docs/recette-0.9.md` (parties A à J). Puis publication de la 0.9, sur son accord.
- **0.9.1 terminée côté code** (décision 38, voir plus bas) : groupes 1 à 8 fusionnés (#184 à #201), groupe 9 fusionné (#203, #204, #206, #207, #208). Le fichier historique ne garde plus que la carte radiale, la chaîne et leurs aides : c'est la 0.9.2.
- **Contrôles** : linter et typage sans erreur, 1 311 tests au vert sur `main`.
- **Fichier historique** : 963 lignes (7 756 au départ), presque toutes pour la carte radiale et la chaîne.

## Le fichier historique

`public/heritage/application.js` est passé de 7 756 à 963 lignes. Ce qui en est sorti, dans l'ordre des demandes de fusion :

| Demande | Ce qui est sorti | Où |
|---|---|---|
| #139 à #144 | L'éditeur d'évaluation entier : saisie des étudiants, formulation, compétences, étape 1, barre des étapes | `src/editeur/`, règles dans `src/domaine/` (`evaluation`, `cadre-evaluation`, `progression-competences`, `etapes-editeur`, `saisie-resultats`, `teintes-niveaux`) |
| #145 | Exports Word, OpenDocument, Excel et ODS | `src/export/` |
| #146 | Statut d'une évaluation (suivi) et calculs de la page Progression | `src/domaine/suivi-evaluation.ts`, `src/domaine/progression.ts` |
| #147 | La copie du référentiel Objet (3 250 lignes) : l'exemple installe le fichier livré | `src/heritage/exemple.ts` |
| #148 | Volets Établissement et Répartition de service de Mon établissement | `src/etablissement/volets.ts`, `src/domaine/etablissement.ts` |
| #154 | Éditeur commun (panneau, suppression en deux temps), volets Enseignants et Livrables (Préférences), règles des noms | `src/etablissement/editeur-commun.ts`, `enseignants.ts`, `livrables.ts`, `src/domaine/personnes.ts` |
| #155 | Volet Promotions de Mon établissement : ordre, état, liste des étudiants | `src/etablissement/promotions.ts`, `src/domaine/promotions.ts` |
| #156 | Volet Diplômes et mentions ; code et libellé d'un diplôme | `src/etablissement/diplomes.ts`, `src/domaine/diplomes.ts` |
| #157 | Constituer : outils communs aux étapes 1 à 3 et étape 1 (UE) ; règles des éléments (libellé, élément neuf, codes en double, semestres, retrait) | `src/referentiel/etapes.ts`, `src/domaine/constituer.ts` |
| #158 | Constituer, étape 2 (EC) : codes par année, ordre, filtre | `src/referentiel/etapes.ts`, `src/domaine/constituer.ts` |
| #159 | Constituer, étape 3 (blocs et compétences) : ordre, filtre, rattachements lus ; fin de l'éditeur commun historique (`edPanel`, `delBtn`) | `src/referentiel/etapes.ts`, `src/domaine/constituer.ts` |
| #160 | Constituer, étape 4 (planification par semestre) : colonnes, rattachements | `src/referentiel/planification.ts`, `src/domaine/planification.ts` |
| #161 | Constituer : page des cinq étapes et étape 5 (validation, versions) | `src/referentiel/constituer.ts`, `src/domaine/constituer.ts` |
| #163 | Explorer, vue « Recherche » : paires compétence × EC, regroupements, surlignage | `src/referentiel/recherche.ts`, `src/domaine/exploration.ts` |
| #164 | Explorer, habillage de la carte : diplôme et mention, tuiles de filtre, barre des vues, tableaux EC × semestres et compétences × semestres | `src/referentiel/habillage-carte.ts`, `src/domaine/exploration.ts` |
| #165 | Mes évaluations : barre des filtres | `src/evaluations/filtres.ts`, `src/domaine/filtres-evaluations.ts` |
| #166 | Mes évaluations : liste, colonne de suivi (frise, suivi simplifié) et fenêtre de chaque étape | `src/evaluations/liste.ts`, `src/domaine/frise-suivi.ts` |
| #167 | Mes évaluations : fenêtre des actions (évaluer, exporter, dupliquer, terminer, restituer, annuler, rétablir) | `src/evaluations/actions.ts`, `src/domaine/actions-evaluation.ts` |
| #168 | Progression, vue « Promotion » ; choix des promotions et des semestres | `src/progression/promotion.ts`, `src/domaine/vue-progression.ts` |
| #169 | Progression, vue « Étudiant » (avancement du semestre, comparaison à la classe, trajectoires, niveaux d'acquisition) ; barre des filtres commune aux deux vues | `src/progression/etudiant.ts`, `src/domaine/vue-progression.ts` |
| #170 | L'exemple : noms, répartition, évaluations détaillées et jeu étendu, résultats | `src/domaine/exemple.ts` |
| #171 | Barre des onglets, vues affichées et titre de la fenêtre | `src/interface/onglets.ts`, `src/domaine/onglets.ts` |
| #172 | Paramètres > Modules : catalogue, dépendances, cartes et activation du module Étudiants | `src/parametres/modules.ts`, `src/domaine/modules.ts` |
| #173 | Préférences : nom du champ d'évaluation, sceau, dossier des exports | `src/preferences/preferences.ts`, `src/domaine/preferences.ts` |
| #174 | Étape 1 : intitulé, consignes, dates ; retrait du panneau « Étudiants et promotions » et du choix du diplôme, toujours masqués | `src/editeur/formulaire.ts` |
| #176 | Branchements des boutons et champs fixes au chargement ; retrait du bouton d'export JSON absent de la page | `src/interface/branchements.ts` |
| #177 | Modèle de données : dictionnaire, référentiel de chaque diplôme, vue fusionnée, associations proposées, nouvelle mention, données d'une installation neuve | `src/domaine/modele-donnees.ts` |
| #178 | Modèle de données : projection du référentiel actif et d'une version validée, code de chaque année | `src/domaine/modele-donnees.ts` |
| #184 | 0.9.1, groupe 1 : état de l'interface (`DATA`, `REF`, `F`, `fiches`, `promos`, `MOD`, `PREFS`, `ui`) tenu côté TypeScript et publié sur la fenêtre par accesseurs | `src/interface/etat.ts` |
| #186 | 0.9.1, groupe 2 : promotions, années scolaires et calendrier (24 fonctions) | `src/interface/promotions-calendrier.ts` |
| #189 | 0.9.1, groupe 3 : versions et validation du référentiel (22 fonctions ; `allerValidation` reste, à cause d'`edArm`) | `src/interface/versions-referentiel.ts`, règles dans `src/domaine/versions-referentiel.ts` |
| #193 | 0.9.1, groupe 4 : Mon établissement (barre des volets, Établissement, Répartition, Promotions) et suppression en deux temps ; `edArm` publié dans l'état (`etat.armement`). `paintEditor` et `asOf` restent | `src/interface/etablissement.ts`, règles dans `src/domaine/repartition.ts` |
| #196 | 0.9.1, groupe 5 : barre Constituer / Explorer, page des cinq étapes, contexte des étapes 1 à 3, passages vers une étape et vers la validation (`allerValidation` compris). Restent la carte (`paintMap`, `paintExplore`) et la planification (`paintMatrice`, qui lit `BLOC_TINT` et `SEMS`, constantes invisibles depuis TypeScript) | `src/interface/referentiel.ts` |
| #197 | 0.9.1, groupe 6 : enregistrement de l'évaluation en cours (`save`, brouillon, ligne d'enregistrement), passage d'une étape à l'autre (`goStep`, `paintSteps`), contextes de la formulation et de la saisie des étudiants. Restent l'étape 1 (`paintForm` et ses blocs) et les compétences (`contexteCompetences`, qui lit `BLOC_TINT` et `norm`) | `src/interface/editeur.ts` |
| #198 | 0.9.1, groupe 7 : Mes évaluations (suivi et statut, filtres, liste, fenêtre des actions, suppression armée). Restent l'export d'un document (`exportFiche`, `offer`, `ficheExport`) et l'avertissement avant de restituer (`askRestitWarn`) | `src/interface/evaluations.ts` |
| #199 | 0.9.1, groupe 8 : Progression, vues « Promotion » et « Étudiant » (`paintProg`, `paintProgEleve`, `dnPalier`). Restent l'exemple (`loadDemo`, `demoMass`, `validerExemple`) et l'export d'un document | `src/interface/progression.ts` |
| #200 | 0.9.1, groupe 8 : export d'un document (lignes, colonnes, en-tête, nom du fichier, sceau, Word, OpenDocument, tableur, avertissement avant restitution, remise à l'enveloppe) ; `ligneEnseignant`, jamais appelée, est retirée. Reste l'exemple (`loadDemo`, `demoMass`, `validerExemple`) | `src/interface/export-document.ts` |
| #201 | 0.9.1, groupe 8 : l'exemple (évaluations détaillées, jeu étendu, validation de son référentiel), l'ordre des tirages gardé à l'identique ; vérifié au banc à trois dates | `src/interface/exemple.ts` |
| #203 | 0.9.1, groupe 9 : constantes lues par les adaptateurs (`SEMS`, `PRESETS`, `SUPPORTS_DEF`, `GROUPS`, `norm`, `tidy`) publiées depuis TypeScript ; `BLOC_TINT` devient un accesseur de l'état (`etat.teinteBlocs`) | `src/interface/constantes.ts`, `src/interface/etat.ts` |
| #204 | 0.9.1, groupe 9 : aides du modèle (`saveData`, `persistData`, `newId`, `anneeCode`, codes des EC, préférences) et de l'évaluation en cours (`studentsOf`, `lignesOf`, `syncListe`, `ecsOfSem`…) ; cinq fonctions appelées nulle part retirées | `src/interface/donnees.ts`, `src/interface/evaluation-courante.ts` |
| #205 | Intégration continue : quinze minutes pour la tâche « Interface » (installation de Playwright plus lente) | `.github/workflows/ci.yml` |
| #206 | 0.9.1, groupe 9 : Préférences, Paramètres > Modules, éditeur commun et planification (`paintPrefs`, `paintSet`, `appliquerModule`, `paintEditor`, `paintMatrice`…) ; règle `semestreRetenu` ; `asOf` retirée | `src/interface/preferences-parametres.ts`, règle dans `src/domaine/planification.ts` |
| #207 | 0.9.1, groupe 9 : étape 1 et compétences de l'éditeur (`paintForm`, `paintClasse`, `toggleClasse`, `contexteCompetences`, `paintPick`, `vierge`, `nouvelleFiche`…) ; cinq règles sorties de l'affichage ; dix fonctions appelées nulle part retirées | `src/interface/editeur-etape1.ts`, règles dans `src/domaine/cadre-evaluation.ts` |
| #208 | 0.9.1, groupe 9 : démarrage (lecture des données, état de départ, branchements, premier dessin, ponts `ouvrirPreferences`, `projeterReferentiel`, `ajusterEnseignants`, `ouvrirEtablissement`), appelé par le pont juste après la lecture du script ; constantes de tête devenues inutiles retirées | `src/interface/demarrage.ts` |
| #209, #211 | Hors reprise : Mes évaluations, promotions des collègues proposées dans le filtre (masquées par défaut) et case « Seulement mes évaluations » | `src/domaine/filtres-evaluations.ts`, `src/evaluations/filtres.ts` |
| #212 | Intégration continue : compilation Rust gardée en cache, trente minutes pour la tâche « Enveloppe de bureau » | `.github/workflows/ci.yml` |

Hors reprise, depuis #178 : fiche de recette complétée (#179), installeur Windows en français (#180), visite du référentiel simplifiée et boutons bleus de Constituer retirés (#181), évaluation possible sur un référentiel non validé avec un rappel (#182), mes promotions distinguées des autres dans une évaluation (#183), lien `node_modules` retiré (#185), `promoLabel` rétabli et garde-fou des appels (#187).

Le fichier historique ne garde, pour ces parties, que de petits adaptateurs qui construisent le contexte de chaque écran et l'appellent par `window.dnmaxPont` (déclaré dans `src/heritage/pont.ts`).

## Ce qui reste, dans l'ordre convenu avec l'auteur

L'auteur préfère une v1 propre à une sortie rapide. Toute l'interface, hors des deux cartes, est écrite en TypeScript (voir le tableau) : Mes évaluations, Progression, l'exemple, l'éditeur, Référentiel, Mon établissement, Préférences, Paramètres, le modèle de données et le démarrage. Le fichier historique ne garde que la carte radiale, la chaîne et leurs aides, reprises par la 0.9.2 ci-dessous.

### 0.9.1 et 0.9.2 (décision 38)

La décision 5 est levée : le fichier historique disparaît. 0.9.1 reprend tout sauf la carte radiale et la carte heuristique (chaîne) ; 0.9.2 reprend ces deux cartes, avec un contrôle visuel de l'auteur. Ordre prévu pour la 0.9.1, un groupe par demande :

1. État partagé (`src/interface/etat.ts`) : **fait** (#184).
2. Promotions, années scolaires et calendrier : **fait** (#186).
3. **Fait** (#189) : versions et validation du référentiel, lignes 1572 à 1687 du fichier historique (`versionsOf`, `refJSON`, `versionActive`, `refAJour`, `dipRefValide`, `promoRefValide`, `promosDeF`, `dipBloquant`, `allerValidation`, `promoDeF`, `promoVid`, `promosEnCours`, `versionPourF`, `projectSnap`, `computeREF`, `versionUsage`, `validerVersion`, `promoLabel`, `askPromosVersion`, `restaurerVersion`, `mentionDeFiche`, `vueMention`, `frDate`). `edArm` est publié dans l'état depuis le groupe 4 (`etat.armement`) : `allerValidation` peut maintenant quitter le fichier historique. Les règles existent déjà en partie dans `src/domaine/validation-referentiel.ts` et `src/domaine/modele-donnees.ts` (`referentielDe`, `projeterVersion`, `absorber`, `materialiser`).
4. **Fait** (#193) : Mon établissement : préparation des volets (`paintOrg`, `paintEtab`, `paintAffect`, `paintPromosOrg`, `affectOf`…).
5. **Fait** (#196) : Référentiel : préparation de Constituer et de l'habillage de la carte (`paintRef`, `paintConstituer`, `paintEtape`, `paintMap` hors dessin).
6. **Fait** (#197) : Éditeur : enregistrement, étapes, contextes des écrans (`save`, `goStep`, `paintPick`, `paintLignes`, `paintEleves`…).
7. **Fait** (#198) : Mes évaluations, exports et actions (`paintSaved`, `exportFiche`, `offer`, `ficheExport`, `buildDocx`…).
8. **Fait** (#199, #200, #201) : Progression (`paintProg`, `paintProgEleve`) et l'exemple (`loadDemo`, `demoMass`).
9. **Fait** (#203, #204, #206, #207, #208) : constantes, aides du modèle et de l'évaluation en cours, Préférences et Paramètres, étape 1 de l'éditeur, démarrage.

**0.9.2, prochain chantier** : la carte radiale et la chaîne (`paintExplore`, `paintRadial`, `paintChain`, `pivotWheel`, `radialWire`, `radInfo`, `paintMap` et leurs aides : `esc`, `help`, `askModal`, `toast`, `paintTabs`, `blocName`, `hueOf`, `ecColor`, `ueColor`, `ueOrd`, `ecNum`, `lienEc`, `ecOrd`, `anneeOf`, `ANNEES`), avec le contrôle visuel de l'auteur. Ce qui reste hors des deux cartes (`paintTabs`, `toast`, `askModal`, `help`, `esc`) peut sortir d'abord, sans risque pour leur dessin.

La carte radiale (`paintRadial`, `radialWire`, `pivotWheel`, `radInfo`) et la chaîne (`paintChain`, `chainModel`, `chainWire`, `chainBind`) restent dans le fichier historique, inchangées. Pour comparer, ces deux vues ne sont pas reproductibles d'une exécution à l'autre (positions animées, hauteurs mesurées selon les polices) : neutraliser nombres, `transform` et `style` avant de comparer.

**Consigne de l'auteur, à respecter strictement : aucun risque sur la carte radiale (`paintRadial`, `radialWire`, `pivotWheel`, `radInfo`) ni sur la chaîne (`paintChain`, `chainModel`, `chainWire`).** Leur dessin reste tel quel. Au plus, un calcul déjà isolé peut en sortir, avec une comparaison d'images avant et après.

### Comment reprendre un groupe

Suivre #186 comme modèle :

- un module `src/interface/<sujet>.ts` qui lit l'état par `etat` (`src/interface/etat.ts`) et appelle ce qui reste dans le fichier historique par la fenêtre (fonction `historique()`) ;
- une fonction `publier<Sujet>(fenetre, …)` qui pose les fonctions sous leurs anciens noms ; l'appeler dans `src/heritage/pont.ts`, avant le chargement du fichier historique, à côté de `publierPromotionsCalendrier` ;
- **ajouter cet appel à `nomsPublies()`** dans `src/heritage/appels-historiques.test.ts` : ce garde-fou échoue si le fichier historique appelle une fonction définie nulle part (c'est lui qui aurait repéré le retrait à tort de `promoLabel` par #174) ;
- retirer les fonctions du fichier historique, tests du module, banc des 21 parcours identique, ligne au CHANGELOG.

## Questions en attente de l'auteur

Aucune pour l'instant. Étiquettes `v0.7.0` et `v0.8.0` : déplacées par l'auteur le 18 novembre sur l'historique réécrit (`d7d3bff` et `f5fd052`, même arbre que les anciens commits).

Décidé le 18 novembre : dans « Mes évaluations », l'enseignant filtre selon qu'il est l'auteur de l'évaluation et selon les promotions, les siennes d'abord, celles des collègues accessibles mais masquées par défaut. Fait : #209 pour les promotions (celles des collègues masquées, affichées à la demande ; une évaluation hors répartition apparaît si l'une de ses promotions est cochée) et #211 pour la case « Seulement mes évaluations » (celles dont « C'est moi » est l'enseignant : DNMAX ne retient pas qui a créé une évaluation).

## Méthode : réécrire sans rien changer

Chaque morceau suit la décision 37 :

1. Lire le code historique et repérer les **règles cachées dans l'affichage**. Les sortir dans `src/domaine/`, avec des tests (un cas qui déclenche, un qui ne déclenche pas, un cas limite).
2. Réécrire l'écran en TypeScript : un module qui reçoit un **contexte** (les données, et des fonctions pour enregistrer et redessiner) et dessine avec `creer` / `creerBouton` (`src/ecran-echange.ts`), sans `innerHTML` construit par concaténation.
3. Remplacer le code historique par un adaptateur ; exposer le module sur le pont.
4. **Prouver l'équivalence** en rejouant le même parcours sur l'ancienne et la nouvelle version, et en comparant les données enregistrées et l'affichage.

### Banc de comparaison

Le banc est dans `outils/banc/` : `banc.cjs` (les 23 parcours, dont « repartition » depuis le groupe 4 et « exports » depuis l'export d'un document : empreinte de chaque document produit) et `comparer.sh`, qui rejoue chaque parcours deux fois sur `main` et une fois sur la branche, heure figée, stockage final compris, et affiche pour chacun `repro` / `NON-REPRO` puis `EGAL` / `DIFFERENT` (`PARCOURS="promotions liste" outils/banc/comparer.sh` pour n'en jouer que quelques-uns). Pour la planification, neutraliser `--h1` / `--h2` ; pour Préférences, l'élément actif après redessin (voir les pièges).

- Servir une copie de `main` à côté de la branche :
  - `git worktree add --detach <dossier> origin/main` hors du dépôt ;
  - dans la copie, `npm ci` (**pas de lien symbolique vers `node_modules`** : voir les pièges) ;
  - `npx vite --port 1421 --strictPort` dans la copie, et la branche sur le port 1420.
- Un script Playwright joue le parcours sur les deux ports et écrit un JSON par port. Il fixe l'heure et le hasard avant le chargement (`addInitScript`), y compris `crypto.randomUUID`, dont l'exemple tire l'identifiant de la version livrée :
  - `Date.now` et `new Date()` sans argument rendent une date fixe ;
  - `Math.random` est remplacé par un générateur à graine (`graine = graine * 16807 % 2147483647`).
- Charger l'exemple (`#t-set` puis `#bDemo`), ouvrir l'écran visé, faire les gestes, et relever :
  - les données (`F`, `fiches`, `DATA`, ou les entrées du stockage) ;
  - le HTML de la zone (`innerHTML`).
- Comparer les deux JSON octet par octet (`cmp`). Vérifier aussi que chaque geste a eu un effet : deux versions qui ne font rien sont « identiques ».
- Avant de conclure, produire deux fois sur `main` et vérifier que les deux productions sont identiques ; sinon la comparaison ne prouve rien.
- Pour les exports : décompresser les fichiers et comparer chaque partie (XML et images). Les onze documents de #145 étaient identiques octet par octet.

### Vérification renforcée (modèle de données)

En plus du banc, comparer fonction par fonction l'ancien code et le nouveau :

- extraire les fonctions du fichier historique de `main` (`git show origin/main:public/heritage/application.js`) et les charger avec `new Function`, avec un `newId` à compteur ;
- transpiler le module TypeScript en CommonJS (`typescript.transpileModule`) ;
- appliquer les deux aux mêmes données, et comparer le JSON obtenu après chaque étape : classement, vue, modification puis report, enregistrement, associations proposées, nouvelle mention ;
- données : quelques milliers de jeux tirés au hasard (doublons écrits différemment, champs absents, diplômes inconnus, liens anciens par `ecIds`), plus les données de l'exemple relevées par le banc à trois dates ;
- s'assurer que la comparaison voit les erreurs en injectant quelques défauts dans la version transpilée : chacun doit faire apparaître des écarts.

### Pièges déjà rencontrés

- **Serveur Vite arrêté** après un redémarrage de l'environnement : relancer `npx vite --port 1420 --strictPort` avant tout essai dans le navigateur.
- **Copie de `main` sans polices** : servie depuis un autre dossier, elle ne charge pas les polices (Vite refuse de servir `node_modules` par le lien symbolique, hors de sa liste autorisée), d'où des écarts d'un pixel sur les captures. Comparer le balisage et les données, pas les pixels. La planification par semestre mesure la hauteur de son en-tête (`--h1`, `--h2`) : ces deux valeurs peuvent différer pour la même raison et se neutralisent avant de comparer.
- **Base de comparaison décalée** : quand des demandes sont empilées, comparer à la branche précédente de la pile, pas à `main`. Sinon les identifiants tirés au hasard diffèrent.
- **Localisateurs Playwright qui se déplacent** : `.first()` sur « la première case non cochée » change de cible après chaque clic. Viser un attribut précis (`[data-code="…"]`).
- **Bulle « Exemple chargé »** : elle recouvre une partie de la grille pendant quelques secondes et intercepte la souris.
- **Différences de sérialisation sans effet** : `class=""` posé par `creer`, `selected` posé par propriété, `0px` au lieu de `0`. Normaliser avant de comparer, ou éviter (`document.createElement` quand l'attribut doit rester absent).
- **Identifiants tirés de l'horloge** (`newId`, identifiants des mentions et des étudiants) : le banc avance l'heure d'une milliseconde à chaque `Date.now`. Une réécriture qui appelle l'horloge un nombre de fois différent change ces identifiants sans rien changer d'autre. Pour l'exemple, rejouer avec l'heure figée (et plusieurs dates) ; ailleurs, neutraliser ces identifiants avant de comparer.
- **Focus après un redessin** : quand le champ qui a le focus est masqué par le redessin, l'élément actif relevé varie d'une exécution à l'autre, sur `main` aussi. Comparer sans le focus à cette étape.
- **Lien `node_modules` commité** (#183, retiré par #185) : un lien symbolique créé dans une copie de travail a été entraîné par une fusion et a remplacé `node_modules` par un lien vers lui-même. `.gitignore` ignore désormais `node_modules` sous toutes ses formes ; après une récupération malheureuse, supprimer `node_modules` et relancer `npm ci`.
- **Fonction retirée encore appelée** (`promoLabel`, #174 → #187) : seul l'écran qui l'appelle la révèle. Le garde-fou `src/heritage/appels-historiques.test.ts` le voit maintenant ; le tenir à jour à chaque groupe.
- **Serveurs et tâches de fond arrêtés** de temps en temps dans l'environnement de travail : jouer le banc par lots de moins de dix minutes, au premier plan, et relancer les serveurs Vite avant chaque lot.
- **Intégration continue : tâche « Enveloppe de bureau » annulée après 20 minutes** (#186) : relancée une fois, elle passe en quatre minutes. Ne pas la relancer plus d'une fois sans chercher la cause.
- **CHANGELOG** : il entre en conflit à presque chaque fusion ; garder les deux entrées.
- **Banc qui appelait une constante du fichier historique** (#208) : deux gestes écrivaient les réglages par `LS`, retiré avec le démarrage. Le banc ne doit appeler que ce que l'application publie (`window.dnmaxPont`, fonctions publiées sous leur ancien nom).
- **Travail en parallèle** (#206, #207) : deux reprises menées en même temps, dans deux copies du dépôt, avec chacune son banc sur d'autres ports (1430/1431, 1440/1441 : copier `comparer.sh` en changeant les ports). Les conflits se limitent au pont et au garde-fou (garder les deux côtés) ; rejouer au banc les parcours communs sur le résultat combiné.
- **Demandes empilées puis fusionnées par écrasement** : en intégrant `main` dans la branche suivante, les conflits se règlent par la version de la branche, qui contient déjà le contenu fusionné.

## Règles de travail à garder

- Une branche par changement (`refactor/…`, `fix/…`, `docs/…`), fusion par écrasement une fois l'intégration continue verte. Ne pas fusionner sans accord : publication, changement notable du site, migration de données.
- Identité git du dépôt : `Stéphane Héberlé <contact@dnmax.fr>`, à régler en début de session.
- Aucune mention d'outil d'assistance dans le code, les commits, les branches ou les demandes de fusion ; retirer tout pied de page ajouté automatiquement aux demandes de fusion.
- **Plan d'avancement** : le tenir à jour à chaque fusion (plan « Plan DNMAX 0.9.1 »). Garder les messages de discussion courts : le plan porte le suivi. L'auteur y suit le travail ; il contient, dans cet ordre :
  - l'heure de la dernière mise à jour (heure de Paris) ;
  - « À vous » : ce qui attend l'auteur (questions ci-dessus, recette et publication en fin d'optimisation) ;
  - « En cours » : seulement ce sur quoi on travaille réellement. Il est vide (« Rien ») quand on attend la réponse de l'auteur ou une vérification automatique ;
  - « Ensuite, dans l'ordre » : les demandes de fusion en attente de vérification, puis la liste de « Ce qui reste » ;
  - « Déjà fait » : les demandes fusionnées (#139 à #208), avec une ligne chacune ;
  - le nombre de tests sur `main` (1 311 au 18 novembre, à la fin de la 0.9.1) ;
  - le nombre de lignes restant dans le fichier historique (963 au 18 novembre, 7 756 au départ).
