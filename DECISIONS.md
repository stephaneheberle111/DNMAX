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
| WebRTC (`RTCPeerConnection`) | Échange en direct (bêta) | Non vérifié | API de la vue web du système, aucune dépendance ajoutée ; voir décision 21 |

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

**Reste à faire** : verrouiller sans quitter. (Le changement de mot de passe est décrit dans la décision 18, la restauration d'une sauvegarde dans la décision 22.)

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

**Le dictionnaire de libellés est partagé entre tous les diplômes** : un libellé reçu est réutilisé s'il existe déjà à l'identique, ajouté sinon, et rangé sous un nouvel identifiant si le sien est déjà pris par un libellé différent. Un libellé local n'est jamais modifié. Conséquence visible : après réception d'un référentiel qui reformule une compétence, le dictionnaire interne contient les deux formulations, et la plus ancienne reste proposée dans la liste d'ajout de Référentiel → Constituer.

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

**Retenu** : quand l'enseignant clique « Rechercher une mise à jour » dans le pied de page, l'application consulte le manifeste de la dernière version publiée sur le dépôt GitHub. S'il existe une version plus récente, une annonce la propose : « Installer et redémarrer » ou « Plus tard ». Rien n'est téléchargé ni installé sans l'accord de l'enseignant, et ce qui est en attente d'enregistrement est écrit avant le redémarrage.

**Appel réseau à la demande seulement.** C'est le seul moment où l'application se connecte à Internet ; l'échange en direct (décision 21) reste sur le réseau local. Jusqu'à la version 0.1.1, la vérification avait lieu à chaque lancement ; elle transmettait à GitHub l'adresse IP du poste à chaque ouverture, sans que l'enseignant l'ait demandé. Elle n'a plus lieu que sur sa demande, ce qui rend l'application silencieuse sur le réseau par défaut (RGPD : minimisation). Aucune donnée de l'enseignant n'est transmise. Si la vérification échoue, l'application le dit et propose de réessayer.

**Contrepartie** : un enseignant qui ne vérifie jamais reste sur sa version ; le site et la documentation l'invitent à le faire de temps en temps.

**Signature** : chaque mise à jour est signée avec une clé privée que seul l'auteur détient (secret du dépôt) ; l'application embarque la clé publique et refuse toute mise à jour dont la signature ne correspond pas. Cette signature est indépendante des certificats Windows et Apple (décision 1) : elle protège le canal de mise à jour, pas la première installation.

**Publication en deux temps** : le bouton « Run workflow » de l'atelier « Publication » construit et signe les installeurs puis crée un *brouillon* de version. Les postes ne voient la mise à jour qu'une fois ce brouillon publié à la main. L'auteur garde ainsi le dernier mot, et peut essayer les installeurs avant de les diffuser.

**Garde-fous de l'atelier** : il refuse de construire si l'étiquette ne correspond pas aux versions déclarées, si la clé publique est vide ou si la clé privée manque, et il refuse de publier un manifeste si le fichier ou la signature d'une plateforme manque.

**Limites** :

- sous Linux, seule l'AppImage se met à jour d'elle-même ; un paquet `.deb` se remplace à la main ;
- la perte de la clé privée empêcherait de publier des mises à jour acceptées par les postes déjà installés : il faudrait leur faire réinstaller l'application.

## 16. L'application est livrée vide

**Retenu** : une installation neuve ne contient ni référentiel, ni diplôme renseigné, ni évaluation d'exemple, ni brouillon prérempli. Seule subsiste la liste générique des types de livrables, modifiable dans « Mon établissement ».

**Pourquoi** : le référentiel d'un diplôme n'est pas une donnée de l'application ; il évolue, diffère d'une mention à l'autre, et ne concerne pas tous les enseignants. Le livrer d'office l'aurait figé dans chaque version.

**Comment obtenir un référentiel** : sur une installation vide, un encart propose ceux du DN MADE mention Objet et mention Espace. Ils sont **livrés avec l'application** (`src/referentiels-embarques.ts` lit les fichiers `site/referentiels/*.dnmax`, source unique avec le site) mais **pas installés d'office** : un clic ouvre le circuit habituel de réception (« Ce que ce fichier changerait »), qui crée le diplôme après validation (décision 12). Auparavant, il fallait les télécharger dans le navigateur puis les recevoir : deux manipulations là où une suffit, sans connexion. On peut aussi recevoir celui d'un autre enseignant ou le construire dans l'onglet Référentiel.

**L'application n'ouvre aucune connexion pour cela** : elle demande au système d'ouvrir l'adresse dans le navigateur. Seules les adresses du site et du dépôt du projet sont autorisées (`src-tauri/capabilities/default.json`, `src/configuration.ts`).

**Exemple** : « charge un exemple » reste disponible pour découvrir l'application ; faute de référentiel, il installe celui du DN MADE mention Objet, toujours présent dans le code à cette seule fin.

**Adaptations de l'interface historique** : référentiel de départ vide (`REF_VIDE`), brouillon de départ vide, et installation du référentiel d'origine par `loadDemo` quand il n'y en a aucun.

**Diplôme-cadre caché** : l'interface historique a besoin d'un diplôme actif. Une installation neuve en crée donc un, vide, marqué `cadre` et sans nom, que l'enseignant ne voit pas (`dipVisibles`) tant qu'il est vierge (`src/domaine/diplome-vierge.ts`). Le premier référentiel reçu ou « + Nouveau diplôme » le réutilise et retire la marque. Les versions antérieures le nommaient « Diplôme » et le laissaient visible, parfois à côté du premier vrai diplôme : au démarrage, un cadre vierge (sans référentiel, version ni promotion ; les évaluations et la répartition passent par les promotions) est retiré dès qu'un autre diplôme existe. Un diplôme créé à la main et encore vide n'est pas un cadre et reste.

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

**Retenu** : le site <https://dnmax.fr> est hébergé sur l'hébergement web gratuit qui accompagne le nom de domaine chez OVH, et publié par l'atelier « Site » en SFTP à chaque fusion qui touche `site/` (voir le README).

**Pourquoi** : un hébergeur français, soumis au droit européen, supprime le transfert des adresses IP des visiteurs vers les États-Unis qu'impliquait l'hébergeur précédent ; le nom de domaine, l'adresse de contact et le site sont chez le même prestataire. Le site est statique et léger (moins d'un mégaoctet) : l'offre gratuite suffit.

**Contreparties** : le mot de passe de l'unique accès FTP/SFTP de l'offre gratuite est confié aux secrets du dépôt GitHub (chiffrés, jamais affichés, utilisés seulement sur `main`) ; s'il fuitait, il se change dans l'espace client OVH. La clé du serveur est vérifiée à chaque envoi. Les réglages du serveur passent par `site/.htaccess` (Apache).

**Non retenu** : les pages GitHub, qui auraient gardé un hébergeur américain.

**Installeurs** : les installeurs Windows, macOS et `.deb` de la dernière version publiée sont aussi servis par le site (`telechargements/`, environ 20 Mo), pour que leur téléchargement ne transmette pas l'adresse IP des visiteurs à GitHub. L'AppImage (environ 80 Mo) dépasserait l'espace de l'offre gratuite (100 Mo) : elle reste sur GitHub, comme les fichiers de mise à jour et le code source.

**Transition** : l'application ouvre dnmax.fr à partir de la version 0.2.0 ; l'ancienne adresse du site est fermée.

## 20. Durée de conservation des données d'élèves

**Retenu** : les données d'élèves d'une promotion sont gardées **1 an** après sa sortie (le 1er juillet suivant la fin de son diplôme, dont la durée est lue dans les données de l'établissement, 3 ans à défaut). La sortie ne déclenche rien par elle-même : passé ce délai, DNMAX le **rappelle** au lancement, et Paramètres > « Données des élèves » > « Anonymiser ou effacer des promotions… » propose, au choix de l'enseignant :

- **anonymiser** : chaque élève devient « Élève anonyme <n> » ; ses niveaux et ses dates restent, utiles aux bilans de la formation ; ses observations et son appréciation, textes libres qui peuvent l'identifier, sont retirées ;
- **effacer** : l'élève quitte la promotion et ses résultats quittent les évaluations.

Dans les deux cas les évaluations elles-mêmes sont gardées : une grille ou des consignes ne sont pas des données personnelles. La même boîte traite les résultats restés sans élève après le retrait d'un élève ou d'une promotion.

**Redoublement** : un élève déplacé dans sa nouvelle promotion garde son identifiant et n'appartient plus à l'ancienne : il n'est pas touché. Un élève ressaisi dans la nouvelle promotion figure dans les deux : son nom, retrouvé dans une promotion encore en cours, le signale comme redoublant probable, et il est proposé **à garder** (case cochée par défaut). Une promotion où il ne reste que des redoublants gardés ne fait plus l'objet d'un rappel.

**Pourquoi** : le RGPD impose une durée de conservation limitée et proportionnée. Un an après la sortie couvre les demandes d'attestation et les recours de fin de cursus. La durée est un réglage (`ANNEES_CONSERVATION_ELEVES` dans `src/configuration.ts`), à ajuster avec l'établissement et son délégué à la protection des données.

**À tout moment** : la même boîte liste aussi les promotions encore dans leur durée de conservation, décochées ; les traiter demande une seconde confirmation. La section « Données des élèves » n'apparaît que si le module Élèves est actif ou si des élèves sont encore enregistrés.

**Avertissement à l'activation** : cocher le module Élèves ouvre d'abord un avertissement RGPD ; le module ne s'active qu'après confirmation. La fenêtre imprime deux documents produits par l'application, sans connexion (`src/domaine/documents-rgpd.ts`, repris des rubriques « RGPD » du site) : la note d'information des élèves, suivie d'un **accusé de réception** à signer, et la note pour le chef d'établissement. Ce n'est **pas un consentement** : la base légale est la mission d'intérêt public de l'établissement, et un élève ne peut pas refuser d'être évalué ; l'accusé atteste seulement que l'information a été remise. L'impression passe par la fenêtre principale (`window.print()`, document seul visible à l'impression), plutôt qu'un cadre ou une nouvelle fenêtre, moins sûrs selon les moteurs ; le dialogue d'impression du système propose l'enregistrement en PDF.

**Jamais de traitement automatique** : l'enseignant peut avoir à remettre un relevé avant. DNMAX rappelle et propose ; l'enseignant décide.

**Limites** : les sauvegardes automatiques du coffre gardent une trace jusqu'à leur remplacement (dix jours d'utilisation) ; un nom cité dans un texte libre d'un autre élève, un titre ou des consignes n'est pas recherché ; un redoublant est repéré par son nom, donc un homonyme peut être pris pour un redoublant (il est alors gardé, ce qui est sans risque).

## 21. Échange en direct (bêta) : pair à pair sur le réseau local, sans aucun serveur, codes copiés à la main

**Retenu** : « Échanger… → Échange en direct (bêta) » envoie le même contenu qu'un fichier d'échange, mais d'ordinateur à ordinateur, par un canal de données WebRTC (`RTCDataChannel`) de la vue web du système, **entre deux ordinateurs du même réseau** (même wifi ou même réseau local). Aucune dépendance n'est ajoutée.

**Parcours** : l'expéditeur choisit le contenu comme pour un fichier ; DNMAX affiche un code d'invitation, que l'expéditeur transmet par le moyen de son choix (messagerie, copier-coller) ; le destinataire le colle et obtient un code de réponse, qu'il renvoie ; l'expéditeur le colle, la connexion s'établit et le contenu part. Le destinataire voit alors le plan d'import habituel : le texte reçu suit exactement le circuit d'un fichier (`ouvrirTexteRecu` dans `src/ecran-echange.ts`), mot de passe compris s'il contient des élèves.

**Pourquoi pair à pair** : DNMAX n'a pas de serveur central et n'en veut pas (décision 1). Le contenu ne transite par aucun tiers, même chiffré.

**Pourquoi aucun serveur, et donc le même réseau** : la connexion est ouverte avec `iceServers: []` (`configurationConnexion` dans `src/canal-direct.ts`) ; seuls les candidats locaux (adresses de l'ordinateur sur son réseau) sont rassemblés, et l'application ne contacte personne. **Aucun serveur TURN** (relais) : un relais ferait passer les données par un tiers, ce que l'auteur exclut.

**Révision : serveurs STUN abandonnés** (version suivant la 0.4.1). La première version interrogeait trois serveurs STUN publics exploités en France (`stun.aeta.com`, `stun.linphone.org`, `stun.ippi.fr`), pour que deux ordinateurs de réseaux différents découvrent leur adresse publique et se joignent. En pratique, ces serveurs ne permettaient pas la connexion ; de plus, même joignables, ils n'auraient pas suffi derrière la plupart des box et réseaux d'établissement (NAT symétrique, pare-feu) sans relais, que l'auteur exclut. Les garder revenait à contacter des tiers, à leur révéler l'adresse IP publique des postes et à retarder chaque code jusqu'à 10 secondes, pour un gain nul. L'échange en direct est donc limité au réseau local, ce que l'interface dit avant l'échange et en cas d'échec ; entre deux réseaux, l'échange par fichier reste la voie prévue.

**Pourquoi une signalisation à la main** : une connexion WebRTC a besoin d'échanger une offre et une réponse (description de session et candidats de connexion). Sans serveur de signalisation, ce sont les enseignants qui les transportent. Les candidats sont rassemblés avant d'écrire le code (10 secondes au plus), pour n'avoir qu'un aller-retour. Le code (`src/domaine/echange/code-direct.ts`) porte un préfixe et une version (`DNMAX-DIRECT:1:`), un JSON compact en base64url et une somme CRC-32 qui repère un code tronqué ou mal recopié ; espaces, retours à la ligne et guillemets ajoutés par une messagerie sont ignorés. Un identifiant de séance relie la réponse à son invitation.

**Transfert** : le texte part en morceaux de 2 000 caractères (moins de 16 Kio par message, taille sûre entre navigateurs), précédés d'un en-tête (taille, nombre de morceaux, CRC-32) et suivis d'une fin (`src/domaine/echange/morceaux.ts`). Le destinataire vérifie l'ordre, la taille totale (20 Mo au plus, comme un fichier) et la somme, puis renvoie un accusé de réception ; l'expéditeur n'annonce « Envoyé » qu'après cet accusé. Le canal WebRTC est chiffré (DTLS) de bout en bout ; un contenu avec élèves est en plus chiffré sous un mot de passe, comme le fichier (commande `proteger_texte_echange` de l'enveloppe), à communiquer par un autre moyen que le code.

**Délais** (`DELAIS_ECHANGE_DIRECT`) : 15 minutes pour que l'autre enseignant se manifeste, 30 secondes pour établir la connexion une fois les deux codes collés, 60 secondes de silence au plus pendant un transfert. « Annuler » ferme la connexion à tout moment.

**CSP** : inchangée. Les connexions WebRTC (ICE, canal de données) ne relèvent pas de `connect-src` ; vérifié dans Chromium avec la CSP de l'enveloppe, sans aucune violation. Aucune capacité de l'enveloppe ne citait de serveur STUN.

**Limites** :

- l'échange en direct ne fonctionne pas d'un réseau à un autre (établissement et domicile, par exemple) : l'échange par fichier s'impose alors ;
- certains réseaux d'établissement isolent les postes les uns des autres (isolation des clients wifi, réseaux séparés) ; la connexion y échoue avec un message qui le signale et propose l'échange par fichier ;
- les vues web récentes masquent l'adresse locale derrière un nom d'hôte `.local` aléatoire, résolu par multidiffusion (mDNS) ; un réseau qui bloque la multidiffusion peut donc empêcher la connexion même entre deux postes voisins ;
- les codes contiennent ces noms ou adresses locales : ils ne sont à transmettre qu'au collègue concerné ;
- la vue web de Linux (WebKitGTK) peut ne pas fournir WebRTC : le choix apparaît alors désactivé, avec l'explication ;
- testé seulement dans Chromium, deux pages d'un même navigateur ; pas encore sur WebView2 (Windows), WKWebView (macOS), WebKitGTK ni entre deux ordinateurs réels d'un même réseau : d'où la mention « bêta ».

## 22. Restaurer une sauvegarde depuis l'application

**Retenu** : Paramètres > « Sauvegardes » liste les copies de `sauvegardes/` (date, taille) et en restaure une après une confirmation qui dit ce qui sera remplacé. Avant de remplacer `coffre.dnmax`, l'état actuel est copié dans `sauvegardes/avant-restauration-AAAA-MM-JJ-HHMMSS.dnmax` (heure universelle), puis le coffre est réécrit comme d'habitude : fichier provisoire forcé sur le disque, puis renommage. La session est ensuite verrouillée et la page rechargée : l'enseignant saisit le mot de passe en vigueur à la date de la sauvegarde (le code de secours reste valable).

**Sécurité** : l'interface ne transmet qu'un nom de fichier, accepté seulement s'il figure dans la liste que l'enveloppe vient de dresser ; cette liste ne retient que les fichiers ordinaires (pas de lien symbolique) dont le nom suit exactement l'une des deux formes produites par DNMAX, avec une date qui existe au calendrier. Aucun chemin venu de l'interface n'atteint le disque. Une sauvegarde dont la forme n'est pas celle d'un coffre est refusée avant tout remplacement.

**Pourquoi verrouiller** : la sauvegarde peut avoir un autre mot de passe que la session en cours, et un enregistrement encore en attente dans la page écraserait sinon le coffre restauré avec l'ancien contenu.

**Copies mises de côté** : elles ne comptent pas dans les dix sauvegardes quotidiennes (une restauration ne doit pas en chasser une) et apparaissent dans la même liste, ce qui permet d'annuler une restauration. Pour qu'une donnée effacée (un élève, décision 20) n'y survive pas indéfiniment, une copie mise de côté est supprimée dès que la rotation est pleine et qu'elle est plus ancienne que la plus ancienne sauvegarde quotidienne gardée : elle suit le même horizon de dix jours d'utilisation.

**Recours** : si l'application ne s'ouvre plus, la copie à la main d'un fichier de `sauvegardes/` à la place de `coffre.dnmax` reste décrite dans la documentation.

**Limites** : la relance après restauration et l'ensemble du parcours n'ont été essayés que par les tests de l'enveloppe et dans Chromium avec des réponses simulées, pas encore dans l'application installée sur chacun des trois systèmes.

## 23. Visite guidée intégrée, guidée par l'état réel des données

**Retenu** : une visite pas à pas dans l'application (`src/ecran-parcours.ts`, étapes dans `src/parcours-etapes.ts`), plutôt qu'une documentation ou une vidéo. L'écran est grisé sauf la zone où agir ; un curseur animé montre le geste attendu. La prise en main se lance à la première ouverture, une seule fois (entrée `dnmax.parcours` du coffre), et se relance depuis « Mon compte » ; les modules Élèves et Niveaux DN MADE ont chacun leur visite, lancée depuis leur carte dans Paramètres.

**Pourquoi** : les bêta-testeurs doivent pouvoir démarrer seuls, sans démonstration. Chaque étape lit ce qui est réellement fait (référentiel installé, promotions, enseignants, répartition, évaluations, modules ; `src/domaine/parcours.ts`) : elle salue l'objectif atteint et passe à la suite, et saute ce qui était déjà fait quand on relance la visite.

**Déroulé** : la zone éclairée glisse d'une étape à la suivante ; la bulle attend son arrivée pour apparaître directement à sa place. « Suivant » sur une étape qui attend un clic fait ce clic (mène au bon onglet, ouvre le référentiel choisi). La visite note son étape dans la session : après la validation d'un import, qui recharge l'application, elle reprend où elle en était au lieu de recommencer.

**Limites** : la visite ne remplit rien à la place de l'enseignant et ne bloque pas les boîtes de l'application, qui restent au-dessus du voile. Elle ne couvre que l'essentiel ; le détail reste dans la documentation du site.

## 24. Le référentiel est validé par l'enseignant avant toute évaluation

**Retenu** : l'enseignant est responsable du référentiel sur lequel il évalue, pas l'hébergeur ni le développeur. Une version du référentiel ne compte comme validée que s'il l'a lui-même attestée sur son poste : la validation (Référentiel → Constituer → Validation) exige de cocher « J'ai vérifié ce référentiel et j'en assume le contenu : l'hébergeur et le développeur de DNMAX n'en sont pas responsables. » La version porte alors la date de cette attestation (champ `attestation` des versions de `dnmade.data`).

**Ce qui est bloqué** : pour une promotion dont la version suivie (celle qui lui est appliquée, sinon la version en vigueur de son diplôme) n'est pas attestée, DNMAX refuse de créer, d'enregistrer ou de dupliquer une évaluation et de saisir des résultats d'élèves ; sans promotion, c'est la version en vigueur du diplôme affiché qui compte. Un message l'explique et mène au volet de validation. **Reste permis** : consulter les évaluations existantes, les exporter, tenir leur suivi (restitution, annulation) ; rien n'est modifié ni supprimé. Les évaluations reçues par échange ne sont pas bloquées à l'import : elles le sont, comme les autres, quand on veut les enregistrer ou y saisir des résultats.

**Règle** : `src/domaine/validation-referentiel.ts`, testée, appelée par l'interface historique via le pont (`window.dnmaxPont.referentielValide`). La visite guidée lit le même état (`Avancement.referentielValide`).

**Référentiels livrés ou reçus** : ils arrivent sans attestation. Constat sur le modèle existant (décision 12) : un référentiel qui crée son diplôme (`creerDiplome`, dont les référentiels livrés avec l'application) devenait version en vigueur, donc « validé » au sens de l'ancien modèle ; un référentiel reçu pour un diplôme existant devient une version non activée. Ces deux comportements sont conservés — le diplôme reste utilisable tout de suite et la version reçue n'est toujours pas activée d'office — mais aucune de ces versions n'est attestée : il faut la valider. Si la version en vigueur est identique au référentiel de travail et seulement non attestée, la validation l'atteste sans créer de copie, pour que promotions et évaluations qui la suivent ne changent pas de version. Une version plus ancienne, encore suivie par une promotion, se valide depuis la liste des versions avec la même case.

**Conséquence pour les installations existantes** : les versions validées avant cette décision n'ont pas d'attestation ; l'enseignant doit les valider une fois avant d'enregistrer de nouveau une évaluation. Aucune donnée n'est modifiée par la mise à jour.

**Exemple** : « Charger un exemple » atteste, pour sa démonstration, le référentiel qu'il installe lui-même (version notée « Exemple ») et les mentions qu'il en dérive ; il n'atteste jamais un référentiel déjà présent.

## 25. Aucune donnée dans ce qui est livré, vérifié à chaque fusion

**Retenu** : l'intégration continue démarre l'interface telle qu'elle est livrée, dans un navigateur sans données, et échoue si le démarrage contient autre chose qu'une installation vierge (`outils/verifier-installation-vide.ts`, règle testée dans `outils/installation-vide.ts`) : ni référentiel, ni diplôme nommé, ni établissement, ni enseignant, ni promotion, ni élève, ni évaluation. Seuls sont admis le diplôme-cadre vide et la liste des types de livrables proposés.

**Pourquoi** : livrer une donnée d'exemple ou un reste d'essai dans une version mettrait des noms dans les installations des enseignants. Une vérification humaine ne suffit pas à le garantir dans la durée.

**Outil** : Playwright (licence Apache 2.0, statut SILL non vérifié), déjà utilisé pour les essais à l'écran ; retenu pour piloter un vrai navigateur sans serveur ni service extérieur.

## 26. Le référentiel se constitue en cinq étapes, sans volet « Définir »

**Retenu** : le volet Référentiel → Définir, qui éditait à part les noms, codes et intitulés de tous les éléments, est abandonné. Référentiel → Constituer compte cinq étapes : 1. unités d'enseignement, 2. enseignements constitutifs, 3. blocs et compétences (nouvelle), 4. planification par semestre, 5. validation. Chaque étape crée, renomme et retire **ses propres éléments seulement** ; les autres y sont en lecture seule (à l'étape 2, l'UE d'un EC se choisit dans une liste mais ne se renomme pas ; à l'étape 4, blocs et compétences ne se créent ni ne se modifient plus, seules les cases du tableau changent).

**Raison** : deux endroits pour modifier le même élément brouillaient qui modifie quoi, et l'enseignant passait de Définir à Constituer pour une seule correction. Une étape par niveau du référentiel suit l'ordre dans lequel on le construit.

**Modèle de données inchangé** : le dictionnaire (`dnmade.data` → `dico`) reste le magasin des noms, codes et intitulés, commun aux mentions ; chaque référentiel (`refs`) garde ses associations. Les étapes modifient la vue fusionnée de la mention active, qui rejoint le dictionnaire à l'enregistrement, comme avant. Aucune migration : les données existantes s'affichent telles quelles, et l'échange de référentiels, l'exemple et la validation ne changent pas. « Retirer » enlève l'élément du référentiel sans l'effacer du dictionnaire (les versions datées peuvent encore en avoir besoin) ; il reste proposé dans la liste d'ajout de son étape.

**Numéro d'un bloc** : une compétence désigne son bloc par son numéro. Renuméroter un bloc fait donc suivre les compétences qui le désignaient dans chaque référentiel qui retient ce bloc et dans les versions datées, et un numéro déjà porté par un autre bloc d'un de ces référentiels est refusé. Règle pure et testée : `src/domaine/numero-bloc.ts`, appelée via le pont (`window.dnmaxPont.renumeroterBloc`). Avant, changer le numéro dans Définir laissait les compétences « sans bloc ».
