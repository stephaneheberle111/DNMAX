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

## 3. L'identifiant d'application est `fr.dnmax.app`

`fr.dnmax.app` (dans `src-tauri/tauri.conf.json`) détermine le dossier où le système range les données de l'application. Il est retenu définitivement, faute de nom de domaine propre au projet.

**Il ne doit plus changer** : le modifier ferait perdre aux enseignants l'accès à leurs données, qui resteraient dans l'ancien dossier.

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

La boîte s'ouvre dans le dossier Documents de l'enseignant quand le système en indique un. Après l'enregistrement, l'application propose d'ouvrir le document avec le logiciel par défaut du système : l'enveloppe retient pour cela l'emplacement du dernier export, que la page ne connaît jamais — elle ne peut donc faire ouvrir que ce que l'enseignant vient d'enregistrer lui-même.

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

**Reste à faire** : restaurer une sauvegarde depuis l'application, verrouiller sans quitter. (Le changement de mot de passe est décrit dans la décision 18.)

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

Le nom se corrige dans « Mon compte » (décision 18).

## 12. Un référentiel reçu devient une nouvelle version, jamais activée d'office

**Retenu** : à l'envoi, l'enseignant peut cocher le référentiel d'un ou plusieurs diplômes (la version en vigueur, sinon le référentiel de travail). À la réception, le plan indique pour chacun s'il est identique à un référentiel d'ici, et sinon ce qui le distingue du référentiel de référence local : compétences, EC, UE et blocs en plus, en moins ou modifiés, désignés par leur code ou leur nom. S'il est accepté, il est ajouté à la liste des versions du diplôme, avec une note « Reçu de … le … ».

**Rien n'est activé** : ni le référentiel de travail, ni la version en vigueur, ni les promotions ne changent. L'enseignant applique lui-même la version reçue depuis Référentiel → Constituer → Validation. Un import ne peut donc pas modifier en silence le référentiel sur lequel des évaluations sont en cours.

**Le dictionnaire de libellés est partagé entre tous les diplômes** : un libellé reçu est réutilisé s'il existe déjà à l'identique, ajouté sinon, et rangé sous un nouvel identifiant si le sien est déjà pris par un libellé différent. Un libellé local n'est jamais modifié. Conséquence visible : après réception d'un référentiel qui reformule une compétence, le dictionnaire (Référentiel → Définir) contient les deux formulations.

**Évaluations du même fichier** : une évaluation construite sur le référentiel reçu est rattachée à la version créée.

**Diplôme absent chez le destinataire** : le référentiel reçu crée alors ce diplôme, dont il devient le référentiel de travail et la version en vigueur — il n'y a rien d'existant à protéger, et le diplôme doit être utilisable tout de suite. Sur une installation neuve, le diplôme vide créé d'office est renseigné plutôt que doublé.

## 13. Les élèves et leurs résultats ne voyagent que dans un fichier chiffré

**Retenu** : à l'envoi, une option « Inclure les élèves et leurs résultats » ajoute au fichier les données d'élèves des évaluations choisies et leurs promotions. Le fichier est alors chiffré sous un mot de passe choisi pour l'occasion (même chiffrement que le coffre), à communiquer au destinataire par un autre canal. À la réception, le mot de passe est demandé avant toute lecture.

**Garde-fou** : un fichier en clair ne peut pas faire entrer de données d'élèves, même s'il en contient : elles ne sont lues que si le fichier vient d'être déchiffré.

**Rapprochement** : les identifiants de promotions et d'élèves sont propres à chaque poste. Une promotion reçue est retrouvée par son identifiant, sinon par son nom au sein du même diplôme, sinon créée. Un élève est retrouvé par son identifiant, sinon par son nom (casse, accents et espaces ignorés), sinon ajouté à la promotion. Deux enseignants qui ont saisi la même classe chacun de leur côté se retrouvent donc. Aucun élève d'ici n'est retiré ni renommé.

**Fusion des résultats, élève par élève** : un élève sans résultat ici reçoit ceux du fichier ; des résultats identiques ne changent rien ; des résultats différents sont signalés et **ceux d'ici sont gardés**, sauf si l'enseignant coche leur remplacement pour cette évaluation. Les élèves d'ici absents du fichier ne sont jamais touchés. Le plan annonce ces trois nombres avant validation.

**Limites** :

- deux élèves homonymes d'une même promotion seraient confondus ;
- l'état des restitutions n'est repris que si aucun identifiant d'élève n'a dû être changé ;
- si le diplôme de la promotion n'existe pas chez le destinataire, les résultats ne sont pas importables ;
- la fusion se décide par évaluation, pas élève par élève.

**Adaptation de l'interface historique** : ses données d'établissement n'étaient enregistrées qu'à leur première modification ; elles le sont maintenant dès le chargement (`persistData()` en fin de script), sans quoi une installation neuve ne connaissait pas son propre diplôme lors d'un import.

## 14. Changer d'ordinateur : une copie du coffre, installable seulement sur une installation vide

**Retenu** : « Échanger… → Changer d'ordinateur » enregistre une copie complète du coffre. Elle reste chiffrée et s'ouvre avec le mot de passe (ou le code de secours) de l'enseignant ; son nom, ses élèves, ses résultats et ses référentiels voyagent avec elle. Sur le nouvel ordinateur, le premier lancement propose « J'ai déjà mes données sur un autre ordinateur ».

**Pourquoi seulement sur une installation vide** : installer un coffre par-dessus des données existantes les détruirait en bloc. Un coffre déjà présent n'est donc jamais remplacé. Pour réunir deux jeux de données, on passe par l'échange, qui montre ce qui change ligne par ligne.

**Conséquence** : il n'y a pas de synchronisation entre deux ordinateurs utilisés en parallèle ; le transfert est un déménagement.

## 15. Mises à jour proposées, jamais imposées, et publiées à la main

**Retenu** : au lancement, une fois les données ouvertes, l'application consulte le manifeste de la dernière version publiée sur le dépôt GitHub. S'il existe une version plus récente, une annonce la propose : « Installer et redémarrer » ou « Plus tard ». Rien n'est téléchargé ni installé sans l'accord de l'enseignant, et ce qui est en attente d'enregistrement est écrit avant le redémarrage.

**Seul appel réseau de l'application.** Aucune donnée de l'enseignant n'est transmise. Sans connexion, ou si la vérification échoue, l'application ne dit rien et fonctionne normalement.

**Signature** : chaque mise à jour est signée avec une clé privée que seul l'auteur détient (secret du dépôt) ; l'application embarque la clé publique et refuse toute mise à jour dont la signature ne correspond pas. Cette signature est indépendante des certificats Windows et Apple (décision 1) : elle protège le canal de mise à jour, pas la première installation.

**Publication en deux temps** : le bouton « Run workflow » de l'atelier « Publication » construit et signe les installeurs puis crée un *brouillon* de version. Les postes ne voient la mise à jour qu'une fois ce brouillon publié à la main. L'auteur garde ainsi le dernier mot, et peut essayer les installeurs avant de les diffuser.

**Garde-fous de l'atelier** : il refuse de construire si l'étiquette ne correspond pas aux versions déclarées, si la clé publique est vide ou si la clé privée manque, et il refuse de publier un manifeste si le fichier ou la signature d'une plateforme manque.

**Limites** :

- sous Linux, seule l'AppImage se met à jour d'elle-même ; un paquet `.deb` se remplace à la main ;
- la perte de la clé privée empêcherait de publier des mises à jour acceptées par les postes déjà installés : il faudrait leur faire réinstaller l'application.

## 16. L'application est livrée vide

**Retenu** : une installation neuve ne contient ni référentiel, ni diplôme renseigné, ni évaluation d'exemple, ni brouillon prérempli. Seule subsiste la liste générique des types de livrables, modifiable dans « Mon établissement ».

**Pourquoi** : le référentiel d'un diplôme n'est pas une donnée de l'application ; il évolue, diffère d'une mention à l'autre, et ne concerne pas tous les enseignants. Le livrer d'office l'aurait figé dans chaque version.

**Comment obtenir un référentiel** : sur une installation vide, un encart propose de télécharger celui du DN MADE mention Objet (fichier `site/referentiels/dn-made-objet.dnmax`, ouvert dans le navigateur) puis de le recevoir par le circuit habituel de l'échange, qui crée le diplôme (décision 12). On peut aussi recevoir celui d'un autre enseignant ou le construire dans l'onglet Référentiel.

**L'application n'ouvre aucune connexion pour cela** : elle demande au système d'ouvrir l'adresse dans le navigateur. Seules les adresses du site et du dépôt du projet sont autorisées (`src-tauri/capabilities/default.json`, `src/configuration.ts`).

**Exemple** : « charge un exemple » reste disponible pour découvrir l'application ; faute de référentiel, il installe celui du DN MADE mention Objet, toujours présent dans le code à cette seule fin.

**Adaptations de l'interface historique** : référentiel de départ vide (`REF_VIDE`), brouillon de départ vide, et installation du référentiel d'origine par `loadDemo` quand il n'y en a aucun.

## 17. L'exemple se retire sans toucher au travail de l'enseignant

**Retenu** : au moment où l'enseignant charge l'exemple, l'application note l'état de ses données juste avant et juste après (clé `dnmax.exemple`, dans le coffre). Un bouton « Retirer l'exemple » apparaît alors ; il annonce ce qui sera retiré avant de le faire.

**Règle** : la différence entre « avant » et « après » dit exactement ce que l'exemple a apporté. Ne sont retirées que les évaluations et promotions créées par l'exemple ; tout ce que l'enseignant a créé ensuite est conservé. Une promotion d'exemple à laquelle il a rattaché une évaluation est gardée. L'établissement, le référentiel et les réglages reviennent à leur état d'avant **seulement s'ils n'ont pas été modifiés depuis** ; sinon ils sont laissés tels quels et l'enseignant en est prévenu.

**Pourquoi pas un simple retour à l'état d'avant** : il effacerait aussi ce que l'enseignant a saisi après avoir chargé l'exemple.

**Limite** : l'exemple chargé avant cette version n'a pas d'état « avant » enregistré et ne peut pas être retiré par ce bouton.

## 18. « Mon compte » : nom, mot de passe, à propos et retours

**Retenu** : un bouton « Mon compte… » ouvre trois rubriques.

- **Nom** : l'enseignant peut le corriger ; son identifiant d'installation ne change pas, et les modifications déjà signées gardent l'ancien nom.
- **Mot de passe** : il se change en fournissant l'ancien. Seule la clé de données est ré-enfermée sous le nouveau mot de passe ; le contenu n'est pas rechiffré et le code de secours reste valable. Les sauvegardes antérieures s'ouvrent toujours avec le mot de passe en vigueur le jour où elles ont été faites.
- **À propos** : version, licence, et trois liens ouverts dans le navigateur (idées et bugs, site, code source).

**Canal de retours** : la page « Idées et bugs » du site, qui ouvre un ticket prérempli sur GitHub. Un enseignant sans compte GitHub ne peut donc pas déposer lui-même un retour par ce canal.

## 19. Le site est hébergé chez OVH, en France

**Retenu** : le site <https://dnmax.fr> est hébergé sur l'hébergement web gratuit qui accompagne le nom de domaine chez OVH, et publié à la main par FTP chiffré (voir le README).

**Pourquoi** : un hébergeur français, soumis au droit européen, supprime le transfert des adresses IP des visiteurs vers les États-Unis qu'impliquait Cloudflare Pages ; le nom de domaine, l'adresse de contact et le site sont chez le même prestataire. Le site est statique et léger (moins d'un mégaoctet) : l'offre gratuite suffit.

**Contreparties** : pas de déploiement automatique comme chez Cloudflare. L'offre gratuite n'a qu'un accès FTP ; le site change rarement, un envoi à la main suffit et évite de confier ce mot de passe aux ateliers GitHub ; les réglages du serveur passent par `site/.htaccess` (Apache) au lieu de `site/_headers`, gardé tant que l'ancienne adresse sert de transition.

**Non retenu** : les pages GitHub, qui auraient gardé un hébergeur américain.

**Transition** : l'application ouvre dnmax.fr à partir de la version 0.2.0. Les postes plus anciens ouvrent encore dnmax.pages.dev : l'ancien site Cloudflare reste en ligne jusqu'à ce que ces postes soient à jour, puis est supprimé.
