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
- Échange d'évaluations entre enseignants par fichier `.dnmax`, sans élèves ni résultats : choix à l'envoi, puis plan des changements (nouvelle, modifiée, identique) à valider à la réception.
- Vérification, à la réception, que l'évaluation a été construite sur le même référentiel.
- Échange d'évaluations avec leurs élèves et résultats, dans un fichier chiffré par mot de passe : promotions et élèves rapprochés par leur nom, résultats fusionnés élève par élève sans écraser ceux du destinataire.
- Mise à jour automatique : une version plus récente est proposée au lancement et installée sur accord de l'enseignant.
- Changement d'ordinateur : copie complète et chiffrée des données, à installer au premier lancement sur le nouveau poste.
- Échange de référentiels : envoi du référentiel d'un diplôme, détail des écarts à la réception, ajout comme nouvelle version non activée.
- Date et auteur de la dernière modification de chaque évaluation.
- Identification de l'enseignant par son nom, demandé après le mot de passe : il signe les fichiers envoyés et apparaît dans le plan d'import.

### Corrigé

- Une installation neuve reconnaît son diplôme par défaut lors d'un import (les données d'établissement sont enregistrées dès le chargement).
- L'empreinte du référentiel porte sur son contenu lisible (libellés, codes, rattachements) et non plus sur ses identifiants internes : un libellé modifié est désormais détecté, et deux référentiels identiques saisis séparément sont reconnus comme tels.

### Sécurité

- Les mises à jour sont signées ; l'application refuse celles dont la signature ne correspond pas.
- Les données d'élèves ne sont lues que dans un fichier d'échange chiffré : un fichier en clair ne peut pas en faire entrer.
- Les données sont chiffrées sur le disque et protégées par un mot de passe, avec un code de secours en cas d'oubli.
