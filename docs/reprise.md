# Reprise du travail en cours

État au 17 novembre 2026, à la fusion de #148, pour reprendre le chantier sans rien perdre. À lire avec `CLAUDE.md` (règles du projet), `DECISIONS.md` (décisions 36 et 37 surtout) et `docs/revue-coherence.md`.

## Où en est le projet

- **Version 0.9.0** : fusionnée dans `main` (#132), datée du 17 novembre dans le CHANGELOG, **pas publiée**. L'atelier « Publication » n'a pas été lancé.
- **Recette et publication** : l'auteur les fera **en une seule fois, à la fin de l'optimisation du fichier historique**. Préparer alors une fiche de recette ciblée sur ce qui a changé (partir de `docs/recette-0.9.md`), refaire la revue de cohérence, redater la version, puis attendre le feu vert pour lancer « Publication ».
- **Installeurs de test** : la dernière exécution de l'atelier « Installeurs » (n° 6) a produit Windows et Linux ; macOS a été annulé faute de machine disponible, comme les deux fois précédentes.
- **Contrôles** : linter et typage sans erreur, 810 tests, `verifier:saisie` et `verifier:vide` passent sur `main`.

## Le fichier historique

`public/heritage/application.js` est passé de 7 756 à 3 714 lignes. Ce qui en est sorti, dans l'ordre des demandes de fusion :

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
| (cette demande) | Constituer, étape 3 (blocs et compétences) : ordre, filtre, rattachements lus ; fin de l'éditeur commun historique (`edPanel`, `delBtn`) | `src/referentiel/etapes.ts`, `src/domaine/constituer.ts` |

Le fichier historique ne garde, pour ces parties, que de petits adaptateurs qui construisent le contexte de chaque écran et l'appellent par `window.dnmaxPont` (déclaré dans `src/heritage/pont.ts`).

## Ce qui reste, dans l'ordre convenu avec l'auteur

**À fusionner avec la publication de la 0.9, pas avant** : la branche `docs/site-niveaux` (textes du site et de la documentation lue dans l'application sur les niveaux d'acquisition ; niveau de 3e année « Autonome » dans les deux référentiels livrés, empreinte recalculée). Toute fusion qui touche `site/` publie dnmax.fr (`.github/workflows/site.yml`).

1. **L'éditeur commun** : fait. Tous ses volets sont dans `src/etablissement/` et `src/referentiel/etapes.ts` ; le fichier historique ne garde que la suppression en deux temps (`edArm`, `armDel`), partagée avec la liste des versions de la validation.
2. **Référentiel > Constituer** : planification par semestre (`paintMatrice`), validation, page d'étape (`paintEtape`, `paintConstituer`).
3. **Référentiel > Explorer** : la recherche et l'habillage autour de la carte.

**Consigne de l'auteur, à respecter strictement : aucun risque sur la carte radiale (`paintRadial`, `radialWire`, `pivotWheel`, `radInfo`) ni sur la chaîne (`paintChain`, `chainModel`, `chainWire`).** Leur dessin reste tel quel. Au plus, un calcul déjà isolé peut en sortir, avec une comparaison d'images avant et après.

## Questions en attente de l'auteur

Aucune pour le moment.

## Méthode : réécrire sans rien changer

Chaque morceau suit la décision 37 :

1. Lire le code historique et repérer les **règles cachées dans l'affichage**. Les sortir dans `src/domaine/`, avec des tests (un cas qui déclenche, un qui ne déclenche pas, un cas limite).
2. Réécrire l'écran en TypeScript : un module qui reçoit un **contexte** (les données, et des fonctions pour enregistrer et redessiner) et dessine avec `creer` / `creerBouton` (`src/ecran-echange.ts`), sans `innerHTML` construit par concaténation.
3. Remplacer le code historique par un adaptateur ; exposer le module sur le pont.
4. **Prouver l'équivalence** en rejouant le même parcours sur l'ancienne et la nouvelle version, et en comparant les données enregistrées et l'affichage.

### Banc de comparaison

- Servir une copie de `main` à côté de la branche :
  - `git worktree add --detach <dossier> origin/main` ;
  - lien symbolique vers `node_modules` ;
  - `npx vite --port 1421 --strictPort` dans la copie, et la branche sur le port 1420.
- Un script Playwright joue le parcours sur les deux ports et écrit un JSON par port. Il fixe l'heure et le hasard avant le chargement (`addInitScript`) :
  - `Date.now` et `new Date()` sans argument rendent une date fixe ;
  - `Math.random` est remplacé par un générateur à graine (`graine = graine * 16807 % 2147483647`).
- Charger l'exemple (`#t-set` puis `#bDemo`), ouvrir l'écran visé, faire les gestes, et relever :
  - les données (`F`, `fiches`, `DATA`, ou les entrées du stockage) ;
  - le HTML de la zone (`innerHTML`).
- Comparer les deux JSON octet par octet (`cmp`). Vérifier aussi que chaque geste a eu un effet : deux versions qui ne font rien sont « identiques ».
- Avant de conclure, produire deux fois sur `main` et vérifier que les deux productions sont identiques ; sinon la comparaison ne prouve rien.
- Pour les exports : décompresser les fichiers et comparer chaque partie (XML et images). Les onze documents de #145 étaient identiques octet par octet.

### Pièges déjà rencontrés

- **Serveur Vite arrêté** après un redémarrage de l'environnement : relancer `npx vite --port 1420 --strictPort` avant tout essai dans le navigateur.
- **Copie de `main` sans polices** : servie depuis un autre dossier, elle ne charge pas les polices, d'où des écarts d'un pixel sur les captures. Comparer le balisage et les données, pas les pixels.
- **Base de comparaison décalée** : quand des demandes sont empilées, comparer à la branche précédente de la pile, pas à `main`. Sinon les identifiants tirés au hasard diffèrent.
- **Localisateurs Playwright qui se déplacent** : `.first()` sur « la première case non cochée » change de cible après chaque clic. Viser un attribut précis (`[data-code="…"]`).
- **Bulle « Exemple chargé »** : elle recouvre une partie de la grille pendant quelques secondes et intercepte la souris.
- **Différences de sérialisation sans effet** : `class=""` posé par `creer`, `selected` posé par propriété, `0px` au lieu de `0`. Normaliser avant de comparer, ou éviter (`document.createElement` quand l'attribut doit rester absent).
- **CHANGELOG** : il entre en conflit à presque chaque fusion ; garder les deux entrées.
- **Demandes empilées puis fusionnées par écrasement** : en intégrant `main` dans la branche suivante, les conflits se règlent par la version de la branche, qui contient déjà le contenu fusionné.

## Règles de travail à garder

- Une branche par changement (`refactor/…`, `fix/…`, `docs/…`), fusion par écrasement une fois l'intégration continue verte. Ne pas fusionner sans accord : publication, changement notable du site, migration de données.
- Identité git du dépôt : `Stéphane Héberlé <contact@dnmax.fr>`, à régler en début de session.
- Aucune mention d'outil d'assistance dans le code, les commits, les branches ou les demandes de fusion ; retirer tout pied de page ajouté automatiquement aux demandes de fusion.
- **Plan d'avancement à recréer** : l'ancien plan ne peut pas être partagé, il faut en publier un nouveau dès la reprise et le tenir à jour à chaque fusion. L'auteur y suit le travail ; il contient, dans cet ordre :
  - l'heure de la dernière mise à jour (heure de Paris) ;
  - « À vous » : ce qui attend l'auteur (questions ci-dessus, recette et publication en fin d'optimisation) ;
  - « En cours » : seulement ce sur quoi on travaille réellement. Il est vide (« Rien ») quand on attend la réponse de l'auteur ou une vérification automatique ;
  - « Ensuite, dans l'ordre » : les demandes de fusion en attente de vérification, puis la liste de « Ce qui reste » ;
  - « Déjà fait » : les demandes fusionnées (#139 à #149), avec une ligne chacune ;
  - le nombre de lignes restant dans le fichier historique (3 714 au 17 novembre, 7 756 au départ).
