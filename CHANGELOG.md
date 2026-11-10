# Journal des modifications

## Non publié

### Ajouté

- Squelette de l'application de bureau (Tauri 2, TypeScript, Vite) : fenêtre qui affiche le nom et la version.
- Linter, typage strict, tests unitaires et intégration continue.
- Licence AGPL-3.0-or-later.
- Interface complète de la maquette (évaluations, progression, référentiel, établissement, paramètres), utilisable hors ligne : polices et bibliothèques sont embarquées.
- Export Word, Excel et OpenDocument par la boîte de dialogue « Enregistrer sous » du système.
- Version affichée dans le titre de la fenêtre.
- Enregistrement automatique des données sur l'ordinateur, y compris à la fermeture de la fenêtre.
- Sauvegarde quotidienne automatique, dix jours conservés.
- Installeurs Windows, macOS et Linux construits par l'intégration continue.

### Sécurité

- Les données sont chiffrées sur le disque et protégées par un mot de passe, avec un code de secours en cas d'oubli.
