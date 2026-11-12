// SPDX-License-Identifier: AGPL-3.0-or-later

//! Rangement du coffre sur le disque : lecture, écriture sans risque de
//! fichier à moitié écrit, et sauvegardes datées.
//!
//! Ce module ne connaît que des octets déjà chiffrés. Le dossier et la date
//! lui sont passés : il ne lit ni l'emplacement du système ni l'horloge.

use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use serde::Serialize;
use time::{Date, Month, OffsetDateTime, UtcOffset};

const NOM_FICHIER_COFFRE: &str = "coffre.dnmax";
const NOM_FICHIER_PROVISOIRE: &str = "coffre.dnmax.provisoire";
const NOM_DOSSIER_SAUVEGARDES: &str = "sauvegardes";
const PREFIXE_SAUVEGARDE: &str = "coffre-";
const SUFFIXE_SAUVEGARDE: &str = ".dnmax";
const PREFIXE_MISE_DE_COTE: &str = "avant-restauration-";

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

/// Supprime les sauvegardes quotidiennes au-delà de `nombre_conserve`, puis,
/// une fois la rotation pleine, les copies mises de côté avant une
/// restauration qui sont plus anciennes que la plus ancienne sauvegarde
/// quotidienne gardée.
///
/// Les copies mises de côté ne comptent pas dans les `nombre_conserve` : une
/// restauration ne doit pas chasser une sauvegarde quotidienne. Elles suivent
/// en revanche le même horizon, pour qu'une donnée effacée (un élève, par
/// exemple) ne survive pas indéfiniment dans une copie oubliée.
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
    for nom in noms.iter().take(en_trop) {
        fs::remove_file(sauvegardes.join(nom))?;
    }
    // Tant que la rotation n'est pas pleine, rien ne presse : les copies mises de côté restent.
    if nombre_conserve == 0 || noms.len() < nombre_conserve {
        return Ok(());
    }
    let Some(plus_ancien_jour_garde) = noms
        .get(en_trop)
        .and_then(|nom| analyser_nom(nom))
        .map(|analyse| analyse.jour)
    else {
        return Ok(());
    };
    for entree in fs::read_dir(sauvegardes)?.filter_map(Result::ok) {
        let Ok(nom) = entree.file_name().into_string() else {
            continue;
        };
        let perimee = analyser_nom(&nom).is_some_and(|analyse| {
            analyse.nature == NatureSauvegarde::AvantRestauration
                && analyse.jour < plus_ancien_jour_garde
        });
        if perimee {
            fs::remove_file(entree.path())?;
        }
    }
    Ok(())
}

/// Origine d'une sauvegarde rangée dans `sauvegardes/`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum NatureSauvegarde {
    /// Copie faite à la première ouverture d'un jour d'utilisation.
    Quotidienne,
    /// Coffre tel qu'il était juste avant une restauration.
    AvantRestauration,
}

/// Ce que le nom d'un fichier de sauvegarde dit de lui.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct NomAnalyse {
    nature: NatureSauvegarde,
    jour: Date,
    /// Heure (temps universel) des copies mises de côté, en secondes depuis minuit.
    seconde_du_jour: Option<u32>,
}

/// Une sauvegarde disponible, telle que l'interface la présente.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SauvegardeDisponible {
    /// Nom du fichier : c'est lui que l'interface renvoie pour désigner la sauvegarde.
    pub nom: String,
    pub nature: NatureSauvegarde,
    /// `AAAA-MM-JJ` pour une sauvegarde quotidienne (jour en temps universel),
    /// `AAAA-MM-JJTHH:MM:SSZ` pour une copie mise de côté.
    pub horodatage: String,
    /// Taille en octets.
    pub taille: u64,
}

/// Lit un nombre écrit avec exactement `chiffres` chiffres ASCII.
fn lire_nombre(texte: &str, chiffres: usize) -> Option<u32> {
    if texte.len() != chiffres || !texte.bytes().all(|octet| octet.is_ascii_digit()) {
        return None;
    }
    texte.parse().ok()
}

/// Lit `AAAA-MM-JJ`, en refusant toute date qui n'existe pas au calendrier.
fn lire_jour(texte: &str) -> Option<Date> {
    let mut morceaux = texte.split('-');
    let annee = lire_nombre(morceaux.next()?, 4)?;
    let mois = lire_nombre(morceaux.next()?, 2)?;
    let jour = lire_nombre(morceaux.next()?, 2)?;
    if morceaux.next().is_some() {
        return None;
    }
    let mois = Month::try_from(u8::try_from(mois).ok()?).ok()?;
    Date::from_calendar_date(i32::try_from(annee).ok()?, mois, u8::try_from(jour).ok()?).ok()
}

/// Reconnaît un nom de sauvegarde produit par ce module, et lui seul.
///
/// Liste blanche stricte : `coffre-AAAA-MM-JJ.dnmax` ou
/// `avant-restauration-AAAA-MM-JJ-HHMMSS.dnmax`. Tout autre nom (séparateur
/// de dossier, `..`, date impossible, chiffres en trop) rend `None`.
fn analyser_nom(nom: &str) -> Option<NomAnalyse> {
    let sans_suffixe = nom.strip_suffix(SUFFIXE_SAUVEGARDE)?;
    if let Some(jour) = sans_suffixe.strip_prefix(PREFIXE_SAUVEGARDE) {
        return Some(NomAnalyse {
            nature: NatureSauvegarde::Quotidienne,
            jour: lire_jour(jour)?,
            seconde_du_jour: None,
        });
    }
    let reste = sans_suffixe.strip_prefix(PREFIXE_MISE_DE_COTE)?;
    let (jour, heure) = reste.rsplit_once('-')?;
    let heures = lire_nombre(heure.get(0..2)?, 2)?;
    let minutes = lire_nombre(heure.get(2..4)?, 2)?;
    let secondes = lire_nombre(heure.get(4..)?, 2)?;
    if heures > 23 || minutes > 59 || secondes > 59 {
        return None;
    }
    Some(NomAnalyse {
        nature: NatureSauvegarde::AvantRestauration,
        jour: lire_jour(jour)?,
        seconde_du_jour: Some(heures * 3600 + minutes * 60 + secondes),
    })
}

fn ecrire_horodatage(analyse: &NomAnalyse) -> String {
    let jour = format!(
        "{:04}-{:02}-{:02}",
        analyse.jour.year(),
        u8::from(analyse.jour.month()),
        analyse.jour.day()
    );
    match analyse.seconde_du_jour {
        None => jour,
        Some(secondes) => format!(
            "{jour}T{:02}:{:02}:{:02}Z",
            secondes / 3600,
            secondes / 60 % 60,
            secondes % 60
        ),
    }
}

/// Liste les sauvegardes du dossier, de la plus récente à la plus ancienne.
///
/// Seuls les fichiers ordinaires dont le nom a été produit par ce module sont
/// retenus : un lien symbolique, un sous-dossier ou un fichier déposé à la
/// main sont ignorés. Un dossier de sauvegardes absent donne une liste vide.
///
/// # Errors
///
/// Rend l'erreur du système si le dossier existe mais ne peut pas être lu.
pub fn lister_sauvegardes(dossier: &Path) -> io::Result<Vec<SauvegardeDisponible>> {
    let entrees = match fs::read_dir(dossier.join(NOM_DOSSIER_SAUVEGARDES)) {
        Ok(entrees) => entrees,
        Err(erreur) if erreur.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(erreur) => return Err(erreur),
    };
    let mut trouvees: Vec<(NomAnalyse, SauvegardeDisponible)> = Vec::new();
    for entree in entrees.filter_map(Result::ok) {
        let Ok(nom) = entree.file_name().into_string() else {
            continue;
        };
        let Some(analyse) = analyser_nom(&nom) else {
            continue;
        };
        // `file_type` ne suit pas les liens symboliques : un lien n'est pas une sauvegarde.
        if !entree.file_type().is_ok_and(|genre| genre.is_file()) {
            continue;
        }
        let Ok(metadonnees) = entree.metadata() else {
            continue;
        };
        trouvees.push((
            analyse,
            SauvegardeDisponible {
                nom,
                nature: analyse.nature,
                horodatage: ecrire_horodatage(&analyse),
                taille: metadonnees.len(),
            },
        ));
    }
    // Une copie mise de côté passe avant la sauvegarde quotidienne du même jour,
    // faite plus tôt : à la première ouverture de la journée.
    trouvees.sort_by(|(gauche, _), (droite, _)| {
        (droite.jour, droite.seconde_du_jour).cmp(&(gauche.jour, gauche.seconde_du_jour))
    });
    Ok(trouvees
        .into_iter()
        .map(|(_, sauvegarde)| sauvegarde)
        .collect())
}

/// Lit une sauvegarde désignée par son nom.
///
/// Le nom n'est accepté que s'il figure dans [`lister_sauvegardes`] : aucun
/// chemin fourni par l'interface n'atteint le système de fichiers.
///
/// # Errors
///
/// `NotFound` si le nom n'est pas celui d'une sauvegarde listée, sinon
/// l'erreur du système.
pub fn lire_sauvegarde(dossier: &Path, nom: &str) -> io::Result<Vec<u8>> {
    let connue = lister_sauvegardes(dossier)?
        .into_iter()
        .find(|sauvegarde| sauvegarde.nom == nom)
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "sauvegarde inconnue"))?;
    fs::read(dossier.join(NOM_DOSSIER_SAUVEGARDES).join(connue.nom))
}

/// Met de côté le coffre actuel, puis le remplace par `octets` (une sauvegarde
/// déjà lue et vérifiée).
///
/// La copie mise de côté, `sauvegardes/avant-restauration-AAAA-MM-JJ-HHMMSS.dnmax`
/// (heure universelle de `instant`), est écrite en entier et forcée sur le
/// disque avant que le coffre ne soit touché ; le remplacement passe ensuite
/// par [`ecrire`]. Rend le nom de la copie, ou `None` s'il n'y avait pas de
/// coffre à mettre de côté.
///
/// # Errors
///
/// Rend l'erreur du système. Le coffre actuel est alors intact ; une copie
/// mise de côté a pu être créée, ce qui est sans danger.
pub fn restaurer(
    dossier: &Path,
    octets: &[u8],
    instant: OffsetDateTime,
) -> io::Result<Option<String>> {
    let mise_de_cote = match lire(dossier)? {
        None => None,
        Some(actuel) => {
            let sauvegardes = dossier.join(NOM_DOSSIER_SAUVEGARDES);
            fs::create_dir_all(&sauvegardes)?;
            let universel = instant.to_offset(UtcOffset::UTC);
            let nom = format!(
                "{PREFIXE_MISE_DE_COTE}{:04}-{:02}-{:02}-{:02}{:02}{:02}{SUFFIXE_SAUVEGARDE}",
                universel.year(),
                u8::from(universel.month()),
                universel.day(),
                universel.hour(),
                universel.minute(),
                universel.second()
            );
            let mut fichier = creer_fichier_prive_nouveau(&sauvegardes.join(&nom))?;
            fichier.write_all(&actuel)?;
            fichier.sync_all()?;
            Some(nom)
        }
    };
    ecrire(dossier, octets)?;
    Ok(mise_de_cote)
}

/// Crée un fichier que seul le compte de l'enseignant peut lire (sous Unix).
fn creer_fichier_prive(chemin: &Path) -> io::Result<File> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    ouvrir_en_prive(&mut options, chemin)
}

/// Comme [`creer_fichier_prive`], mais échoue (`AlreadyExists`) plutôt que
/// d'écraser un fichier déjà présent.
fn creer_fichier_prive_nouveau(chemin: &Path) -> io::Result<File> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    ouvrir_en_prive(&mut options, chemin)
}

fn ouvrir_en_prive(options: &mut fs::OpenOptions, chemin: &Path) -> io::Result<File> {
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

    fn instant(numero: u8, heure: u8, minute: u8, seconde: u8) -> OffsetDateTime {
        jour(numero)
            .with_hms(heure, minute, seconde)
            .expect("heure valide")
            .assume_utc()
    }

    fn deposer(dossier: &Path, nom: &str, contenu: &[u8]) {
        let sauvegardes = dossier.join(NOM_DOSSIER_SAUVEGARDES);
        fs::create_dir_all(&sauvegardes).expect("dossier");
        fs::write(sauvegardes.join(nom), contenu).expect("écriture");
    }

    fn noms_listes(dossier: &Path) -> Vec<String> {
        lister_sauvegardes(dossier)
            .expect("liste")
            .into_iter()
            .map(|sauvegarde| sauvegarde.nom)
            .collect()
    }

    #[test]
    fn la_liste_est_vide_sans_dossier_de_sauvegardes() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        assert!(lister_sauvegardes(dossier.path())
            .expect("liste")
            .is_empty());
    }

    #[test]
    fn la_liste_va_de_la_plus_recente_a_la_plus_ancienne() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        deposer(dossier.path(), "coffre-2026-03-02.dnmax", b"a");
        deposer(dossier.path(), "coffre-2026-03-10.dnmax", b"b");
        deposer(
            dossier.path(),
            "avant-restauration-2026-03-10-081500.dnmax",
            b"c",
        );
        deposer(dossier.path(), "coffre-2025-12-31.dnmax", b"d");
        assert_eq!(
            noms_listes(dossier.path()),
            [
                "avant-restauration-2026-03-10-081500.dnmax",
                "coffre-2026-03-10.dnmax",
                "coffre-2026-03-02.dnmax",
                "coffre-2025-12-31.dnmax"
            ]
        );
    }

    #[test]
    fn la_liste_donne_nature_horodatage_et_taille() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        deposer(dossier.path(), "coffre-2026-03-09.dnmax", b"12345");
        deposer(
            dossier.path(),
            "avant-restauration-2026-03-09-140507.dnmax",
            b"12",
        );
        let liste = lister_sauvegardes(dossier.path()).expect("liste");
        assert_eq!(
            liste,
            [
                SauvegardeDisponible {
                    nom: "avant-restauration-2026-03-09-140507.dnmax".to_owned(),
                    nature: NatureSauvegarde::AvantRestauration,
                    horodatage: "2026-03-09T14:05:07Z".to_owned(),
                    taille: 2,
                },
                SauvegardeDisponible {
                    nom: "coffre-2026-03-09.dnmax".to_owned(),
                    nature: NatureSauvegarde::Quotidienne,
                    horodatage: "2026-03-09".to_owned(),
                    taille: 5,
                },
            ]
        );
    }

    #[test]
    fn la_liste_ignore_les_noms_etrangers_et_les_dossiers() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        deposer(dossier.path(), "coffre-2026-03-09.dnmax", b"ok");
        for nom in [
            "notes.txt",
            "coffre-2026-02-30.dnmax",
            "coffre-2026-3-09.dnmax",
            "coffre-2026-03-09.dnmax.provisoire",
            "avant-restauration-2026-03-09-250000.dnmax",
            "avant-restauration-2026-03-09-1200.dnmax",
            "coffre-+026-03-09.dnmax",
        ] {
            deposer(dossier.path(), nom, b"x");
        }
        fs::create_dir(
            dossier
                .path()
                .join(NOM_DOSSIER_SAUVEGARDES)
                .join("coffre-2026-03-10.dnmax"),
        )
        .expect("sous-dossier");
        assert_eq!(noms_listes(dossier.path()), ["coffre-2026-03-09.dnmax"]);
    }

    #[cfg(unix)]
    #[test]
    fn la_liste_ignore_un_lien_symbolique() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let ailleurs = dossier.path().join("ailleurs.txt");
        fs::write(&ailleurs, b"secret").expect("écriture");
        fs::create_dir_all(dossier.path().join(NOM_DOSSIER_SAUVEGARDES)).expect("dossier");
        std::os::unix::fs::symlink(
            &ailleurs,
            dossier
                .path()
                .join(NOM_DOSSIER_SAUVEGARDES)
                .join("coffre-2026-03-09.dnmax"),
        )
        .expect("lien");
        assert!(noms_listes(dossier.path()).is_empty());
    }

    #[test]
    fn lit_une_sauvegarde_listee() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        deposer(dossier.path(), "coffre-2026-03-09.dnmax", b"contenu du 9");
        assert_eq!(
            lire_sauvegarde(dossier.path(), "coffre-2026-03-09.dnmax").expect("lecture"),
            b"contenu du 9"
        );
    }

    #[test]
    fn refuse_un_nom_inconnu_ou_malforme() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"coffre actuel").expect("écriture");
        deposer(dossier.path(), "coffre-2026-03-09.dnmax", b"ok");
        deposer(dossier.path(), "notes.txt", b"pas une sauvegarde");
        for nom in [
            "coffre-2026-03-10.dnmax",
            "notes.txt",
            "../coffre.dnmax",
            "coffre.dnmax",
            "sauvegardes/coffre-2026-03-09.dnmax",
            "./coffre-2026-03-09.dnmax",
            "",
        ] {
            let erreur = lire_sauvegarde(dossier.path(), nom).expect_err(nom);
            assert_eq!(erreur.kind(), io::ErrorKind::NotFound, "{nom}");
        }
    }

    #[test]
    fn la_restauration_met_de_cote_le_coffre_actuel() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"etat actuel").expect("écriture");
        deposer(dossier.path(), "coffre-2026-03-02.dnmax", b"etat du 2");
        let octets = lire_sauvegarde(dossier.path(), "coffre-2026-03-02.dnmax").expect("lecture");

        let mise_de_cote =
            restaurer(dossier.path(), &octets, instant(9, 14, 5, 7)).expect("restauration");

        assert_eq!(
            mise_de_cote.as_deref(),
            Some("avant-restauration-2026-03-09-140507.dnmax")
        );
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"etat du 2".to_vec())
        );
        assert_eq!(
            lire_sauvegarde(dossier.path(), "avant-restauration-2026-03-09-140507.dnmax")
                .expect("copie mise de côté"),
            b"etat actuel"
        );
        assert!(!dossier.path().join(NOM_FICHIER_PROVISOIRE).exists());
    }

    #[test]
    fn la_restauration_sans_coffre_ne_met_rien_de_cote() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let mise_de_cote =
            restaurer(dossier.path(), b"etat du 2", instant(9, 0, 0, 0)).expect("restauration");
        assert_eq!(mise_de_cote, None);
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"etat du 2".to_vec())
        );
    }

    #[test]
    fn un_echec_de_restauration_laisse_le_coffre_actuel_intact() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"etat actuel").expect("écriture");
        fs::create_dir(dossier.path().join(NOM_FICHIER_PROVISOIRE)).expect("obstacle");
        assert!(restaurer(dossier.path(), b"etat du 2", instant(9, 0, 0, 0)).is_err());
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"etat actuel".to_vec())
        );
    }

    #[test]
    fn la_restauration_n_ecrase_pas_une_copie_deja_mise_de_cote() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"etat actuel").expect("écriture");
        deposer(
            dossier.path(),
            "avant-restauration-2026-03-09-000000.dnmax",
            b"copie precedente",
        );
        assert!(restaurer(dossier.path(), b"etat du 2", instant(9, 0, 0, 0)).is_err());
        assert_eq!(
            lire(dossier.path()).expect("lecture"),
            Some(b"etat actuel".to_vec())
        );
        assert_eq!(
            lire_sauvegarde(dossier.path(), "avant-restauration-2026-03-09-000000.dnmax")
                .expect("lecture"),
            b"copie precedente"
        );
    }

    #[test]
    fn les_copies_mises_de_cote_ne_comptent_pas_dans_la_rotation() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        sauvegarder_du_jour(dossier.path(), jour(1), 2).expect("sauvegarde");
        restaurer(dossier.path(), b"contenu", instant(1, 10, 0, 0)).expect("restauration");
        sauvegarder_du_jour(dossier.path(), jour(2), 2).expect("sauvegarde");
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            [
                "avant-restauration-2026-03-01-100000.dnmax",
                "coffre-2026-03-01.dnmax",
                "coffre-2026-03-02.dnmax"
            ]
        );
    }

    #[test]
    fn une_copie_mise_de_cote_part_avec_la_sauvegarde_quotidienne_de_son_jour() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        sauvegarder_du_jour(dossier.path(), jour(1), 2).expect("sauvegarde");
        restaurer(dossier.path(), b"contenu", instant(1, 10, 0, 0)).expect("restauration");
        restaurer(dossier.path(), b"contenu", instant(2, 10, 0, 0)).expect("restauration");
        sauvegarder_du_jour(dossier.path(), jour(2), 2).expect("sauvegarde");
        sauvegarder_du_jour(dossier.path(), jour(3), 2).expect("sauvegarde");
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            [
                "avant-restauration-2026-03-02-100000.dnmax",
                "coffre-2026-03-02.dnmax",
                "coffre-2026-03-03.dnmax"
            ]
        );
    }
}
