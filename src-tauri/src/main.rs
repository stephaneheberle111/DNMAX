// SPDX-License-Identifier: AGPL-3.0-or-later

// Sans cet attribut, Windows ouvre une console noire derrière la fenêtre en version publiée.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dnmax_lib::lancer()
}
