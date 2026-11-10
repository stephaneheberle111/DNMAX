// SPDX-License-Identifier: AGPL-3.0-or-later

//! Rangement du coffre sur le disque : lecture, écriture sans risque de
//! fichier à moitié écrit, et sauvegardes datées.
//!
//! Ce module ne connaît que des octets déjà chiffrés. Le dossier et la date
//! lui sont passés : il ne lit ni l'emplacement du système ni l'horloge.

use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use time::Date;

const NOM_FICHIER_COFFRE: &str = "coffre.dnmax";
const NOM_FICHIER_PROVISOIRE: &str = "coffre.dnmax.provisoire";
const NOM_DOSSIER_SAUVEGARDES: &str = "sauvegardes";
const PREFIXE_SAUVEGARDE: &str = "coffre-";
const SUFFIXE_SAUVEGARDE: &str = ".dnmax";

/// Nombre de sauvegardes quotidiennes conservées.
pub const NOMBRE_SAUVEGARDES_CONSERVEES: usize = 10;

pub fn chemin_coffre(dossier: &Path) -> PathBuf {
    dossier.join(NOM_FICHIER_COFFRE)
}

pub fn coffre_existe(dossier: &Path) -> bool {
    chemin_coffre(dossier).is_file()
}

/// Lit le coffre ; rend `None` s'il n'a pas encore été créé.
///
/// # Errors
///
/// Rend l'erreur du système si le fichier existe mais ne peut pas être lu.
pub fn lire(dossier: &Path) -> io::Result<Option<Vec<u8>>> {
    match fs::read(chemin_coffre(dossier)) {
        Ok(octets) => Ok(Some(octets)),
        Err(erreur) if erreur.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(erreur) => Err(erreur),
    }
}

/// Remplace le coffre par `octets` sans jamais laisser un fichier à moitié écrit.
///
/// Le contenu est d'abord écrit en entier dans un fichier provisoire, forcé
/// sur le disque, puis renommé : une coupure de courant laisse soit l'ancien
/// coffre, soit le nouveau, jamais un mélange.
///
/// # Errors
///
/// Rend l'erreur du système (disque plein, dossier protégé…). L'ancien coffre
/// est alors intact.
pub fn ecrire(dossier: &Path, octets: &[u8]) -> io::Result<()> {
    fs::create_dir_all(dossier)?;
    let provisoire = dossier.join(NOM_FICHIER_PROVISOIRE);
    let mut fichier = creer_fichier_prive(&provisoire)?;
    fichier.write_all(octets)?;
    fichier.sync_all()?;
    drop(fichier);
    fs::rename(&provisoire, chemin_coffre(dossier))
}

/// Crée le coffre, en refusant d'écraser un coffre déjà présent.
///
/// # Errors
///
/// `AlreadyExists` si un coffre est déjà là, sinon l'erreur du système.
pub fn creer(dossier: &Path, octets: &[u8]) -> io::Result<()> {
    if coffre_existe(dossier) {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "un coffre existe déjà",
        ));
    }
    ecrire(dossier, octets)
}

/// Copie le coffre dans le dossier des sauvegardes, une fois par jour, et ne
/// garde que les `nombre_conserve` plus récentes.
///
/// À appeler juste après une ouverture réussie : on sait alors que le fichier
/// copié est sain. Rend `true` si une sauvegarde a été créée.
///
/// # Errors
///
/// Rend l'erreur du système. Une sauvegarde manquée n'altère pas le coffre.
pub fn sauvegarder_du_jour(dossier: &Path, jour: Date, nombre_conserve: usize) -> io::Result<bool> {
    let Some(octets) = lire(dossier)? else {
        return Ok(false);
    };
    let sauvegardes = dossier.join(NOM_DOSSIER_SAUVEGARDES);
    fs::create_dir_all(&sauvegardes)?;
    let nom = format!(
        "{PREFIXE_SAUVEGARDE}{:04}-{:02}-{:02}{SUFFIXE_SAUVEGARDE}",
        jour.year(),
        u8::from(jour.month()),
        jour.day()
    );
    let destination = sauvegardes.join(nom);
    let cree = if destination.exists() {
        false
    } else {
        let mut fichier = creer_fichier_prive(&destination)?;
        fichier.write_all(&octets)?;
        fichier.sync_all()?;
        true
    };
    supprimer_les_plus_anciennes(&sauvegardes, nombre_conserve)?;
    Ok(cree)
}

fn supprimer_les_plus_anciennes(sauvegardes: &Path, nombre_conserve: usize) -> io::Result<()> {
    let mut noms: Vec<String> = fs::read_dir(sauvegardes)?
        .filter_map(Result::ok)
        .filter_map(|entree| entree.file_name().into_string().ok())
        // Ne toucher qu'aux fichiers que ce module a lui-même créés.
        .filter(|nom| nom.starts_with(PREFIXE_SAUVEGARDE) && nom.ends_with(SUFFIXE_SAUVEGARDE))
        .collect();
    // La date AAAA-MM-JJ dans le nom fait coïncider l'ordre alphabétique et l'ordre chronologique.
    noms.sort_unstable();
    let en_trop = noms.len().saturating_sub(nombre_conserve);
    for nom in noms.into_iter().take(en_trop) {
        fs::remove_file(sauvegardes.join(nom))?;
    }
    Ok(())
}

/// Crée un fichier que seul le compte de l'enseignant peut lire (sous Unix).
fn creer_fichier_prive(chemin: &Path) -> io::Result<File> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    options.open(chemin)
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::Month;

    fn jour(numero: u8) -> Date {
        Date::from_calendar_date(2026, Month::March, numero).expect("date valide")
    }

    fn noms_des_sauvegardes(dossier: &Path) -> Vec<String> {
        let mut noms: Vec<String> = fs::read_dir(dossier.join(NOM_DOSSIER_SAUVEGARDES))
            .expect("dossier des sauvegardes")
            .map(|entree| {
                entree
                    .expect("entrée")
                    .file_name()
                    .into_string()
                    .expect("nom")
            })
            .collect();
        noms.sort();
        noms
    }

    #[test]
    fn rend_none_quand_le_coffre_n_existe_pas() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        assert_eq!(lire(dossier.path()).expect("lecture"), None);
        assert!(!coffre_existe(dossier.path()));
    }

    #[test]
    fn relit_ce_qui_a_ete_ecrit() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"contenu".to_vec())
        );
    }

    #[test]
    fn cree_le_dossier_s_il_manque() {
        let racine = tempfile::tempdir().expect("dossier temporaire");
        let dossier = racine.path().join("pas").join("encore");
        ecrire(&dossier, b"contenu").expect("écriture");
        assert!(coffre_existe(&dossier));
    }

    #[test]
    fn remplace_le_contenu_et_ne_laisse_pas_de_fichier_provisoire() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"ancien contenu, plus long").expect("écriture");
        ecrire(dossier.path(), b"nouveau").expect("écriture");
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"nouveau".to_vec())
        );
        assert!(!dossier.path().join(NOM_FICHIER_PROVISOIRE).exists());
    }

    #[test]
    fn un_echec_d_ecriture_laisse_l_ancien_coffre_intact() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"ancien").expect("écriture");
        // Un dossier à la place du fichier provisoire empêche la nouvelle écriture d'aboutir.
        fs::create_dir(dossier.path().join(NOM_FICHIER_PROVISOIRE)).expect("obstacle");
        assert!(ecrire(dossier.path(), b"nouveau").is_err());
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"ancien".to_vec())
        );
    }

    #[test]
    fn la_creation_refuse_d_ecraser_un_coffre_existant() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        creer(dossier.path(), b"premier").expect("création");
        let erreur = creer(dossier.path(), b"second").expect_err("refus attendu");
        assert_eq!(erreur.kind(), io::ErrorKind::AlreadyExists);
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"premier".to_vec())
        );
    }

    #[cfg(unix)]
    #[test]
    fn le_coffre_n_est_lisible_que_par_son_proprietaire() {
        use std::os::unix::fs::PermissionsExt;
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        let droits = fs::metadata(chemin_coffre(dossier.path()))
            .expect("métadonnées")
            .permissions()
            .mode();
        assert_eq!(droits & 0o777, 0o600);
    }

    #[test]
    fn ne_sauvegarde_rien_sans_coffre() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        assert!(!sauvegarder_du_jour(dossier.path(), jour(1), 3).expect("sauvegarde"));
    }

    #[test]
    fn cree_une_sauvegarde_datee() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        assert!(sauvegarder_du_jour(dossier.path(), jour(9), 3).expect("sauvegarde"));
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            ["coffre-2026-03-09.dnmax"]
        );
        let copie = dossier
            .path()
            .join(NOM_DOSSIER_SAUVEGARDES)
            .join("coffre-2026-03-09.dnmax");
        assert_eq!(fs::read(copie).expect("lecture"), b"contenu");
    }

    #[test]
    fn ne_refait_pas_la_sauvegarde_du_jour() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"matin").expect("écriture");
        assert!(sauvegarder_du_jour(dossier.path(), jour(9), 3).expect("sauvegarde"));
        ecrire(dossier.path(), b"soir").expect("écriture");
        assert!(!sauvegarder_du_jour(dossier.path(), jour(9), 3).expect("sauvegarde"));
        let copie = dossier
            .path()
            .join(NOM_DOSSIER_SAUVEGARDES)
            .join("coffre-2026-03-09.dnmax");
        assert_eq!(fs::read(copie).expect("lecture"), b"matin");
    }

    #[test]
    fn ne_garde_que_les_plus_recentes() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        for numero in [1, 2, 3, 4, 5] {
            sauvegarder_du_jour(dossier.path(), jour(numero), 3).expect("sauvegarde");
        }
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            [
                "coffre-2026-03-03.dnmax",
                "coffre-2026-03-04.dnmax",
                "coffre-2026-03-05.dnmax"
            ]
        );
    }

    #[test]
    fn ne_supprime_pas_les_fichiers_etrangers_du_dossier_des_sauvegardes() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        let sauvegardes = dossier.path().join(NOM_DOSSIER_SAUVEGARDES);
        fs::create_dir_all(&sauvegardes).expect("dossier");
        fs::write(sauvegardes.join("notes-personnelles.txt"), b"a garder").expect("écriture");
        for numero in [1, 2, 3] {
            sauvegarder_du_jour(dossier.path(), jour(numero), 1).expect("sauvegarde");
        }
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            ["coffre-2026-03-03.dnmax", "notes-personnelles.txt"]
        );
    }
}
