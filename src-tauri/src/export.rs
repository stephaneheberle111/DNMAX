// SPDX-License-Identifier: AGPL-3.0-or-later

//! Enregistrement d'un fichier produit par l'interface (Word, Excel, OpenDocument…).
//!
//! L'interface ne choisit jamais le chemin : elle propose un nom, l'enseignant
//! choisit l'emplacement dans la boîte de dialogue du système.

use std::fs;
use std::io;
use std::path::Path;

/// Longueur maximale conservée pour un nom proposé, extension comprise.
const LONGUEUR_MAXIMALE_NOM: usize = 120;

/// Nom utilisé quand celui proposé par l'interface ne contient rien d'exploitable.
const NOM_PAR_DEFAUT: &str = "export-dnmax";

/// Rend un nom de fichier sûr à proposer dans la boîte de dialogue.
///
/// Le nom vient de l'interface, donc de l'extérieur : les séparateurs de
/// dossiers, les caractères interdits sous Windows et les caractères de
/// contrôle sont remplacés, pour qu'il ne puisse désigner qu'un fichier du
/// dossier choisi par l'enseignant.
pub fn nettoyer_nom_fichier(nom_propose: &str) -> String {
    let nettoye: String = nom_propose
        .chars()
        .map(|caractere| match caractere {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            autre if autre.is_control() => '-',
            autre => autre,
        })
        .take(LONGUEUR_MAXIMALE_NOM)
        .collect();
    let nettoye = nettoye.trim().trim_matches('.').trim();
    if nettoye.is_empty() {
        NOM_PAR_DEFAUT.to_owned()
    } else {
        nettoye.to_owned()
    }
}

/// Écrit le contenu exporté à l'emplacement choisi par l'enseignant.
///
/// # Errors
///
/// Rend l'erreur du système si l'emplacement n'est pas accessible en écriture.
pub fn ecrire_export(chemin: &Path, contenu: &[u8]) -> io::Result<()> {
    fs::write(chemin, contenu)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conserve_un_nom_ordinaire_avec_accents() {
        assert_eq!(
            nettoyer_nom_fichier("Évaluation S3 — objet.docx"),
            "Évaluation S3 — objet.docx"
        );
    }

    #[test]
    fn neutralise_une_remontee_de_dossier() {
        assert_eq!(nettoyer_nom_fichier("../../etc/passwd"), "-..-etc-passwd");
    }

    #[test]
    fn remplace_les_caracteres_interdits_sous_windows() {
        assert_eq!(
            nettoyer_nom_fichier("a:b*c?d\"e<f>g|h\\i"),
            "a-b-c-d-e-f-g-h-i"
        );
    }

    #[test]
    fn remplace_les_caracteres_de_controle() {
        assert_eq!(nettoyer_nom_fichier("fiche\n\u{0}.odt"), "fiche--.odt");
    }

    #[test]
    fn rend_le_nom_par_defaut_quand_rien_ne_reste() {
        assert_eq!(nettoyer_nom_fichier(""), NOM_PAR_DEFAUT);
        assert_eq!(nettoyer_nom_fichier("  ..  "), NOM_PAR_DEFAUT);
    }

    #[test]
    fn tronque_un_nom_demesure() {
        let nom = "é".repeat(500);
        assert_eq!(
            nettoyer_nom_fichier(&nom).chars().count(),
            LONGUEUR_MAXIMALE_NOM
        );
    }

    #[test]
    fn ecrit_le_contenu_a_l_emplacement_choisi() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("fiche.docx");
        ecrire_export(&chemin, b"contenu").expect("écriture");
        assert_eq!(fs::read(&chemin).expect("lecture"), b"contenu");
    }

    #[test]
    fn signale_un_emplacement_inaccessible() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("absent").join("fiche.docx");
        assert!(ecrire_export(&chemin, b"contenu").is_err());
    }
}
