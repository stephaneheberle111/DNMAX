# Décisions

Une entrée par décision importante : ce qui a été retenu, et pourquoi.

## 1. Application de bureau avec Tauri 2

**Retenu** : enveloppe de bureau Tauri 2 (Rust) autour d'une interface web (TypeScript, Vite).

**Pourquoi** :

- les enseignants installent l'application sur leur ordinateur personnel (Windows, Linux, macOS), sans serveur central ni mise en réseau ;
- l'interface existante est déjà une page web : elle se réutilise ;
- installeurs légers (quelques Mo) car la vue web du système est utilisée ;
- mécanisme de mise à jour signée intégré, à brancher dans un changement ultérieur.

**Écarté** :

- *Docker* : installation et usage quotidien trop lourds pour des enseignants (virtualisation, démarrage du moteur, adresse locale à ouvrir), pas de mise à jour poussée, données enfermées dans un volume.
- *Application web hors ligne seule* : données dépendantes du profil du navigateur, donc fragiles.
- *Electron* : même service rendu pour des installeurs d'une centaine de Mo.

**Conséquence connue** : sans certificat de signature, Windows affiche un avertissement SmartScreen à l'installation et macOS demande une autorisation manuelle. Accepté pour démarrer ; une notice d'installation l'expliquera.

## 2. Outils et référencement au SILL

La consigne est de préférer, à fonction égale, un outil référencé au [SILL](https://code.gouv.fr/sill).

| Outil | Rôle | Au SILL ? | Remarque |
| --- | --- | --- | --- |
| Vite | Construction de l'interface | Oui (fiche « ViteJS » vue) | |
| TypeScript | Langage de l'interface | Non vérifié | Typage statique exigé par les consignes |
| Node.js et npm | Exécution des outils | Non vérifié | |
| Tauri | Enveloppe de bureau | Non vérifié | Voir décision 1 |
| Rust | Langage de l'enveloppe | Non vérifié | Imposé par Tauri |
| ESLint | Linter | Non vérifié | |
| Vitest | Tests | Non vérifié | Partage la configuration de Vite |

« Non vérifié » : le catalogue n'a pas pu être consulté au moment du choix. À compléter.

## 3. L'identifiant d'application est provisoire

`fr.dnmax.app` (dans `src-tauri/tauri.conf.json`) détermine le dossier où le système range les données de l'application. Il doit être fixé définitivement **avant** la première diffusion : le changer ensuite ferait perdre aux enseignants l'accès à leurs données.

## 4. Icône provisoire

L'icône est un simple pavé « DN » généré depuis `src-tauri/icone-source.svg` avec `npx tauri icon`. À remplacer par l'identité visuelle définitive.

## 5. L'interface de la maquette est reprise telle quelle

**Retenu** : le script, les styles et le balisage de la maquette d'origine sont copiés sans réécriture dans `public/heritage/` et `index.html`. Deux adaptations seulement : le stockage et l'enregistrement de fichiers passent par l'objet `window.dnmaxPont`, fourni par `src/heritage/pont.ts`.

**Pourquoi** : environ 7 800 lignes éprouvées à l'usage. Les réécrire d'un bloc en TypeScript aurait retardé l'application sans rien apporter à l'enseignant, avec un fort risque de régression.

**Conséquence assumée** : `public/heritage/` est exclu du linter et du typage (exception écrite dans `eslint.config.js`) et n'a pas de tests unitaires. Tout code **nouveau** s'écrit en TypeScript typé et testé dans `src/`. Les morceaux de l'interface historique seront repris dans `src/` au fil des évolutions qui les touchent.

## 6. Bibliothèque tableur : `xlsx` 0.18.5

**Retenu** : la version 0.18.5 de `xlsx`, celle de la maquette, installée depuis le registre npm.

**Pourquoi** : c'est la dernière version publiée sur le registre ; les suivantes ne sont distribuées que sur le site de l'éditeur.

**Risque connu** : `npm audit` signale deux vulnérabilités élevées sur cette version (pollution de prototype et expression régulière coûteuse). Elles concernent la **lecture** de classeurs ; DNMAX ne fait qu'en **écrire**. À réévaluer impérativement le jour où l'application lira un classeur fourni par un tiers.

## 7. Les exports passent par la boîte de dialogue du système

L'interface ne choisit jamais un chemin sur le disque : elle transmet un nom proposé et des octets, l'enveloppe nettoie le nom, ouvre « Enregistrer sous » et écrit là où l'enseignant l'a décidé. Aucun droit d'accès général aux fichiers n'est accordé à la page.
