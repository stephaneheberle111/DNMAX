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
