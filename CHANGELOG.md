# Journal des modifications

## Non publié

### Ajouté

- Site : publication automatique chez OVH par SFTP à chaque fusion qui touche le site.

### Corrigé

- Site : sur téléphone, le menu ne sort plus de l'écran et aucune page ne s'élargit au-delà de l'écran.

## 0.2.0 — 2026-11-12

### Ajouté

- Site : page « Confidentialité et mentions légales » (éditeur bénévole), reliée depuis le pied de page.
- Site : la page Télécharger propose le référentiel DN MADE mention Objet et explique comment l'importer.
- Export : un document qui contient des noms ou des résultats d'élèves rappelle, une fois enregistré, qu'il n'est pas protégé par mot de passe.
- « Mon compte » > « Données d'un élève » : exporter tout ce qui concerne un élève, ou l'effacer partout (promotions, évaluations, brouillon), à sa demande ou à celle de sa famille.
- Durée de conservation : un an après la sortie d'une promotion, DNMAX le rappelle et propose d'anonymiser ou d'effacer ses données d'élèves (« Mon compte » > « Données anciennes »), en gardant les redoublants ; les résultats restés sans élève sont traités de même.

### Modifié

- Site : hébergé chez OVH à l'adresse dnmax.fr.
- Mises à jour : DNMAX ne se connecte plus à Internet au lancement ; la recherche se fait à la demande, depuis « Mon compte ».
- Application : les liens vers le site (documentation, idées et bugs, référentiel proposé) mènent à dnmax.fr.

### Sécurité

- Site : les polices sont servies par le site lui-même ; une visite ne transmet plus l'adresse IP du visiteur à Google.

## 0.1.2 — 2026-11-11

### Ajouté

- Site : la page Télécharger renvoie aussi vers toutes les versions publiées sur GitHub.

### Modifié

- Site : plus de numéro de version écrit en dur, qui restait en retard d'une version ; la page Télécharger renvoie au journal des modifications.

### Corrigé

- L'annonce de mise à jour affiche en entier le lien vers le journal des modifications.
- « Mon compte » : le contour bleu du champ sélectionné n'est plus rogné sur les côtés.

## 0.1.1 — 2026-11-11

### Ajouté

- Site : les boutons de téléchargement livrent directement l'installeur du système choisi.
- À l'export, le dossier Documents est proposé par défaut, et l'application propose ensuite d'ouvrir le document enregistré.
- « Mon compte » : changer son mot de passe, corriger son nom, voir la version et la licence, proposer une idée ou signaler un bug.
- « Retirer l'exemple » : enlève les évaluations et promotions d'exemple sans toucher à ce que l'enseignant a créé.
- Sur une installation vide, un encart guide vers le téléchargement puis la réception d'un référentiel.
- Un référentiel reçu crée son diplôme quand il n'existe pas encore sur le poste.
- Site web du projet versionné dans `site/`, avec le référentiel DN MADE mention Objet en téléchargement.

### Corrigé

- Intégration continue : l'installation des bibliothèques système ne dépend plus d'un miroir de paquets défaillant.

### Modifié

- L'application est livrée vide : plus de référentiel ni de brouillon d'évaluation préinstallés. Les installations existantes gardent leurs données.

## 0.1.0 — 2026-11-11

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
