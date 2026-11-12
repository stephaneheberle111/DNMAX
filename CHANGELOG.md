# Journal des modifications

## Non publié

### Modifié

- Échange en direct (bêta) : il fonctionne désormais uniquement entre deux ordinateurs du même réseau (même wifi ou même réseau local), sans contacter aucun serveur ; les serveurs publics de découverte d'adresse (STUN) sont abandonnés, car ils ne permettaient pas la connexion en pratique. En cas d'échec, le message rappelle de vérifier le réseau, signale les réseaux d'établissement qui isolent les postes et renvoie à l'échange par fichier. La marque « Bêta » est plus lisible, en thème clair comme sombre. Documentation et page Confidentialité du site mises à jour.

## 0.4.1 — 2026-11-12

### Ajouté

- « Échanger… » → « Échange en direct (bêta) » : envoyer évaluations, référentiels et, chiffrés, élèves et résultats d'ordinateur à ordinateur, sans fichier ni serveur intermédiaire, en se transmettant un code d'invitation et un code de réponse. Des serveurs publics français servent seulement à ce que les postes se trouvent. Peut échouer selon les réseaux ; l'échange par fichier reste disponible.
- Les installeurs Windows, macOS et Debian/Ubuntu de chaque version publiée sont déposés sur dnmax.fr, et les boutons du site les y prennent ; l'AppImage reste sur GitHub. Page Confidentialité mise à jour en conséquence.
- Paramètres > Sauvegardes : liste des sauvegardes quotidiennes et restauration de l'une d'elles. L'état actuel est d'abord mis de côté (restaurable lui aussi), puis l'application se recharge et demande le mot de passe en vigueur à la date de la sauvegarde. La documentation du site décrit la marche à suivre et garde la méthode manuelle en dernier recours.
- Documentation du site : « RGPD : fiche pour l'établissement » (description du traitement pour le chef d'établissement et le délégué à la protection des données) et « RGPD : information des élèves » (modèle de note à adapter), imprimables.
- Référentiel DN MADE mention Espace (tableau des compétences 2023), téléchargeable sur dnmax.fr comme celui de la mention Objet ; l'encart des installations vides propose les deux.
- Visite guidée de prise en main, lancée à la première ouverture : écran grisé sauf la zone utile, qui glisse d'une étape à l'autre jusqu'au prochain endroit où cliquer, curseur animé, feuille de route des grandes étapes, éclats de couleur à chaque étape réussie, consignes pas à pas pour installer le référentiel, déclarer promotions, collègues et répartition de service, puis créer et exporter une première évaluation. Elle repère ce qui est déjà fait, se passe à tout moment et se relance depuis « Mon compte ». Les modules Élèves et Niveaux DN MADE ont leur propre visite.

### Modifié

- Exports Word et OpenDocument au format portrait, sans le grand cartouche : une ligne de contexte (promotion, livrables, semestre) et l'enseignant·e ; les dates de distribution et de rendu n'y figurent plus, et l'export ne les redemande plus.
- Exports : le code de chaque compétence précède son libellé dans la même colonne (« C4.1 — … »), pour le report dans un autre logiciel.
- Le champ d'évaluation s'appelle par défaut « Compétence opérationnelle ».
- « Mes évaluations » : l'en-tête du tableau reste visible sous la barre du haut quand la liste défile.
- « Rechercher une mise à jour » passe de « Mon compte » au pied de page de l'application, désormais toujours visible en bas de la fenêtre.
- Identité de l'enseignant (premier lancement, « Mon compte ») : prénom et nom se saisissent dans deux champs ; une identité déjà enregistrée est séparée d'elle-même (premier mot pour le prénom), à corriger au besoin.
- Élèves et enseignants (« Mon établissement ») : prénom et nom dans deux champs. Pour ajouter plusieurs élèves, une ligne « Prénom Nom » ou deux colonnes Prénom / Nom collées d'un tableur ; les noms déjà saisis sont séparés d'eux-mêmes (premier mot pour le prénom), à corriger au besoin. L'anonymisation remplace aussi le prénom et le nom.
- « Mes évaluations » : le petit menu « ⋯ » de chaque ligne devient un bouton « Actions… » qui ouvre une fenêtre centrée, titrée avec l'intitulé de l'évaluation, où les actions sont rangées en sections (Évaluer, Exporter avec un grand bouton par format, Autres actions). Elle se ferme par la croix, un clic à côté ou Échap.

### Corrigé

- Les boîtes (« Mon compte », échanges, données des élèves…) se ferment aussi par une croix et par un clic sur le fond, plus seulement par leur bouton ou la touche Échap.
- L'annonce d'une mise à jour trouvée s'affiche au premier plan, au lieu d'apparaître derrière une boîte ouverte.

## 0.3.0 — 2026-11-12

### Ajouté

- Site : publication automatique chez OVH par SFTP à chaque fusion qui touche le site.
- Site : « Idées et bugs » propose aussi l'envoi par e-mail à contact@dnmax.fr (message prérempli dans votre messagerie, lu par le seul éditeur), en plus du ticket public sur GitHub.
- « Mon compte » : le lien « Proposer une idée ou signaler un bug » transmet au site la version installée et le système, qui préremplissent le signalement.
- Pied de page de l'application : version et licence, « À propos », « Confidentialité », « Site et documentation », « Proposer une idée ou signaler un bug ».

### Modifié

- Site : l'ancienne adresse du site est fermée ; seul dnmax.fr reste en service.
- Données des élèves : la section passe de « Mon compte » à l'onglet Paramètres, et n'apparaît que si le module Élèves est actif ou si des élèves sont enregistrés.
- Une promotion peut être anonymisée ou effacée à tout moment, pas seulement après sa durée de conservation (avec une seconde confirmation).
- Application : sur les grands écrans, la zone de travail s'élargit par paliers (jusqu'à 1 600 px, puis 1 920 px au-delà de 2 200 px de fenêtre) et le texte grossit légèrement (15 px puis 16 px) ; rien ne change sous 1 400 px.
- Sur une installation neuve, seule l'échelle « Niveaux de maîtrise » est active ; « Degrés d'acquisition » se coche dans Paramètres.
- Noms des enseignants et des élèves : les champs demandent le prénom puis le nom ; l'exemple et le site suivent ce format.
- Site, page Confidentialité : les données d'élèves ne concernent que le module Élèves, et l'hébergeur n'héberge que le site, ni l'application ni les données.

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
