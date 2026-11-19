// SPDX-License-Identifier: CECILL-2.1

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

/// Durées de conservation des sauvegardes, en mois, choisies dans Paramètres :
/// une par semaine sur les `mois_hebdomadaires` derniers mois, une par mois
/// sur les `mois_mensuelles` derniers mois. La plus récente est toujours gardée.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolitiqueSauvegardes {
    pub mois_hebdomadaires: u8,
    pub mois_mensuelles: u8,
}

impl PolitiqueSauvegardes {
    pub const PAR_DEFAUT: Self = Self {
        mois_hebdomadaires: 3,
        mois_mensuelles: 12,
    };

    /// Ramène chaque durée entre ses bornes : 1 à 6 mois pour les hebdomadaires, 0 à 24 pour les mensuelles.
    #[must_use]
    pub fn bornee(self) -> Self {
        Self {
            mois_hebdomadaires: self.mois_hebdomadaires.clamp(1, 6),
            mois_mensuelles: self.mois_mensuelles.min(24),
        }
    }
}

/// Nom du fichier de réglage des sauvegardes, dans le dossier de configuration
/// (hors du coffre : l'enveloppe en a besoin avant de l'ouvrir).
pub const NOM_FICHIER_POLITIQUE: &str = "politique-sauvegardes.json";

/// Lit la politique retenue ; un fichier absent ou illisible vaut la politique par défaut.
pub fn lire_politique(fichier: &Path) -> PolitiqueSauvegardes {
    fs::read_to_string(fichier)
        .ok()
        .and_then(|texte| serde_json::from_str::<PolitiqueSauvegardes>(&texte).ok())
        .map_or(
            PolitiqueSauvegardes::PAR_DEFAUT,
            PolitiqueSauvegardes::bornee,
        )
}

/// Retient la politique choisie, bornée.
///
/// # Errors
/// Si le dossier de configuration ne peut pas être créé ou le fichier écrit.
pub fn enregistrer_politique(fichier: &Path, politique: PolitiqueSauvegardes) -> io::Result<()> {
    if let Some(parent) = fichier.parent() {
        fs::create_dir_all(parent)?;
    }
    let texte = serde_json::to_string(&politique.bornee()).map_err(io::Error::other)?;
    fs::write(fichier, texte)
}

/// `jour` reculé de `mois` mois ; le jour du mois est ramené au 28 au plus.
fn reculer_de_mois(jour: Date, mois: u8) -> Date {
    let rang = i32::from(u8::from(jour.month())) - 1 + jour.year() * 12 - i32::from(mois);
    let annee = rang.div_euclid(12);
    let numero = u8::try_from(rang.rem_euclid(12) + 1).unwrap_or(1);
    let mois_cible = Month::try_from(numero).unwrap_or(Month::January);
    Date::from_calendar_date(annee, mois_cible, jour.day().min(28)).unwrap_or(jour)
}

/// Jours des sauvegardes à garder parmi `jours` : la plus récente, la dernière
/// de chaque semaine récente et la dernière de chaque mois récent.
pub fn jours_a_garder(
    jours: &[Date],
    aujourd_hui: Date,
    politique: PolitiqueSauvegardes,
) -> Vec<Date> {
    let politique = politique.bornee();
    let mut tries = jours.to_vec();
    tries.sort_unstable();
    tries.dedup();
    let horizon_semaines = reculer_de_mois(aujourd_hui, politique.mois_hebdomadaires);
    let horizon_mois = reculer_de_mois(aujourd_hui, politique.mois_mensuelles);
    let mut gardes: Vec<Date> = Vec::new();
    for (rang, jour) in tries.iter().enumerate() {
        let suivant = tries.get(rang + 1);
        let derniere = suivant.is_none();
        let fin_de_semaine = suivant
            .is_none_or(|autre| autre.iso_week() != jour.iso_week() || autre.year() != jour.year());
        let fin_de_mois = suivant
            .is_none_or(|autre| autre.month() != jour.month() || autre.year() != jour.year());
        let hebdomadaire = *jour >= horizon_semaines && fin_de_semaine;
        let mensuelle = politique.mois_mensuelles > 0 && *jour >= horizon_mois && fin_de_mois;
        if derniere || hebdomadaire || mensuelle {
            gardes.push(*jour);
        }
    }
    gardes
}

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

/// Copie le coffre dans le dossier des sauvegardes, une fois par jour, puis
/// supprime celles que `politique` ne garde plus.
///
/// À appeler juste après une ouverture réussie : on sait alors que le fichier
/// copié est sain. Rend `true` si une sauvegarde a été créée.
///
/// # Errors
///
/// Rend l'erreur du système. Une sauvegarde manquée n'altère pas le coffre.
pub fn sauvegarder_du_jour(
    dossier: &Path,
    jour: Date,
    politique: PolitiqueSauvegardes,
) -> io::Result<bool> {
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
    supprimer_les_perimees(&sauvegardes, jour, politique)?;
    Ok(cree)
}

/// Supprime les sauvegardes que la politique ne garde plus, puis les copies
/// mises de côté avant une restauration plus anciennes que la plus ancienne
/// sauvegarde gardée, pour qu'une donnée effacée (un étudiant, par exemple)
/// ne survive pas indéfiniment dans une copie oubliée.
fn supprimer_les_perimees(
    sauvegardes: &Path,
    aujourd_hui: Date,
    politique: PolitiqueSauvegardes,
) -> io::Result<()> {
    let noms: Vec<(String, Date)> = fs::read_dir(sauvegardes)?
        .filter_map(Result::ok)
        .filter_map(|entree| entree.file_name().into_string().ok())
        // Ne toucher qu'aux fichiers que ce module a lui-même créés.
        .filter_map(|nom| {
            analyser_nom(&nom)
                .filter(|analyse| analyse.nature == NatureSauvegarde::Quotidienne)
                .map(|analyse| (nom, analyse.jour))
        })
        .collect();
    let jours: Vec<Date> = noms.iter().map(|(_, jour)| *jour).collect();
    let gardes = jours_a_garder(&jours, aujourd_hui, politique);
    for (nom, jour) in &noms {
        if !gardes.contains(jour) {
            fs::remove_file(sauvegardes.join(nom))?;
        }
    }
    let Some(plus_ancien_jour_garde) = gardes.first().copied() else {
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

    const DEFAUT: PolitiqueSauvegardes = PolitiqueSauvegardes::PAR_DEFAUT;

    #[test]
    fn la_politique_se_relit_bornee_et_vaut_le_defaut_sans_fichier() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        let fichier = dossier.path().join("config").join(NOM_FICHIER_POLITIQUE);
        assert_eq!(lire_politique(&fichier), DEFAUT);
        enregistrer_politique(
            &fichier,
            PolitiqueSauvegardes {
                mois_hebdomadaires: 2,
                mois_mensuelles: 30,
            },
        )
        .expect("écriture");
        assert_eq!(
            lire_politique(&fichier),
            PolitiqueSauvegardes {
                mois_hebdomadaires: 2,
                mois_mensuelles: 24
            }
        );
        fs::write(&fichier, "abîmé").expect("écriture");
        assert_eq!(lire_politique(&fichier), DEFAUT);
    }

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
        assert!(!sauvegarder_du_jour(dossier.path(), jour(1), DEFAUT).expect("sauvegarde"));
    }

    #[test]
    fn cree_une_sauvegarde_datee() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        assert!(sauvegarder_du_jour(dossier.path(), jour(9), DEFAUT).expect("sauvegarde"));
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
        assert!(sauvegarder_du_jour(dossier.path(), jour(9), DEFAUT).expect("sauvegarde"));
        ecrire(dossier.path(), b"soir").expect("écriture");
        assert!(!sauvegarder_du_jour(dossier.path(), jour(9), DEFAUT).expect("sauvegarde"));
        let copie = dossier
            .path()
            .join(NOM_DOSSIER_SAUVEGARDES)
            .join("coffre-2026-03-09.dnmax");
        assert_eq!(fs::read(copie).expect("lecture"), b"matin");
    }

    #[test]
    fn ne_garde_que_la_derniere_sauvegarde_de_chaque_semaine() {
        // Le 1er mars 2026 est un dimanche : du 2 au 5, c'est la semaine suivante.
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        for numero in [1, 2, 3, 4, 5] {
            sauvegarder_du_jour(dossier.path(), jour(numero), DEFAUT).expect("sauvegarde");
        }
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            ["coffre-2026-03-01.dnmax", "coffre-2026-03-05.dnmax"]
        );
    }

    #[test]
    fn au_dela_des_semaines_garde_une_sauvegarde_par_mois_puis_plus_rien() {
        let date = |annee: i32, mois: Month, jour: u8| {
            Date::from_calendar_date(annee, mois, jour).expect("date valide")
        };
        let jours = [
            date(2025, Month::January, 10),
            date(2025, Month::June, 3),
            date(2025, Month::June, 24),
            date(2026, Month::January, 5),
            date(2026, Month::January, 7),
            date(2026, Month::March, 2),
        ];
        let gardes = jours_a_garder(&jours, date(2026, Month::March, 2), DEFAUT);
        // Janvier 2025 dépasse les 12 mois ; en juin 2025, seule la dernière du mois reste ;
        // janvier 2026 a plus de 3 mois mais garde sa dernière du mois.
        assert_eq!(
            gardes,
            [
                date(2025, Month::June, 24),
                date(2026, Month::January, 7),
                date(2026, Month::March, 2)
            ]
        );
    }

    #[test]
    fn garde_toujours_la_plus_recente_et_borne_la_politique() {
        let gardes = jours_a_garder(
            &[jour(1)],
            Date::from_calendar_date(2030, Month::March, 1).expect("date valide"),
            PolitiqueSauvegardes {
                mois_hebdomadaires: 0,
                mois_mensuelles: 0,
            },
        );
        assert_eq!(gardes, [jour(1)]);
        assert_eq!(
            PolitiqueSauvegardes {
                mois_hebdomadaires: 9,
                mois_mensuelles: 40
            }
            .bornee(),
            PolitiqueSauvegardes {
                mois_hebdomadaires: 6,
                mois_mensuelles: 24
            }
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
            sauvegarder_du_jour(dossier.path(), jour(numero), DEFAUT).expect("sauvegarde");
        }
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            [
                "coffre-2026-03-01.dnmax",
                "coffre-2026-03-03.dnmax",
                "notes-personnelles.txt"
            ]
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
        sauvegarder_du_jour(dossier.path(), jour(1), DEFAUT).expect("sauvegarde");
        restaurer(dossier.path(), b"contenu", instant(1, 10, 0, 0)).expect("restauration");
        sauvegarder_du_jour(dossier.path(), jour(2), DEFAUT).expect("sauvegarde");
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
    fn une_copie_mise_de_cote_part_quand_sa_periode_n_est_plus_gardee() {
        let dossier = tempfile::tempdir().expect("dossier temporaire");
        ecrire(dossier.path(), b"contenu").expect("écriture");
        let courte = PolitiqueSauvegardes {
            mois_hebdomadaires: 1,
            mois_mensuelles: 0,
        };
        sauvegarder_du_jour(dossier.path(), jour(1), courte).expect("sauvegarde");
        restaurer(dossier.path(), b"contenu", instant(1, 10, 0, 0)).expect("restauration");
        let mai = Date::from_calendar_date(2026, Month::May, 10).expect("date valide");
        sauvegarder_du_jour(dossier.path(), mai, courte).expect("sauvegarde");
        assert_eq!(
            noms_des_sauvegardes(dossier.path()),
            ["coffre-2026-05-10.dnmax"]
        );
    }
}
