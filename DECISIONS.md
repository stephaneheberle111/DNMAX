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

## 8. Les données sont chiffrées par un mot de passe

**Retenu** : tout ce que l'enseignant saisit est enregistré dans un seul fichier chiffré, `coffre.dnmax`, déverrouillé par un mot de passe demandé à chaque ouverture. Un code de secours, affiché une seule fois à la création, permet de choisir un nouveau mot de passe en cas d'oubli.

**Comment** :

- une clé de données aléatoire chiffre le contenu (XChaCha20-Poly1305) ;
- cette clé est enfermée deux fois, sous une clé dérivée du mot de passe et sous une clé dérivée du code de secours (Argon2id, 64 Mio, 3 passes) ;
- le fichier porte un numéro de version de format : une version inconnue est refusée avec un message clair plutôt que mal interprétée ;
- l'écriture passe par un fichier provisoire puis un renommage, pour ne jamais laisser un coffre à moitié écrit ;
- une copie du coffre (chiffrée elle aussi) est faite au plus une fois par jour dans `sauvegardes/`, juste après une ouverture réussie ; les dix dernières sont conservées ;
- rien n'est écrit dans le stockage du navigateur intégré.

**Pourquoi un mot de passe plutôt que le trousseau du système** : le trousseau aurait évité la saisie, mais il ne protège pas contre une personne qui utilise la session de l'enseignant, et il n'est pas toujours disponible sous Linux. Le mot de passe fonctionne de la même façon sur les trois systèmes.

**Ce que cela protège** : la lecture du disque par un tiers (ordinateur perdu, volé, prêté, réparé), une copie du fichier ou d'une sauvegarde, un autre compte du même ordinateur.

**Ce que cela ne protège pas** :

- les documents exportés (Word, Excel, OpenDocument), écrits en clair là où l'enseignant les enregistre ;
- les données tant que l'application est ouverte et déverrouillée ;
- un mot de passe faible ou noté à côté de l'ordinateur.

**Conséquence assumée** : mot de passe **et** code de secours perdus, les données sont irrécupérables, y compris par l'auteur de l'application.

**Reste à faire** : changer de mot de passe sans passer par le code de secours, restaurer une sauvegarde depuis l'application, verrouiller sans quitter.

## 9. Installeurs construits par l'intégration continue, sans certificat

**Retenu** : l'atelier `.github/workflows/installeurs.yml` construit les installeurs Windows (`.exe`), macOS (`.dmg` universel, Intel et Apple Silicon) et Linux (`.deb`, `.AppImage`) et les joint à son exécution. Il ne publie rien et n'utilise aucun secret.

**Signature** : aucun certificat payant pour l'instant (voir décision 1). Sous macOS, l'application reçoit une signature locale « ad hoc » (`signingIdentity: "-"`) : sans elle, un Mac Apple Silicon refuse purement de la lancer. Elle ne supprime pas l'avertissement de Gatekeeper.

## 10. Échange d'évaluations par fichier, avec un plan avant d'appliquer

**Retenu** : l'enseignant choisit les évaluations à envoyer ; l'application écrit un fichier `.dnmax` (JSON, format versionné) qu'il transmet comme il veut. Celui qui le reçoit voit d'abord ce que le fichier changerait — nouvelle, modifiée, identique — avec la date de dernière modification des deux côtés, et coche ce qu'il accepte. Rien n'est modifié avant sa validation.

**Ce que contient le fichier** : le *modèle* de chaque évaluation (intitulé, consignes, livrables, compétences, critères, échelle, promotions visées, nom de l'enseignant auteur). **Jamais** les élèves, leurs résultats, le suivi ni les identifiants locaux : la liste des champs exclus est dans `src/domaine/echange/modele-evaluation.ts`, et elle est réappliquée à la lecture pour qu'un fichier trafiqué ne puisse pas en injecter. Le fichier n'est donc pas chiffré.

**Base commune** : chaque évaluation embarque l'empreinte du référentiel sur lequel elle a été construite — la version validée qu'elle a figée, sinon celle de sa promotion, sinon celle en vigueur, sinon le référentiel de travail — que le référentiel lui-même soit envoyé ou non. À la réception, l'application cherche chez le destinataire un référentiel de même empreinte pour le même diplôme et la même mention (comparés sans casse ni accents) et annonce « même référentiel », « référentiel différent » ou « diplôme absent ». Une évaluation créée est rattachée à la version locale de même contenu quand elle existe.

**Ce que couvre l'empreinte** : le contenu *lisible* du référentiel (blocs, UE, EC, compétences, leurs libellés, codes, rattachements et semestres), SHA-256 d'une écriture à clés triées. En sont exclus les identifiants internes, propres à chaque poste, les couleurs d'affichage, et l'intitulé du diplôme, comparé à part. Deux enseignants qui ont saisi le même référentiel chacun de leur côté obtiennent donc la même empreinte, et un libellé modifié la change. Ce contenu lisible est fourni par l'interface historique (`window.dnmaxPont.projeterReferentiel`, troisième adaptation de son script), seule à savoir le reconstituer à partir de son dictionnaire.

**Règles du plan** :

- l'identité d'une évaluation est son identifiant, conservé à l'import : renvoyer une version corrigée la fait apparaître « modifiée » et non « nouvelle » ;
- la comparaison ne porte que sur le modèle : saisir des résultats ne rend pas une évaluation « modifiée » ;
- une modification garde les élèves, résultats et suivi du destinataire ;
- si la version locale est plus récente que celle du fichier, la ligne est signalée et décochée par défaut ;
- les évaluations présentes chez le destinataire mais absentes du fichier ne sont pas touchées : un fichier ne contient que ce que l'expéditeur a choisi, son silence n'est pas une suppression ;
- rejouer le même fichier ne propose plus rien (import idempotent).

**Dates de modification** : l'interface historique n'en tenait pas. Elles sont déduites à chaque enregistrement, en comparant le modèle avant et après, et rangées sous la clé `dnmax.modifications`. Une évaluation antérieure à cette fonction affiche « date inconnue » jusqu'à sa prochaine modification.

**Reste à faire** : échanger le référentiel lui-même (et voir ce qui diffère entre deux référentiels), échanger des évaluations avec élèves et résultats dans un fichier protégé par mot de passe, transférer toutes ses données vers un autre ordinateur.

## 11. L'enseignant est identifié par son nom

**Retenu** : après son mot de passe, l'enseignant indique son nom une fois. Ce nom est rangé dans le coffre (clé `dnmax.identite`, avec un identifiant d'installation tiré au hasard), accompagne chaque modification d'évaluation et signe les fichiers d'échange. Le plan d'import affiche, pour chaque évaluation, qui l'a modifiée en dernier ici et dans le fichier, et qui a créé le fichier.

**Pourquoi** : sans serveur ni comptes, c'est le seul moyen de savoir qui a écrit quoi quand des évaluations circulent entre enseignants.

**Limite assumée** : le nom est déclaratif. Rien n'empêche de saisir le nom d'un autre, ni de retoucher un fichier d'échange : c'est une information entre personnes de confiance, pas une preuve. Une signature vérifiable demanderait d'échanger des clés entre enseignants.

**Reste à faire** : changer son nom depuis l'application.
