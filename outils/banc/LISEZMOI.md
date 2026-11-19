# Banc de comparaison

Outil lancé à la main pour prouver qu'une réécriture ne change rien : il rejoue les mêmes parcours sur `main` et sur une branche, heure et hasard figés, et compare les données enregistrées et l'affichage. Il n'est ni lint ni testé (script Playwright en CommonJS, hors application).

- `banc.cjs` : les 23 parcours (dont « repartition » et « exports », qui relève l'empreinte de chaque document produit).
- `comparer.sh` : rejoue chaque parcours deux fois sur `main` et une fois sur la branche, stockage final compris, et affiche pour chacun `repro` / `NON-REPRO` puis `EGAL` / `DIFFERENT`. `PARCOURS="promotions liste" outils/banc/comparer.sh` n'en joue que quelques-uns.

## Méthode

1. Repérer les **règles cachées dans l'affichage**, les sortir dans `src/domaine/` avec des tests (un cas qui déclenche, un qui ne déclenche pas, un cas limite).
2. Réécrire l'écran : un module qui reçoit un contexte (les données, et des fonctions pour enregistrer et redessiner) et dessine avec `creer` / `creerBouton` (`src/ecran-echange.ts`), sans `innerHTML` construit par concaténation.
3. **Prouver l'équivalence** au banc, et, pour un modèle de données, fonction par fonction (ci-dessous).

### Lancer le banc

- Servir une copie de `main` à côté de la branche :
  - `git worktree add --detach <dossier> origin/main` hors du dépôt ;
  - dans la copie, `npm ci` (**pas de lien symbolique vers `node_modules`** : voir les pièges) ;
  - `npx vite --port 1421 --strictPort` dans la copie, et la branche sur le port 1420.
- Le script fixe l'heure et le hasard avant le chargement (`addInitScript`) :
  - `Date.now` et `new Date()` sans argument rendent une date fixe ;
  - `Math.random` est remplacé par un générateur à graine (`graine = graine * 16807 % 2147483647`) ;
  - `crypto.randomUUID` aussi, dont l'exemple tire l'identifiant de la version livrée.
- Chaque parcours charge l'exemple (`#t-set` puis `#bDemo`), ouvre l'écran visé, fait les gestes, et relève les données (stockage) et le HTML de la zone.
- Vérifier que chaque geste a eu un effet : deux versions qui ne font rien sont « identiques ».
- Avant de conclure, produire deux fois sur `main` et vérifier que les deux productions sont identiques ; sinon la comparaison ne prouve rien.
- Neutraliser avant de comparer : `--h1` / `--h2` pour la planification ; l'élément actif après redessin pour Préférences ; nombres, `transform` et `style` pour la carte.
- Pour les exports : décompresser les fichiers et comparer chaque partie (XML et images).

### Comparaison fonction par fonction

- Extraire l'ancienne fonction d'un commit qui la contient (`git show <commit>:<fichier>`) et la charger avec `new Function`, avec un générateur d'identifiants à compteur.
- Transpiler le module TypeScript en CommonJS (`typescript.transpileModule`).
- Appliquer les deux aux mêmes données et comparer le JSON obtenu après chaque étape.
- Données : quelques milliers de jeux tirés au hasard (doublons écrits différemment, champs absents, liens anciens), plus les données de l'exemple relevées par le banc à plusieurs dates.
- S'assurer que la comparaison voit les erreurs en injectant quelques défauts dans la version transpilée : chacun doit faire apparaître des écarts.

### Captures au pixel

Playwright, heure, hasard et `randomUUID` figés, mouvements réduits (`reducedMotion`), aux résolutions 1024×768, 1280×800, 1440×900 (densité 2, sombre), 1920×1080 et 2560×1440 (sombre).

## Pièges déjà rencontrés

- **Serveur Vite arrêté** après un redémarrage de l'environnement : relancer `npx vite --port 1420 --strictPort` avant tout essai.
- **Copie de `main` sans polices** : servie depuis un autre dossier, elle ne charge pas les polices si `node_modules` y est un lien symbolique (Vite refuse de le servir), d'où des écarts d'un pixel. Faire un vrai `npm ci` dans la copie ; sinon comparer le balisage et les données, pas les pixels.
- **Base de comparaison décalée** : quand des demandes sont empilées, comparer à la branche précédente de la pile, pas à `main`, sinon les identifiants tirés au hasard diffèrent.
- **Localisateurs Playwright qui se déplacent** : `.first()` sur « la première case non cochée » change de cible après chaque clic. Viser un attribut précis (`[data-code="…"]`).
- **Bulle « Exemple chargé »** : elle recouvre une partie de la grille pendant quelques secondes et intercepte la souris.
- **Différences de sérialisation sans effet** : `class=""` posé par `creer`, `selected` posé par propriété, `0px` au lieu de `0`. Normaliser avant de comparer, ou les éviter.
- **Identifiants tirés de l'horloge** : le banc avance l'heure d'une milliseconde à chaque `Date.now`. Une réécriture qui appelle l'horloge un nombre de fois différent change ces identifiants sans rien changer d'autre : neutraliser ces identifiants avant de comparer.
- **Focus après un redessin** : quand le champ qui a le focus est masqué par le redessin, l'élément actif relevé varie d'une exécution à l'autre, sur `main` aussi. Comparer sans le focus à cette étape.
- **Lien `node_modules` commité** (#183, retiré par #185) : un lien symbolique créé dans une copie de travail a été entraîné par une fusion. `.gitignore` ignore désormais `node_modules` sous toutes ses formes ; après une récupération malheureuse, supprimer `node_modules` et relancer `npm ci`.
- **Captures au pixel instables** (carte radiale) : une capture d'élément fait défiler la page, ce qui change l'élément survolé ; une capture pleine page redimensionne la fenêtre, ce qui relance la mise à l'échelle de la carte ; l'anticrénelage de Chromium varie de ±1. Parades : défilement fixé avant les gestes, capture de la partie visible (`clip`, sans `fullPage`), Chromium lancé avec `--disable-partial-raster --disable-gpu-rasterization --disable-gpu --force-color-profile=srgb`.
- **Serveurs et tâches de fond arrêtés** de temps en temps : jouer le banc par lots de moins de dix minutes, au premier plan, et relancer les serveurs Vite avant chaque lot.
- **Travail en parallèle** : deux copies du dépôt, chacune avec son banc sur d'autres ports (copier `comparer.sh` en changeant les ports) ; rejouer au banc les parcours communs sur le résultat combiné.
- **Le banc n'appelle que ce que l'application publie** (`window.dnmaxPont`) : un geste qui appelait une constante retirée a cassé le banc (#208).
