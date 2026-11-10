// SPDX-License-Identifier: AGPL-3.0-or-later

/// Démarre l'application de bureau.
///
/// # Panics
///
/// S'arrête si la fenêtre ne peut pas être créée (bibliothèque d'affichage
/// absente du système, par exemple) : rien d'utile n'est possible sans elle.
pub fn lancer() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("impossible de démarrer l'application DNMAX");
}
