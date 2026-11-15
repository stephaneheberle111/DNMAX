// SPDX-License-Identifier: CECILL-2.1

// Sans cet attribut, Windows ouvre une console noire derrière la fenêtre en version publiée.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dnmax_lib::lancer()
}
