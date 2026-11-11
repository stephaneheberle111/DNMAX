// SPDX-License-Identifier: AGPL-3.0-or-later

//! Lecture d'un fichier d'échange choisi par l'enseignant.

use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

/// Taille au-delà de laquelle un fichier d'échange est refusé sans être lu.
/// Un fichier légitime pèse quelques centaines de kilo-octets.
pub const TAILLE_MAXIMALE_ECHANGE: u64 = 20 * 1024 * 1024;

/// Taille au-delà de laquelle un fichier de transfert est refusé sans être lu.
/// Le coffre d'un enseignant pèse au plus quelques méga-octets.
pub const TAILLE_MAXIMALE_TRANSFERT: u64 = 200 * 1024 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub enum ErreurLecture {
    /// Le fichier dépasse la taille admise.
    TropVolumineux,
    /// Le contenu n'est pas du texte UTF-8.
    PasDuTexte,
    /// Le système a refusé la lecture (fichier disparu, droits insuffisants…).
    Inaccessible(io::ErrorKind),
}

/// Lit un fichier texte en refusant de charger plus de `taille_maximale` octets.
///
/// La limite est appliquée pendant la lecture et non d'après la taille
/// annoncée, qui peut être fausse (fichier spécial, fichier qui grossit).
///
/// # Errors
///
/// Voir [`ErreurLecture`].
pub fn lire_texte_limite(chemin: &Path, taille_maximale: u64) -> Result<String, ErreurLecture> {
    let fichier =
        File::open(chemin).map_err(|erreur| ErreurLecture::Inaccessible(erreur.kind()))?;
    let mut octets = Vec::new();
    fichier
        .take(taille_maximale.saturating_add(1))
        .read_to_end(&mut octets)
        .map_err(|erreur| ErreurLecture::Inaccessible(erreur.kind()))?;
    if u64::try_from(octets.len()).unwrap_or(u64::MAX) > taille_maximale {
        return Err(ErreurLecture::TropVolumineux);
    }
    String::from_utf8(octets).map_err(|_| ErreurLecture::PasDuTexte)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn rend_le_texte_du_fichier() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("envoi.dnmax");
        fs::write(&chemin, "{\"é\":1}").expect("écriture");
        assert_eq!(lire_texte_limite(&chemin, 100), Ok("{\"é\":1}".to_owned()));
    }

    #[test]
    fn accepte_un_fichier_vide() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("vide.dnmax");
        fs::write(&chemin, "").expect("écriture");
        assert_eq!(lire_texte_limite(&chemin, 100), Ok(String::new()));
    }

    #[test]
    fn accepte_un_fichier_exactement_a_la_limite() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("limite.dnmax");
        fs::write(&chemin, "12345").expect("écriture");
        assert_eq!(lire_texte_limite(&chemin, 5), Ok("12345".to_owned()));
    }

    #[test]
    fn refuse_un_fichier_au_dela_de_la_limite() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("gros.dnmax");
        fs::write(&chemin, "123456").expect("écriture");
        assert_eq!(
            lire_texte_limite(&chemin, 5),
            Err(ErreurLecture::TropVolumineux)
        );
    }

    #[test]
    fn refuse_un_contenu_binaire() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let chemin = dossier.path().join("image.dnmax");
        fs::write(&chemin, [0xff, 0xfe, 0x00]).expect("écriture");
        assert_eq!(
            lire_texte_limite(&chemin, 100),
            Err(ErreurLecture::PasDuTexte)
        );
    }

    #[test]
    fn signale_un_fichier_absent() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        assert_eq!(
            lire_texte_limite(&dossier.path().join("absent.dnmax"), 100),
            Err(ErreurLecture::Inaccessible(io::ErrorKind::NotFound))
        );
    }
}
