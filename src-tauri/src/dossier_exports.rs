// SPDX-License-Identifier: CECILL-2.1

//! Dossier proposé par la boîte « Enregistrer sous », choisi dans Préférences.
//!
//! Le chemin ne transite jamais par la page : l'enveloppe le fait choisir à
//! l'enseignant par la boîte de dialogue du système, le garde dans un petit
//! fichier de réglage du poste (hors du coffre, ce n'est pas une donnée
//! d'évaluation) et s'en sert à chaque enregistrement.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Nom du fichier de réglage, dans le dossier de configuration de l'application.
pub const NOM_FICHIER: &str = "dossier-exports.txt";

/// Dossier où ouvrir la boîte « Enregistrer sous » : celui choisi s'il existe
/// encore et que c'est bien un dossier, sinon le dossier Documents.
///
/// Un dossier choisi puis supprimé, renommé ou sur une clé débranchée ne doit
/// pas empêcher d'enregistrer : on retombe simplement sur Documents.
pub fn dossier_initial(choisi: Option<PathBuf>, documents: Option<PathBuf>) -> Option<PathBuf> {
    choisi
        .filter(|dossier| dossier.is_absolute() && dossier.is_dir())
        .or(documents)
}

/// Lit le dossier choisi, s'il y en a un ; un fichier absent ou vide vaut « aucun ».
pub fn lire(fichier: &Path) -> Option<PathBuf> {
    let texte = fs::read_to_string(fichier).ok()?;
    let chemin = texte.trim();
    (!chemin.is_empty()).then(|| PathBuf::from(chemin))
}

/// Retient le dossier choisi ; `None` revient au dossier Documents.
///
/// # Errors
/// Si le dossier de configuration ne peut pas être créé ou le fichier écrit.
pub fn enregistrer(fichier: &Path, dossier: Option<&Path>) -> io::Result<()> {
    match dossier {
        None => match fs::remove_file(fichier) {
            Err(erreur) if erreur.kind() != io::ErrorKind::NotFound => Err(erreur),
            _ => Ok(()),
        },
        Some(dossier) => {
            if let Some(parent) = fichier.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(fichier, dossier.to_string_lossy().as_bytes())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{dossier_initial, enregistrer, lire};
    use std::path::PathBuf;

    #[test]
    fn propose_le_dossier_choisi_quand_il_existe() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let documents = PathBuf::from("/documents");
        assert_eq!(
            dossier_initial(Some(dossier.path().to_path_buf()), Some(documents)),
            Some(dossier.path().to_path_buf())
        );
    }

    #[test]
    fn retombe_sur_documents_quand_le_dossier_choisi_a_disparu() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let disparu = dossier.path().join("supprime");
        let documents = Some(PathBuf::from("/documents"));
        assert_eq!(dossier_initial(Some(disparu), documents.clone()), documents);
    }

    #[test]
    fn retombe_sur_documents_pour_un_chemin_relatif_ou_un_fichier() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let fichier = dossier.path().join("pas-un-dossier.txt");
        std::fs::write(&fichier, "x").expect("écriture");
        let documents = Some(PathBuf::from("/documents"));
        assert_eq!(
            dossier_initial(Some(PathBuf::from("relatif")), documents.clone()),
            documents
        );
        assert_eq!(dossier_initial(Some(fichier), documents.clone()), documents);
    }

    #[test]
    fn sans_choix_propose_documents() {
        let documents = Some(PathBuf::from("/documents"));
        assert_eq!(dossier_initial(None, documents.clone()), documents);
        assert_eq!(dossier_initial(None, None), None);
    }

    #[test]
    fn retient_puis_oublie_le_dossier_choisi() {
        let config = tempfile::tempdir().expect("dossier temporaire");
        let fichier = config.path().join("sous-dossier").join(super::NOM_FICHIER);
        let choisi = PathBuf::from("/home/enseignant/Évaluations 2026");
        enregistrer(&fichier, Some(&choisi)).expect("enregistrement");
        assert_eq!(lire(&fichier), Some(choisi));
        enregistrer(&fichier, None).expect("oubli");
        assert_eq!(lire(&fichier), None);
        // Oublier deux fois n'est pas une erreur.
        enregistrer(&fichier, None).expect("oubli répété");
    }

    #[test]
    fn un_fichier_vide_ne_designe_aucun_dossier() {
        let config = tempfile::tempdir().expect("dossier temporaire");
        let fichier = config.path().join(super::NOM_FICHIER);
        std::fs::write(&fichier, "  \n").expect("écriture");
        assert_eq!(lire(&fichier), None);
    }
}
