// SPDX-License-Identifier: CECILL-2.1

//! Enregistrement d'un fichier produit par l'interface (Word, Excel, OpenDocument…).
//!
//! L'interface ne choisit jamais le chemin : elle propose un nom, l'enseignant
//! choisit l'emplacement dans la boîte de dialogue du système.

use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

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

/// Extensions des documents que l'application sait produire pour être lus dans un autre logiciel.
const EXTENSIONS_OUVRABLES: [&str; 5] = ["docx", "odt", "xlsx", "ods", "pdf"];

/// Indique si le fichier peut être confié au logiciel par défaut du système.
///
/// « Ouvrir » un fichier, c'est l'exécuter quand son extension désigne un
/// programme (`.bat`, `.exe`, `.desktop`…). Le nom vient de l'interface et
/// l'enseignant peut le changer dans la boîte de dialogue : seuls les
/// documents que DNMAX produit sont donc ouverts, par liste blanche.
pub fn est_ouvrable(chemin: &Path) -> bool {
    chemin
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            EXTENSIONS_OUVRABLES
                .iter()
                .any(|admise| extension.eq_ignore_ascii_case(admise))
        })
}

/// Écrit le contenu exporté à l'emplacement choisi par l'enseignant, en
/// remplaçant le fichier qui s'y trouve déjà.
///
/// Le contenu est d'abord écrit dans un fichier temporaire du même dossier,
/// qui remplace ensuite l'ancien : si l'écriture échoue (disque plein,
/// document ouvert dans un autre logiciel), l'ancien fichier reste intact au
/// lieu d'être tronqué.
///
/// # Errors
///
/// Rend l'erreur du système si l'emplacement n'est pas accessible en écriture.
pub fn ecrire_export(chemin: &Path, contenu: &[u8]) -> io::Result<()> {
    let temporaire = chemin_temporaire(chemin);
    let resultat = ecrire_puis_remplacer(&temporaire, chemin, contenu);
    if resultat.is_err() {
        // Le fichier temporaire peut ne pas exister : l'échec de son effacement ne dit rien de plus.
        let _ = fs::remove_file(&temporaire);
    }
    resultat
}

fn ecrire_puis_remplacer(temporaire: &Path, chemin: &Path, contenu: &[u8]) -> io::Result<()> {
    let mut fichier = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(temporaire)?;
    fichier.write_all(contenu)?;
    fichier.sync_all()?;
    drop(fichier);
    fs::rename(temporaire, chemin)
}

/// Fichier caché voisin de `chemin`, propre à ce processus.
fn chemin_temporaire(chemin: &Path) -> PathBuf {
    let nom = chemin
        .file_name()
        .map(|nom| nom.to_string_lossy().into_owned())
        .unwrap_or_default();
    chemin.with_file_name(format!(".{nom}.{}.dnmax-tmp", std::process::id()))
}

/// Message rendu à l'interface quand l'écriture échoue.
///
/// Un document ouvert dans Word ou LibreOffice est verrouillé sous Windows :
/// le remplacer échoue (accès refusé, ou partage refusé, codes 32 et 33).
/// L'enseignant doit alors savoir quoi faire, plutôt que lire l'erreur brute.
pub fn message_ecriture(erreur: &io::Error) -> String {
    if fichier_occupe(erreur) {
        "le fichier est ouvert dans un autre logiciel (Word, LibreOffice…) ou en lecture seule : fermez-le puis réessayez, ou choisissez un autre nom".to_owned()
    } else {
        format!("écriture impossible : {erreur}")
    }
}

fn fichier_occupe(erreur: &io::Error) -> bool {
    if erreur.kind() == io::ErrorKind::PermissionDenied {
        return true;
    }
    cfg!(windows) && matches!(erreur.raw_os_error(), Some(32 | 33))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn un_document_exporte_peut_etre_ouvert() {
        for nom in [
            "fiche.docx",
            "fiche.odt",
            "grille.XLSX",
            "grille.ods",
            "fiche.pdf",
        ] {
            assert!(est_ouvrable(Path::new(nom)), "{nom}");
        }
    }

    #[test]
    fn un_fichier_qui_s_execute_n_est_jamais_ouvert() {
        for nom in [
            "fiche.bat",
            "fiche.exe",
            "fiche.desktop",
            "fiche.docx.cmd",
            "fiche.html",
            "sans-extension",
            ".docx",
            "",
        ] {
            assert!(!est_ouvrable(Path::new(nom)), "{nom}");
        }
    }

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
    fn remplace_un_fichier_existant_sans_laisser_de_fichier_temporaire() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("fiche.docx");
        fs::write(&chemin, b"ancien contenu, plus long").expect("fichier existant");
        ecrire_export(&chemin, b"nouveau").expect("remplacement");
        assert_eq!(fs::read(&chemin).expect("lecture"), b"nouveau");
        let restants: Vec<_> = fs::read_dir(dossier.path()).expect("liste").collect();
        assert_eq!(restants.len(), 1);
    }

    #[test]
    fn explique_un_fichier_ouvert_ailleurs_ou_en_lecture_seule() {
        let message = message_ecriture(&io::Error::from(io::ErrorKind::PermissionDenied));
        assert!(message.contains("ouvert dans un autre logiciel"));
    }

    #[test]
    fn garde_l_erreur_du_systeme_dans_les_autres_cas() {
        let message = message_ecriture(&io::Error::new(io::ErrorKind::StorageFull, "disque plein"));
        assert_eq!(message, "écriture impossible : disque plein");
    }

    #[cfg(windows)]
    #[test]
    fn reconnait_le_partage_refuse_par_windows() {
        let message = message_ecriture(&io::Error::from_raw_os_error(32));
        assert!(message.contains("ouvert dans un autre logiciel"));
    }

    #[test]
    fn signale_un_emplacement_inaccessible() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("absent").join("fiche.docx");
        assert!(ecrire_export(&chemin, b"contenu").is_err());
    }
}
