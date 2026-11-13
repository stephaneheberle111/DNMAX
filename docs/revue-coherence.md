# Revue de cohérence avant publication

À faire **avant chaque lancement de l'atelier « Publication »**, sur `main` à jour, après les dernières fusions de la version. Le but : que tout ce que l'enseignant lit (application, site, documents) dise la même chose que ce que l'application fait réellement, avec les mêmes mots.

Le compte rendu (points relevés, corrections faites, points laissés) est joint à la demande de fusion qui passe le numéro de version. Les corrections passent par une branche, comme tout changement.

## 1. Ce qu'il faut confronter

| Surface | Où |
| --- | --- |
| Premier lancement : bonnes pratiques, mot de passe, code de secours, nom | `src/ecran-coffre.ts`, `src/main.ts` |
| Encart de départ (référentiels livrés) | `src/ecran-accueil.ts`, `src/referentiels-embarques.ts` |
| Visite guidée (textes, étapes, cibles encore présentes) | `src/parcours-etapes.ts` |
| Menus, onglets, Mon compte, Préférences, Paramètres, pied de page | `index.html`, `src/ecran-*.ts`, `public/heritage/application.js` |
| Modules et leurs avertissements (Élèves : RGPD, mot de passe, verrouillage) | `public/heritage/application.js` (`MODULES`), `src/ecran-avertissement-eleves.ts` |
| Documents produits : information aux étudiants, note au chef d'établissement, exports Word/Excel/OpenDocument | `src/domaine/documents-rgpd.ts`, exports de l'interface historique |
| Échange (fichier, en direct) et réception (« Ce que ce fichier changerait ») | `src/ecran-echange*.ts` |
| Site : accueil et présentation, Télécharger, documentation, Confidentialité, fiches RGPD | `site/index.html` |
| Journal des modifications, README, décisions | `CHANGELOG.md`, `README.md`, `DECISIONS.md` |
| Réglages publics (adresses, durées, tailles, serveurs) | `src/configuration.ts`, `src-tauri/capabilities/` |

## 2. Questions à se poser

1. **Fonctions** : chaque fonction décrite sur le site et dans la documentation existe-t-elle, avec ce nom et à cet endroit (menu, onglet, bouton) ? Une fonction ajoutée, déplacée ou retirée dans la version est-elle reflétée partout (site, visite, CHANGELOG, README) ?
2. **Vocabulaire** : mêmes mots partout pour les mêmes choses (référentiel, version validée, promotion, étudiant/élève, enseignant, « Échanger… », « Mon compte », « Préférences », « Paramètres »…). Libellés de boutons cités dans les textes identiques aux libellés réels.
3. **Données et confidentialité** : la page Confidentialité, la fiche pour l'établissement, l'information aux étudiants et la décision 20 disent-elles exactement ce que fait l'application (ce qui est stocké, où, chiffré ou non, durée de conservation, connexions sortantes et vers qui, mises à jour, échange en direct) ? Aucune connexion non annoncée (`src/configuration.ts`, capacités Tauri).
4. **Chiffres et réglages** : durées, tailles, longueurs de mot de passe, nombre de sauvegardes, délais cités dans les textes = valeurs de `src/configuration.ts` et du code.
5. **Versions et téléchargements** : numéro de version identique (`package.json`, `src-tauri/Cargo.toml`, CHANGELOG daté), liens de téléchargement du site valides, hébergement annoncé (OVH, GitHub) exact.
6. **Livraison vierge** : `npm run verifier:vide` passe (aucune donnée livrée), aucun nom de personne réel dans les textes d'exemple.
7. **Visite guidée** : chaque étape cible un élément qui existe encore et décrit l'écran actuel ; la jouer une fois de bout en bout.
8. **Présentation** : captures aux résolutions 1280×800, 1920×1200 et 375 px de l'accueil, des menus et des boîtes principales ; thème clair et sombre ; rien de rogné ni de décentré.
9. **Mentions interdites** : aucune mention d'outil d'assistance dans les textes, le code ou l'historique (voir `CLAUDE.md`).

## 3. Compte rendu attendu

- Ce qui a été confronté (liste ci-dessus, cochée).
- Incohérences trouvées et corrigées (avec la demande de fusion qui les corrige).
- Incohérences laissées, et pourquoi.
- Ce qui n'a pas pu être vérifié (par exemple l'application de bureau installée, l'impression réelle).
