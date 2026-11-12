# Consignes de développement — projet personnel

Ce fichier vit à la racine du projet sous le nom `CLAUDE.md`.
Langue des échanges, des commits et de la documentation : **français**.
Principe général : **proportionnalité**. Un petit outil n'a pas besoin de la rigueur d'un système critique. Dans le doute, choisir la solution la plus simple qui reste testable.

Marques : 🔒 à respecter toujours · ⚠️ à respecter sauf raison écrite · 👁️ convention.

## 0. À remplir au démarrage du projet

- Objet du projet, en deux phrases : DNMAX aide les enseignants de DN MADE à construire, suivre et restituer leurs évaluations par compétences à partir du référentiel du diplôme. C'est une application de bureau autonome (Windows, Linux, macOS), sans serveur central : les contenus s'échangent par fichiers et les mises à jour sont poussées par l'auteur.
- Licence : `AGPL-3.0-or-later`
- Langage et version : TypeScript 6 sur Node.js 22 (interface, Vite) et Rust 1.97 (enveloppe de bureau Tauri 2). Versions exactes dans `package-lock.json`, `rust-toolchain.toml` et `src-tauri/Cargo.lock`.
- Commandes : lancer `npm run dev` · tests `npm test` · linter `npm run lint` · typage `npm run typecheck` · côté Rust, dans `src-tauri/` : `cargo test --locked`, `cargo fmt --check` et `cargo clippy --all-targets --locked -- -D warnings`
- Branche principale : `main`

Ne pas changer de pile sans demander.

## 1. Honnêteté (priorité)

- 🔒 Dire ce qui a été **réellement vérifié** : test lancé, sortie lue. Ne jamais annoncer un succès sans l'avoir constaté.
- 🔒 Si un test échoue, le dire avec la sortie. Si une étape est sautée, le dire.
- 🔒 **Demander avant** toute action difficile à annuler : suppression, écrasement, migration de données, envoi vers un service externe, publication.
- 🔒 Ne jamais contourner un contrôle (règle de linter coupée, test supprimé ou désactivé) sans le dire. Un test rouge ne se relance pas « jusqu'à ce qu'il passe ».

## 2. Parcours d'un changement

- 🔒 Une **branche par changement**, nommée `type/sujet` (`feat/`, `fix/`, `docs/`, `refactor/`, `chore/`). Pas de commit direct sur `main`.
- ⚠️ **Un changement = une intention**. Correctif, réaménagement et nouvelle fonction ne se mélangent pas.
- ⚠️ **Regrouper les petites retouches d'une même demande** (libellés, mise en page, petits correctifs d'interface) dans une seule branche ; un sujet conséquent (nouvelle fonction, données, sécurité, ateliers) garde sa propre branche.
- ⚠️ **Fusion par Claude quand l'intégration continue est verte**, sans attendre mon accord, **sauf** : publication d'une version (lancement de l'atelier « Publication » compris), changement notable du site en ligne, migration ou effacement de données des utilisateurs. Ceux-là, me les signaler avant de fusionner.
- 🔒 Avant de fusionner : linter à zéro erreur, typage sans erreur, tests verts.
- ⚠️ Commit : première ligne à l'impératif (~70 caractères), puis le **pourquoi**, pas le quoi.
- ⚠️ Petits changements, relus avant fusion (par moi, ou par une relecture automatique).
- 👁️ Tenir un `CHANGELOG.md` court (Ajouté / Modifié / Corrigé / Sécurité).
- 🔒 Aucun fichier généré ni secret dans les commits.
- 🔒 **Discrétion sur l'outillage** : aucune mention d'un assistant ou d'un outil d'IA dans le code, ses commentaires, la documentation, les messages de commit (pas de ligne de co-auteur ni de lien de session), les noms de branches, les tickets et les demandes de fusion. Seule exception tolérée : le nom et le contenu du présent fichier.

## 3. Qualité du code

- 🔒 **Linter** configuré et à zéro erreur. Toute exception est locale et justifiée par un commentaire.
- ⚠️ **Typage statique** là où le langage le permet. Annoter les signatures publiques. Valider les données externes à l'entrée avec un schéma plutôt que de leur faire confiance.
- ⚠️ **Noms explicites** : pas d'abréviation obscure (`tmp`, `cnt`, `res`). Exceptions : `id`, `_`, indices de boucle courte.
- ⚠️ **Commentaires** : expliquer le *pourquoi*, jamais le *quoi*. Documenter une fonction quand son comportement n'est pas évident (cas limites, effets de bord, erreurs levées). Pas de documentation systématique pour les fonctions triviales.
- 🔒 **Argent et quantités exactes** : type décimal ou entiers en centimes, jamais de flottant. Unité (devise, HT/TTC) et arrondi explicites.
- ⚠️ **Cas limites** : zéro (division), vide, absent, doublon, très grand, caractères spéciaux, fuseaux horaires et changement d'heure.
- ⚠️ **Configuration plutôt que valeurs en dur** (seuils, taux, URL, chemins).
- ⚠️ **Déterminisme** : l'heure, le hasard et l'environnement sont passés en paramètre pour pouvoir tester.
- ⚠️ Pas de requêtes en boucle (N+1) : une requête agrégée. Les imports et synchronisations sont **idempotents** ; l'échec d'un élément est consigné sans bloquer les autres ni écraser l'existant.
- 👁️ Pas de logique métier dans l'affichage (gabarits, écrans) ni de formatage dans les règles de calcul.
- ⚠️ **Choix des outils** : à fonction égale, préférer un logiciel référencé au SILL (socle interministériel de logiciels libres, <https://code.gouv.fr/sill>), tant que cela ne dénature pas la fonction demandée. Consigner dans `DECISIONS.md` chaque outil retenu, s'il figure au SILL (vérifié ou non) et, sinon, la raison du choix.

### Séparation des responsabilités (version légère)

- ⚠️ Séparer ce qui **calcule** (règles, sans accès extérieur), ce qui **parle à l'extérieur** (base, fichiers, réseau, horloge) et ce qui **affiche**.
- ⚠️ Les règles ne connaissent ni la base ni l'interface : on leur passe les données, elles rendent un résultat.
- 👁️ Si tester une règle exige une fausse base de données, la séparation est ratée.
- Dans un petit script, des fonctions distinctes suffisent. Ne pas créer d'architecture en couches par principe.

## 4. Base de données

- 🔒 Toute évolution de schéma passe par une **migration versionnée**. Une migration appliquée ne se modifie plus.
- 🔒 **Sauvegarde avant** toute opération risquée, et restauration déjà essayée une fois.
- ⚠️ Tester sur le **même moteur** que celui utilisé en vrai.

## 5. Tests

- 🔒 Tests livrés **avec** le changement. Nouvelle règle : un cas qui déclenche, un qui ne déclenche pas, un cas limite.
- 🔒 **Correctif de bug : écrire d'abord un test qui échoue**, puis corriger.
- 🔒 **Jamais d'écriture dans les vraies données** : répertoire temporaire ou base jetable.
- ⚠️ **Aucun appel réseau réel** dans les tests : services simulés.
- ⚠️ Tests **déterministes et indépendants** (pas d'heure courante, pas d'ordre d'exécution imposé). Un test instable se corrige tout de suite.
- ⚠️ Tester les **chemins d'échec** : service indisponible, réponse partielle, fichier illisible, base vide.
- 👁️ Nom de test = comportement attendu. Un comportement par test.
- 👁️ Beaucoup de tests unitaires, quelques tests d'intégration, très peu de tests bout en bout.

## 6. Sécurité

- 🔒 **Aucun secret dans le dépôt, jamais** (code, historique, journaux, conversations). Ne jamais afficher ni copier un jeton, une clé ou un mot de passe dans une conversation ni dans un fichier versionné. Pour vérifier qu'un secret existe, regarder sa présence ou sa taille, jamais son contenu.
- 🔒 Secrets via variables d'environnement ou fichier à droits restreints et ignoré par git. Fournir un `.env.example` **sans aucune valeur**.
- 🔒 **Secret exposé = secret compromis** : on le révoque et on en génère un nouveau.
- 🔒 **Toute valeur externe** (formulaire, URL, fichier, réponse d'API) est validée avant d'atteindre la base, le disque ou une commande. Requêtes **paramétrées**, jamais de concaténation pour construire une requête ou une commande ; listes blanches plutôt que listes noires.
- ⚠️ Moindre privilège pour les accès et les jetons.
- ⚠️ Dépendances : versions fixées (fichier de verrouillage versionné), audit de vulnérabilités de temps en temps, détecteur de secrets avant de publier le dépôt.
- 🔒 Aucune donnée réelle sensible (personnelle, financière) dans les jeux de test, les tickets ou les journaux.

## 7. Intégration continue (si le dépôt est hébergé)

- ⚠️ À chaque poussée : tests, linter, typage. Sans aucun secret requis.
- 👁️ Versions d'outils et d'images épinglées. Jobs rapides.
- 👁️ La configuration d'intégration continue est du code : elle se modifie par branche, comme le reste.

## 8. Documentation du projet

- ⚠️ `README.md` : à quoi sert le projet, comment l'installer, le lancer et le tester.
- 👁️ Noter les **décisions importantes et leur raison** (court fichier `DECISIONS.md`).
- 👁️ Section « pièges déjà rencontrés » : symptôme → parade.
- 👁️ Schémas en Mermaid dans le dépôt plutôt qu'en images.
- Documenter le code tel qu'il est, pas tel qu'il devrait être.

## 9. Manière de travailler avec Claude

- Lire le code existant avant de modifier. Ne pas réécrire ce qui n'a pas été demandé.
- Faire le plus petit changement qui répond à la demande, puis s'arrêter et rendre compte.
- Proposer plusieurs approches seulement quand la décision est réellement mienne ; sinon recommander et avancer.
- Avant de lancer une commande destructive ou coûteuse, la décrire en une phrase et attendre mon accord.
- Terminer chaque tâche par : ce qui a changé, ce qui a été vérifié, ce qui ne l'a pas été.
