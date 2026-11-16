# Fiche de recette 0.9

Essais à la main de l'application de bureau, en local, avant de publier la 0.9. Ils complètent les tests automatiques (linter, typage, tests unitaires, `verifier:vide`, `verifier:saisie`), qui ne voient ni l'enveloppe de bureau réelle, ni le système, ni l'impression.

Compter environ une heure et demie. Cocher chaque ligne ; noter le système, la version (pied de page) et tout message inattendu.

## Avant de commencer

1. **Mettre de côté vos données.** `npm run dev` lance DNMAX avec le même dossier de données que l'application installée. Fermer DNMAX, puis renommer ce dossier (par exemple en `fr.dnmax.app.avant-recette`) :

   | Système | Dossier des données | Réglages du poste (dossier d'export, sauvegardes) |
   |---|---|---|
   | Windows | `%APPDATA%\fr.dnmax.app\` | `%APPDATA%\fr.dnmax.app\` |
   | macOS | `~/Library/Application Support/fr.dnmax.app/` | `~/Library/Application Support/fr.dnmax.app/` |
   | Linux | `~/.local/share/fr.dnmax.app/` | `~/.config/fr.dnmax.app/` |

   À la fin, supprimer le dossier créé par la recette et redonner son nom à l'ancien (voir aussi I2). Sous Linux, mettre aussi de côté le dossier des réglages.
2. Récupérer `main` à jour (ou la branche `chore/version-0.9.0`), puis `npm ci`.
3. Lancer `npm run dev`. La première construction de l'enveloppe prend quelques minutes.
4. **Aucune donnée réelle d'étudiant** : n'utiliser que des noms inventés et l'exemple.

## A. Premier lancement et visite

- [ ] **A1. Bienvenue.** Fenêtre titrée « DNMAX », sans numéro. Conseils, puis prénom, nom, établissement, puis mot de passe (8 caractères suffisent) et code de secours, puis mention « Objet ». Attendu : le référentiel s'installe, trois promotions sont créées, la visite démarre.
- [ ] **A2. Visite.** La suivre jusqu'au bout. À l'étape « 5. L'évaluation », la bulle cite l'intitulé, la consigne, les promotions, les livrables et au moins un EC ; le curseur passe aussi sur la consigne et les EC. L'étape « 6. Apparence et vocabulaire » ne parle plus d'échelles.
- [ ] **A3. Icône.** Barre des tâches et fenêtre : le signe X au trait intermédiaire.

## B. Composer une évaluation

- [ ] **B1. Échelle unique.** « Nouvelle évaluation » : aucun choix d'échelle à l'étape 1. Étape 4 (avec le module Étudiants) : niveaux Insuffisant, Fragile, Satisfaisant, Très bonne maîtrise.
- [ ] **B2. Exigences d'enregistrement.** Donner seulement un intitulé et une compétence, puis « Enregistrer l'évaluation » à l'étape Formulation. Attendu : refus, « il lui manque une promotion, une consigne et au moins un EC » ; l'évaluation reste « Brouillon » dans la liste.
- [ ] **B3. UE au lieu d'EC.** Cocher une UE sans EC, compléter promotion et consigne : l'enregistrement est accepté, et les compétences retenues sont rattachées aux EC de cette UE.
- [ ] **B4. Pas de coefficients.** Export Excel d'une évaluation : aucune colonne « Coef. ».
- [ ] **B5. Regroupements.** Réunir deux compétences par glisser-déposer, puis en détacher une : le regroupement se défait et la compétence restante garde ses livrables.
- [ ] **B6. Semestre suggéré.** Cocher une promotion de 2e année : le semestre proposé suit la date (S3 de septembre à janvier, S4 ensuite).

## C. Paramètres et Mon établissement

- [ ] **C1. Règles d'évaluation.** Paramètres : panneau « Règles d'évaluation » avec échelle, enregistrement, seuils de la jauge (0–15 / 15–50 / 50–85 / 85–100 %, sans justification), Rendu, « efface une saisie commencée », acquisition à partir de « Satisfaisant », niveaux DN MADE, suivi.
- [ ] **C2. Comparaison masquable.** Charger l'exemple. Cocher « ne pas situer l'étudiant par rapport à sa promotion », puis ouvrir Progression étudiant : plus de « au-dessus / en dessous / dans la moyenne ». Décocher : la comparaison revient.
- [ ] **C3. Suivi simplifié.** Cocher « Suivi simplifié » : dans Mes évaluations, « À faire » ou « Faite » à la place de la frise. « Marquer faite » sur une évaluation « À faire » la fait passer à « Faite ». Décocher : la frise détaillée revient, avec l'étape « Distribuée » cochée à la date du jour.
- [ ] **C4. Calendrier.** Mon établissement > Établissement : mettre la rentrée en août et le second semestre en janvier. Nouvelle évaluation, promotion de 2e année, « Distribution prévue » le 15 janvier : le semestre proposé est S4 (S3 avec le calendrier par défaut).
- [ ] **C5. Conservation.** Même écran : choisir 18 mois. Paramètres > Données des étudiants > « Anonymiser ou effacer des promotions » : le texte dit « 18 mois ». Activer le module Étudiants et ouvrir l'information aux étudiants : elle dit aussi 18 mois.
- [ ] **C6. Dossier d'export.** Mon compte > Préférences > Documents exportés : choisir un dossier, exporter un Word : la boîte « Enregistrer sous » s'ouvre dans ce dossier. « Revenir à Documents » : retour à Documents.

## D. Module Étudiants et mot de passe

- [ ] **D1. Activation avec un mot de passe faible.** Paramètres > Modules > Étudiants, avec le mot de passe de 8 caractères de A1. Attendu : après l'avertissement RGPD, DNMAX demande un mot de passe plus solide et dit ce qui manque.
- [ ] **D2. Refus des mots de passe faibles.** Essayer tour à tour : `motdepasse123` (courant), `Dnmax2026!abc` (mot évident), `Aaaa1234!xyz` (suite), `toutenminuscules` (types). Chacun est refusé avec la bonne explication.
- [ ] **D3. Mot de passe accepté.** `Le chat dort 3 fois` est accepté ; le module s'active.
- [ ] **D4. Verrouillage.** Laisser DNMAX sans toucher 15 minutes : il se verrouille et redemande le mot de passe. Désactiver le module : plus de verrouillage.
- [ ] **D5. Réouverture.** Fermer et rouvrir DNMAX avec le mot de passe de D3 : il s'ouvre sans rien redemander d'autre.

## E. Échanger

- [ ] **E1. Envoi sans étudiants, non protégé.** « Échanger… » > Envoyer : la case « Protéger par un mot de passe, même sans étudiants » est décochée par défaut. Envoyer une évaluation dans un fichier.
- [ ] **E2. Envoi sans étudiants, protégé.** Cocher la case, saisir un mot de passe deux fois, envoyer. Ouvrir ce fichier (« Recevoir ») : DNMAX demande le mot de passe (« Ce fichier est protégé par un mot de passe… ») ; avec le bon, le contenu s'affiche.
- [ ] **E3. Envoi avec étudiants.** Cocher « Inclure les étudiants » : la case de protection se coche d'elle-même et ne se décoche plus.

## F. Sauvegardes

- [ ] **F1. Politique.** Paramètres > Sauvegardes : deux listes, « Une par semaine, gardée 3 mois » et « puis une par mois, gardée 1 an ». Choisir 2 mois et 6 mois : « Retenu : s'applique à la prochaine ouverture ».
- [ ] **F2. Fichier de réglage.** Dans le dossier des réglages du poste, `politique-sauvegardes.json` contient les durées choisies.
- [ ] **F3. Restauration.** Revenir à une sauvegarde de la liste : DNMAX se recharge avec l'ancien état ; une copie « avant restauration » apparaît dans la liste.

## G. Bas de page, licence, mises à jour

- [ ] **G1. Bas de page.** Centré : « DNMAX 0.9.0 », Licence, À propos, Confidentialité, Documentation, Proposer une idée.
- [ ] **G2. Licence.** « Licence » : titre « Licence CeCILL v2.1 », texte français complet. « À propos » cite la CeCILL v2.1.
- [ ] **G3. Hors ligne.** Couper le réseau : Documentation et Confidentialité s'affichent toujours ; Confidentialité parle de dnmax.fr (OVH) et de la recherche automatique.
- [ ] **G4. Recherche à la demande.** Réseau rétabli, clic sur la version. Tant que la 0.9 n'est pas publiée, dnmax.fr n'a pas encore de `latest.json` : « vérification impossible » est le résultat attendu à ce stade.
- [ ] **G5. Recherche automatique.** Paramètres > Mises à jour : cocher « Rechercher d'elle-même une fois par jour ». Fermer et rouvrir : une recherche part à l'ouverture (indicateur du bas de page). Rouvrir le même jour : pas de nouvelle recherche.

## H. Documents

- [ ] **H1. Word et OpenDocument.** Avec l'exemple, exporter une grille vierge et une restitution : jauge aux noms des niveaux de maîtrise, sans mot coupé ; sceau absent par défaut, présent si coché dans Préférences.
- [ ] **H2. Impression.** Imprimer (ou enregistrer en PDF) une restitution et l'information aux étudiants : rien de coupé, une page pour la fiche.

## I. Exemple et données existantes

- [ ] **I1. Retirer l'exemple.** « Retirer l'exemple » enlève ce que l'exemple a ajouté ; les évaluations faites à la main restent.
- [ ] **I2. Données de la 0.8.** Fermer DNMAX, supprimer le dossier de recette, puis **copier** (sans le déplacer) le dossier mis de côté au début sous le nom `fr.dnmax.app`. Lancer `npm run dev` avec votre mot de passe habituel : tout s'ouvre, évaluations à l'échelle des niveaux de maîtrise, aucune erreur. Ne rien modifier, puis fermer, supprimer cette copie et redonner son nom à l'original.

## À noter

| Essai | Système | Résultat | Remarque |
|---|---|---|---|
| | | | |
