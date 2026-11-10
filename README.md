# DNMAX

DNMAX aide les enseignants de DN MADE à construire, suivre et restituer leurs évaluations par compétences à partir du référentiel du diplôme.

C'est une application de bureau autonome pour Windows, Linux et macOS : pas de serveur central, pas de compte, les données restent sur l'ordinateur de l'enseignant.

> **État** : en construction. L'interface est complète, mais les données ne sont pas encore enregistrées : elles disparaissent à la fermeture.

## Prérequis pour développer

- Node.js 22 et npm
- Rust (la version exacte est fixée par `rust-toolchain.toml` et installée automatiquement par `rustup`)
- Les bibliothèques système de Tauri. Sous Debian ou Ubuntu :

  ```bash
  sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev
  ```

  Pour Windows et macOS, voir les [prérequis de Tauri](https://tauri.app/fr/start/prerequisites/).

## Installer

```bash
npm ci
```

## Lancer

```bash
npm run dev
```

## Tester et contrôler

| Contrôle | Commande |
| --- | --- |
| Tests | `npm test` |
| Linter | `npm run lint` |
| Typage | `npm run typecheck` |
| Format Rust | `cargo fmt --check` (dans `src-tauri/`) |
| Tests Rust | `cargo test --locked` (dans `src-tauri/`) |
| Linter Rust | `cargo clippy --all-targets --locked -- -D warnings` (dans `src-tauri/`) |

## Construire un installeur

```bash
npm run build
```

Les installeurs sont produits dans `src-tauri/target/release/bundle/`, pour le système sur lequel la commande est lancée.

## Organisation du code

```mermaid
flowchart LR
  historique["public/heritage/<br/>interface historique"] --> pont["src/heritage/pont.ts<br/>pont vers l'application"]
  pont --> domaine["src/domaine/<br/>règles, sans accès extérieur"]
  pont --> enveloppe["src/enveloppe.ts<br/>appels à l'enveloppe de bureau"]
  enveloppe --> tauri["src-tauri/<br/>enveloppe Tauri (Rust)"]
```

- `public/heritage/` et `index.html` : l'interface historique, reprise telle quelle (voir `DECISIONS.md`, décision 5).
- `src/heritage/pont.ts` : ce que l'application fournit à l'interface historique (stockage, enregistrement de fichiers).
- `src/domaine/` : ce qui calcule. Aucune dépendance au navigateur ni à Tauri, donc testable directement.
- `src/enveloppe.ts` : ce qui parle à l'extérieur.
- `src-tauri/` : la fenêtre de bureau, ses commandes (`src/`) et ses droits (`capabilities/`).

## Pièges déjà rencontrés

| Symptôme | Parade |
| --- | --- |
| Une commande Rust reçoit du JSON alors que l'interface a envoyé des octets | Sous Linux, Tauri transmet un envoi binaire comme une liste JSON de nombres : accepter les deux formes (voir `extraire_octets`). |
| Changer `document.title` ne change pas le titre de la fenêtre | Le fixer côté Rust avec `set_title`. |
| `npm run lint` signale une erreur de type sur `import.meta.dirname` | `@types/node` doit être installé et listé dans `types` de `tsconfig.json`. |

## Documents

- [`DECISIONS.md`](DECISIONS.md) : choix techniques et leurs raisons.
- [`CHANGELOG.md`](CHANGELOG.md) : journal des modifications.

## Licence

[AGPL-3.0-or-later](LICENSE).
