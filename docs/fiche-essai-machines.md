# Fiche d'essai sur machines réelles

Ces essais ne peuvent pas être faits par les tests automatiques : ils demandent l'application **installée**, de vrais ordinateurs et un vrai réseau. Ils lèvent les limites notées aux décisions 21 (échange en direct) et 22 (restauration) de `DECISIONS.md`.

À refaire sur **Windows, macOS et Linux**, avec la dernière version publiée. Compter une demi-heure par système.

## Avant de commencer

- Deux ordinateurs sur le **même réseau** (même wifi), DNMAX installé sur les deux, à la même version (pied de page > « À propos »).
- Sur chacun, charger l'exemple (Paramètres > « Charger un exemple ») : **aucune donnée réelle d'étudiant** dans ces essais.
- Noter pour chaque essai : système et version des deux ordinateurs, type de réseau (domicile, établissement, partage de connexion d'un téléphone), résultat, message affiché s'il y en a un.

Dossier des données, utile pour les essais B et C :

| Système | Dossier |
|---|---|
| Windows | `%APPDATA%\fr.dnmax.app\` |
| macOS | `~/Library/Application Support/fr.dnmax.app/` |
| Linux | `~/.local/share/fr.dnmax.app/` |

## A. Échange en direct

### A1. Envoi réussi

1. Ordinateur 1 : « Échanger… » > « Échange en direct » > « Envoyer en direct ». Choisir une ou deux évaluations.
2. Au premier envoi, le système peut demander une autorisation (pare-feu Windows : réseaux privés ; macOS : accès au réseau local). **Accepter**, et noter que la question a été posée.
3. Un code de 8 chiffres s'affiche, avec « Dictez ce code à votre collègue ».
4. Ordinateur 2 : « Échanger… » > « Échange en direct » > « Recevoir en direct », saisir le code, « Recevoir ».

Attendu :

- [ ] l'ordinateur 2 affiche « Recherche de l'ordinateur de votre collègue sur le réseau… », puis « Connecté : réception en cours… », puis le plan d'import habituel ;
- [ ] l'ordinateur 1 affiche « Envoyé. Votre collègue voit maintenant ce que l'envoi changerait chez lui… » ;
- [ ] après « Appliquer » sur l'ordinateur 2, les évaluations reçues sont dans « Mes évaluations ».

### A2. Dans l'autre sens

Refaire A1 en inversant les rôles. Si les deux ordinateurs n'ont pas le même système, c'est l'essai le plus utile : noter chaque couple (Windows vers macOS, macOS vers Linux, etc.).

- [ ] l'échange aboutit dans les deux sens.

### A3. Avec les étudiants et leurs résultats

Refaire A1 en cochant « Inclure les étudiants et leurs résultats » et en choisissant un mot de passe d'envoi.

- [ ] l'ordinateur 2 demande ce mot de passe avant d'afficher le plan ;
- [ ] un mauvais mot de passe est refusé ; le bon ouvre le plan, avec les résultats.

### A4. Code erroné

Ordinateur 1 : lancer un envoi. Ordinateur 2 : saisir le code en changeant **un des six derniers chiffres** (les deux premiers servent à trouver l'envoi).

- [ ] l'ordinateur 1 affiche « Quelqu'un s'est connecté avec un code erroné. Par sécurité, ce code est annulé… » ;
- [ ] l'ordinateur 2 affiche un échec, sans rien importer ;
- [ ] resaisir ensuite le **bon** code ne fonctionne plus : il faut relancer l'envoi.

### A5. Code expiré

Ordinateur 1 : lancer un envoi et attendre plus de 5 minutes sans rien saisir sur l'ordinateur 2.

- [ ] l'ordinateur 1 affiche « Le code a expiré sans que votre collègue ne se connecte… ».

### A6. Annulation

Ordinateur 1 : lancer un envoi, puis « Annuler ». Ordinateur 2 : saisir le code.

- [ ] l'ordinateur 2 ne trouve pas l'envoi, et le message propose l'échange par fichier.

### A7. Réseaux différents

Mettre l'ordinateur 2 sur un autre réseau (partage de connexion d'un téléphone, par exemple) et refaire A1.

- [ ] l'ordinateur 2 ne trouve pas l'envoi ; le message dit que l'échange en direct ne fonctionne pas d'un réseau à un autre et renvoie à l'échange par fichier.

### A8. Réseau de l'établissement

Refaire A1 sur le wifi de l'établissement. Certains réseaux isolent les postes : un échec **avec un message clair** est un résultat acceptable.

- [ ] l'échange aboutit, **ou** le message explique que le réseau isole sans doute les postes et propose l'échange par fichier ;
- [ ] dans les deux cas, l'application ne reste pas bloquée : « Fermer » répond.

### A9. Verrouillage pendant l'attente

Avec le module Étudiants actif, lancer un envoi et ne toucher à rien. Limite connue (décision 27) : une attente sans clavier ni souris compte comme de l'inactivité.

- [ ] noter si le verrouillage des 15 minutes peut survenir avant l'expiration du code (5 minutes) : il ne devrait pas.

## B. Restaurer une sauvegarde

À faire sur un seul ordinateur, par système.

### B1. Restauration réussie

1. Utiliser DNMAX deux jours différents, ou vérifier que Paramètres > « Sauvegardes » liste au moins une copie.
2. Modifier quelque chose de visible : renommer une évaluation en « APRÈS SAUVEGARDE ».
3. Paramètres > « Sauvegardes » > « Restaurer… » sur une copie antérieure, lire la confirmation, « Restaurer et recharger ».

Attendu :

- [ ] l'application se recharge et **redemande le mot de passe** ;
- [ ] après ouverture, l'évaluation a retrouvé son ancien nom ;
- [ ] la liste des sauvegardes contient une nouvelle ligne « État mis de côté avant la restauration du… », datée de l'instant.

### B2. Annuler une restauration

Restaurer la copie « État mis de côté avant la restauration du… » créée en B1.

- [ ] l'évaluation s'appelle de nouveau « APRÈS SAUVEGARDE ».

### B3. Sauvegarde d'avant un changement de mot de passe

1. Noter le mot de passe actuel (appelons-le A). « Mon compte » > « Mot de passe… » : en choisir un autre (B).
2. Restaurer une sauvegarde **antérieure** au changement.

- [ ] l'application demande un mot de passe : **A** ouvre, **B** est refusé ;
- [ ] le code de secours ouvre aussi.

### B4. Fermeture pendant la restauration

Cliquer « Restaurer et recharger », puis fermer la fenêtre aussitôt. Rouvrir DNMAX.

- [ ] l'application s'ouvre, avec les données d'avant **ou** celles de la sauvegarde, jamais un coffre illisible.

### B5. Recours à la main

Fermer DNMAX. Dans le dossier des données, renommer `coffre.dnmax` en `coffre-ancien.dnmax`, puis copier un fichier de `sauvegardes/` à sa place sous le nom `coffre.dnmax`. Rouvrir.

- [ ] l'application s'ouvre avec le contenu de la sauvegarde.

## C. Enregistrement de la saisie

Ce qui est saisi doit se retrouver après une fermeture ou un verrouillage : reste à le constater jusqu'au coffre chiffré. L'essai C3 suppose l'enregistrement automatique (décision 29).

### C1. Fermer en pleine saisie

1. « Mes évaluations » > « Actions… » > « Évaluer les étudiants ». Saisir un niveau pour un étudiant.
2. Fermer la fenêtre **tout de suite**, sans rien cliquer d'autre. Rouvrir DNMAX.

- [ ] le niveau saisi est là.

### C2. Verrouillage en pleine saisie

Module Étudiants actif : saisir un niveau, puis laisser l'ordinateur 15 minutes. Saisir le mot de passe au retour.

- [ ] le niveau saisi est là.

### C3. Changer d'évaluation

Saisir un niveau dans une évaluation, revenir à la liste, ouvrir une autre évaluation, revenir à la première.

- [ ] le niveau saisi est là ;
- [ ] chaque évaluation affiche bien ses propres étudiants et ses propres compétences.

## Après les essais

Reporter le résultat dans `DECISIONS.md` : retirer la limite « reste à essayer » des décisions 21 et 22 pour chaque système essayé, ou la remplacer par ce qui a été constaté. Un échec devient un ticket, avec le système, le réseau et le message affiché.
