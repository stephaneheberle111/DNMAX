// SPDX-License-Identifier: AGPL-3.0-or-later

mod coffre;
mod depot;
mod export;
mod import;

use std::borrow::Cow;
use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

use chacha20poly1305::aead::OsRng;
use serde::Serialize;
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use time::OffsetDateTime;

use coffre::{CoffreOuvert, Entrees, ErreurCoffre};

const NOM_APPLICATION: &str = "DNMAX";

/// Étiquette que Tauri donne à la fenêtre déclarée dans `tauri.conf.json`.
const ETIQUETTE_FENETRE_PRINCIPALE: &str = "main";

/// En-tête par lequel l'interface transmet le nom de fichier proposé, encodé en pourcents.
const ENTETE_NOM_FICHIER: &str = "x-nom-fichier";

/// Propose à l'enseignant d'enregistrer un fichier produit par l'interface.
///
/// Rend `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
#[tauri::command(async)]
fn enregistrer_fichier(
    application: AppHandle,
    dernier_export: State<'_, DernierExport>,
    requete: Request<'_>,
) -> Result<bool, String> {
    let contenu = extraire_octets(requete.body())?;
    let nom_propose = requete
        .headers()
        .get(ENTETE_NOM_FICHIER)
        .and_then(|valeur| valeur.to_str().ok())
        .map(decoder_pourcents)
        .unwrap_or_default();

    let Some(chemin) = demander_emplacement(&application, &nom_propose) else {
        return Ok(false);
    };
    export::ecrire_export(&chemin, &contenu)
        .map_err(|erreur| format!("écriture impossible : {erreur}"))?;
    // Retenu pour pouvoir proposer d'ouvrir le document, sans que la page n'en connaisse le chemin.
    *dernier_export.verrou() = Some(chemin);
    Ok(true)
}

/// Ouvre, avec le logiciel par défaut du système, le dernier document exporté.
///
/// La page ne fournit aucun chemin : seul un fichier que l'enseignant vient
/// d'enregistrer lui-même par la boîte de dialogue peut être ouvert.
#[tauri::command(async)]
fn ouvrir_dernier_export(
    application: AppHandle,
    dernier_export: State<'_, DernierExport>,
) -> Result<(), String> {
    let chemin = dernier_export
        .verrou()
        .clone()
        .ok_or_else(|| "aucun document n'a été exporté".to_owned())?;
    application
        .opener()
        .open_path(chemin.to_string_lossy(), None::<&str>)
        .map_err(|erreur| format!("ouverture impossible : {erreur}"))
}

/// Ouvre la boîte « Enregistrer sous », dans le dossier Documents de
/// l'enseignant quand le système en indique un, et rend l'emplacement choisi.
fn demander_emplacement(application: &AppHandle, nom_propose: &str) -> Option<PathBuf> {
    let mut boite = application
        .dialog()
        .file()
        .set_file_name(export::nettoyer_nom_fichier(nom_propose));
    if let Ok(documents) = application.path().document_dir() {
        boite = boite.set_directory(documents);
    }
    boite.blocking_save_file()?.into_path().ok()
}

/// Coffre déverrouillé pour la session en cours ; `None` tant que l'enseignant n'a pas saisi son mot de passe.
#[derive(Default)]
struct Session(Mutex<Option<CoffreOuvert>>);

impl Session {
    fn verrou(&self) -> MutexGuard<'_, Option<CoffreOuvert>> {
        // Un verrou « empoisonné » signale qu'une autre commande a paniqué ; la valeur
        // protégée reste cohérente (elle n'est remplacée que d'un bloc), on la reprend.
        self.0
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

/// Emplacement du dernier document exporté pendant la session, s'il y en a un.
#[derive(Default)]
struct DernierExport(Mutex<Option<PathBuf>>);

impl DernierExport {
    fn verrou(&self) -> MutexGuard<'_, Option<PathBuf>> {
        self.0
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

/// Erreur rendue à l'interface : un code stable, que l'affichage traduit en message.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum ErreurCommande {
    MotDePasseTropCourt,
    AccesRefuse,
    FichierIllisible,
    VersionInconnue,
    CoffreDejaPresent,
    CoffreAbsent,
    CoffreVerrouille,
    DisqueInaccessible,
    FichierTropVolumineux,
    SauvegardeInconnue,
    Interne,
}

impl From<ErreurCoffre> for ErreurCommande {
    fn from(erreur: ErreurCoffre) -> Self {
        match erreur {
            ErreurCoffre::MotDePasseTropCourt => Self::MotDePasseTropCourt,
            ErreurCoffre::AccesRefuse => Self::AccesRefuse,
            ErreurCoffre::FichierIllisible => Self::FichierIllisible,
            ErreurCoffre::VersionInconnue(_) => Self::VersionInconnue,
            ErreurCoffre::Interne => Self::Interne,
        }
    }
}

impl From<std::io::Error> for ErreurCommande {
    fn from(erreur: std::io::Error) -> Self {
        if erreur.kind() == std::io::ErrorKind::AlreadyExists {
            Self::CoffreDejaPresent
        } else {
            Self::DisqueInaccessible
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum EtatCoffre {
    Absent,
    Verrouille,
    Ouvert,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CoffreCree {
    code_secours: String,
}

fn dossier_donnees(application: &AppHandle) -> Result<PathBuf, ErreurCommande> {
    application
        .path()
        .app_data_dir()
        .map_err(|_| ErreurCommande::DisqueInaccessible)
}

/// Fait la sauvegarde du jour. Un échec ne doit pas empêcher l'enseignant de
/// travailler : le coffre vient d'être ouvert et il est sain.
fn sauvegarder_apres_ouverture(dossier: &std::path::Path) {
    let aujourd_hui = OffsetDateTime::now_utc().date();
    if let Err(erreur) =
        depot::sauvegarder_du_jour(dossier, aujourd_hui, depot::NOMBRE_SAUVEGARDES_CONSERVEES)
    {
        eprintln!("sauvegarde quotidienne impossible : {erreur}");
    }
}

#[tauri::command(async)]
fn etat_coffre(
    application: AppHandle,
    session: State<'_, Session>,
) -> Result<EtatCoffre, ErreurCommande> {
    if session.verrou().is_some() {
        return Ok(EtatCoffre::Ouvert);
    }
    if depot::coffre_existe(&dossier_donnees(&application)?) {
        Ok(EtatCoffre::Verrouille)
    } else {
        Ok(EtatCoffre::Absent)
    }
}

/// Crée le coffre de l'enseignant et rend le code de secours, à lui montrer une seule fois.
#[tauri::command(async)]
fn creer_coffre(
    application: AppHandle,
    session: State<'_, Session>,
    mot_de_passe: String,
) -> Result<CoffreCree, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let mut session = session.verrou();
    if depot::coffre_existe(&dossier) {
        return Err(ErreurCommande::CoffreDejaPresent);
    }
    let (coffre, code_secours) =
        coffre::creer(&mot_de_passe, coffre::PARAMETRES_PAR_DEFAUT, &mut OsRng)?;
    depot::creer(&dossier, &coffre.sceller(&Entrees::new(), &mut OsRng)?)?;
    *session = Some(coffre);
    Ok(CoffreCree { code_secours })
}

#[tauri::command(async)]
fn ouvrir_coffre(
    application: AppHandle,
    session: State<'_, Session>,
    mot_de_passe: String,
) -> Result<Entrees, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let mut session = session.verrou();
    let fichier = depot::lire(&dossier)?.ok_or(ErreurCommande::CoffreAbsent)?;
    let (coffre, entrees) = coffre::ouvrir(&fichier, &mot_de_passe)?;
    sauvegarder_apres_ouverture(&dossier);
    *session = Some(coffre);
    Ok(entrees)
}

/// Ouvre le coffre avec le code de secours et remplace le mot de passe oublié.
#[tauri::command(async)]
fn ouvrir_coffre_par_secours(
    application: AppHandle,
    session: State<'_, Session>,
    code_secours: String,
    nouveau_mot_de_passe: String,
) -> Result<Entrees, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let mut session = session.verrou();
    let fichier = depot::lire(&dossier)?.ok_or(ErreurCommande::CoffreAbsent)?;
    let (coffre, entrees) =
        coffre::ouvrir_par_secours(&fichier, &code_secours, &nouveau_mot_de_passe, &mut OsRng)?;
    // La sauvegarde précède la réécriture : elle garde le coffre tel qu'il était avant le changement.
    sauvegarder_apres_ouverture(&dossier);
    depot::ecrire(&dossier, &coffre.sceller(&entrees, &mut OsRng)?)?;
    *session = Some(coffre);
    Ok(entrees)
}

/// Remplace le mot de passe du coffre ouvert, après vérification de l'ancien.
#[tauri::command(async)]
fn changer_mot_de_passe(
    application: AppHandle,
    session: State<'_, Session>,
    ancien_mot_de_passe: String,
    nouveau_mot_de_passe: String,
) -> Result<(), ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let mut session = session.verrou();
    if session.is_none() {
        return Err(ErreurCommande::CoffreVerrouille);
    }
    let fichier = depot::lire(&dossier)?.ok_or(ErreurCommande::CoffreAbsent)?;
    let (coffre, octets) = coffre::changer_mot_de_passe(
        &fichier,
        &ancien_mot_de_passe,
        &nouveau_mot_de_passe,
        &mut OsRng,
    )?;
    depot::ecrire(&dossier, &octets)?;
    *session = Some(coffre);
    Ok(())
}

/// Vérifie le mot de passe du coffre ouvert, sans rien changer.
///
/// Sert quand l'interface doit s'assurer que c'est bien l'enseignant qui est
/// devant l'écran (avant d'activer le module Élèves, par exemple).
#[tauri::command(async)]
fn verifier_mot_de_passe(
    application: AppHandle,
    session: State<'_, Session>,
    mot_de_passe: String,
) -> Result<(), ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let session = session.verrou();
    if session.is_none() {
        return Err(ErreurCommande::CoffreVerrouille);
    }
    let fichier = depot::lire(&dossier)?.ok_or(ErreurCommande::CoffreAbsent)?;
    coffre::ouvrir(&fichier, &mot_de_passe)?;
    Ok(())
}

/// Referme le coffre : la clé quitte la mémoire et le mot de passe devra être
/// saisi de nouveau. L'interface écrit ce qui est en attente avant d'appeler
/// cette commande ; un enregistrement plus tardif serait refusé.
#[tauri::command(async)]
fn verrouiller_coffre(session: State<'_, Session>) {
    *session.verrou() = None;
}

/// Relit le contenu du coffre déjà ouvert (après un rechargement de la page, par exemple).
#[tauri::command(async)]
fn lire_coffre(
    application: AppHandle,
    session: State<'_, Session>,
) -> Result<Entrees, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let session = session.verrou();
    let coffre = session.as_ref().ok_or(ErreurCommande::CoffreVerrouille)?;
    let fichier = depot::lire(&dossier)?.ok_or(ErreurCommande::CoffreAbsent)?;
    Ok(coffre.relire(&fichier)?)
}

/// Remplace le contenu du coffre par `entrees`, chiffré.
#[tauri::command(async)]
fn enregistrer_coffre(
    application: AppHandle,
    session: State<'_, Session>,
    entrees: Entrees,
) -> Result<(), ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let session = session.verrou();
    let coffre = session.as_ref().ok_or(ErreurCommande::CoffreVerrouille)?;
    depot::ecrire(&dossier, &coffre.sceller(&entrees, &mut OsRng)?)?;
    Ok(())
}

/// Liste les sauvegardes du coffre, de la plus récente à la plus ancienne.
#[tauri::command(async)]
fn lister_sauvegardes(
    application: AppHandle,
    session: State<'_, Session>,
) -> Result<Vec<depot::SauvegardeDisponible>, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    if session.verrou().is_none() {
        return Err(ErreurCommande::CoffreVerrouille);
    }
    depot::lister_sauvegardes(&dossier).map_err(|_| ErreurCommande::DisqueInaccessible)
}

/// Traduit l'échec de lecture d'une sauvegarde : un nom absent de la liste est
/// distingué d'un disque en panne.
fn erreur_lecture_sauvegarde(erreur: &std::io::Error) -> ErreurCommande {
    if erreur.kind() == std::io::ErrorKind::NotFound {
        ErreurCommande::SauvegardeInconnue
    } else {
        ErreurCommande::DisqueInaccessible
    }
}

/// Remplace le coffre par la sauvegarde nommée `nom`, après avoir mis le
/// coffre actuel de côté dans `sauvegardes/`.
///
/// `nom` doit être l'un des noms rendus par `lister_sauvegardes` : il n'est
/// jamais traité comme un chemin. La session est ensuite verrouillée : la
/// sauvegarde s'ouvre avec le mot de passe en vigueur le jour où elle a été
/// faite, que l'interface doit redemander. Cela empêche aussi un enregistrement
/// encore en attente dans la page d'écraser le coffre restauré.
#[tauri::command(async)]
fn restaurer_sauvegarde(
    application: AppHandle,
    session: State<'_, Session>,
    nom: String,
) -> Result<(), ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let mut session = session.verrou();
    if session.is_none() {
        return Err(ErreurCommande::CoffreVerrouille);
    }
    let octets = depot::lire_sauvegarde(&dossier, &nom)
        .map_err(|erreur| erreur_lecture_sauvegarde(&erreur))?;
    // Une sauvegarde endommagée ne doit pas remplacer un coffre sain.
    coffre::verifier_forme(&octets)?;
    depot::restaurer(&dossier, &octets, OffsetDateTime::now_utc())
        .map_err(|_| ErreurCommande::DisqueInaccessible)?;
    *session = None;
    Ok(())
}

/// Extension des fichiers d'échange entre enseignants, sans le point.
const EXTENSION_ECHANGE: &str = "dnmax";

/// Fait choisir un fichier d'échange à l'enseignant et rend son texte.
///
/// Rend `None` si l'enseignant a annulé. Le contenu n'est pas interprété ici :
/// l'interface le valide avant d'en faire quoi que ce soit.
#[tauri::command(async)]
fn ouvrir_fichier_echange(application: AppHandle) -> Result<Option<String>, ErreurCommande> {
    let choix = application
        .dialog()
        .file()
        .add_filter("Fichier d'échange DNMAX", &[EXTENSION_ECHANGE])
        .blocking_pick_file();
    let Some(emplacement) = choix else {
        return Ok(None);
    };
    let chemin = emplacement
        .into_path()
        .map_err(|_| ErreurCommande::DisqueInaccessible)?;
    match import::lire_texte_limite(&chemin, import::TAILLE_MAXIMALE_ECHANGE) {
        Ok(texte) => Ok(Some(texte)),
        Err(import::ErreurLecture::TropVolumineux) => Err(ErreurCommande::FichierTropVolumineux),
        Err(import::ErreurLecture::PasDuTexte) => Err(ErreurCommande::FichierIllisible),
        Err(import::ErreurLecture::Inaccessible(_)) => Err(ErreurCommande::DisqueInaccessible),
    }
}

/// Nom proposé pour le fichier de transfert vers un autre ordinateur.
const NOM_FICHIER_TRANSFERT: &str = "mes-donnees-dnmax.dnmax";

/// Fait enregistrer une copie complète du coffre, pour l'emporter sur un autre
/// ordinateur. La copie reste chiffrée : elle s'ouvre avec le mot de passe (ou
/// le code de secours) de l'enseignant.
///
/// Rend `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
#[tauri::command(async)]
fn exporter_coffre(
    application: AppHandle,
    session: State<'_, Session>,
) -> Result<bool, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    // Le verrou garantit qu'aucun enregistrement n'est en cours pendant la copie.
    let _session = session.verrou();
    let coffre = depot::lire(&dossier)?.ok_or(ErreurCommande::CoffreAbsent)?;
    let Some(chemin) = demander_emplacement(&application, NOM_FICHIER_TRANSFERT) else {
        return Ok(false);
    };
    export::ecrire_export(&chemin, &coffre)?;
    Ok(true)
}

/// Installe sur cet ordinateur un fichier de transfert choisi par l'enseignant.
///
/// N'est possible que sur une installation sans données : un coffre déjà
/// présent n'est jamais remplacé. Rend `true` si le coffre a été installé,
/// `false` si l'enseignant a annulé.
#[tauri::command(async)]
fn installer_coffre(
    application: AppHandle,
    session: State<'_, Session>,
) -> Result<bool, ErreurCommande> {
    let dossier = dossier_donnees(&application)?;
    let _session = session.verrou();
    if depot::coffre_existe(&dossier) {
        return Err(ErreurCommande::CoffreDejaPresent);
    }
    let choix = application
        .dialog()
        .file()
        .add_filter("Fichier de transfert DNMAX", &[EXTENSION_ECHANGE])
        .blocking_pick_file();
    let Some(emplacement) = choix else {
        return Ok(false);
    };
    let chemin = emplacement
        .into_path()
        .map_err(|_| ErreurCommande::DisqueInaccessible)?;
    let texte = match import::lire_texte_limite(&chemin, import::TAILLE_MAXIMALE_TRANSFERT) {
        Ok(texte) => texte,
        Err(import::ErreurLecture::TropVolumineux) => {
            return Err(ErreurCommande::FichierTropVolumineux)
        }
        Err(import::ErreurLecture::PasDuTexte) => return Err(ErreurCommande::FichierIllisible),
        Err(import::ErreurLecture::Inaccessible(_)) => {
            return Err(ErreurCommande::DisqueInaccessible)
        }
    };
    coffre::verifier_forme(texte.as_bytes())?;
    depot::creer(&dossier, texte.as_bytes())?;
    Ok(true)
}

/// Chiffre le texte d'un fichier d'échange sous le mot de passe convenu entre les
/// deux enseignants, puis le fait enregistrer là où l'expéditeur le décide.
///
/// Rend `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
#[tauri::command(async)]
fn enregistrer_fichier_protege(
    application: AppHandle,
    nom_propose: String,
    texte: String,
    mot_de_passe: String,
) -> Result<bool, ErreurCommande> {
    let chiffre = coffre::proteger_texte(
        &texte,
        &mot_de_passe,
        coffre::PARAMETRES_PAR_DEFAUT,
        &mut OsRng,
    )?;
    let Some(chemin) = demander_emplacement(&application, &nom_propose) else {
        return Ok(false);
    };
    export::ecrire_export(&chemin, &chiffre)?;
    Ok(true)
}

/// Chiffre le texte d'un paquet d'échange sous le mot de passe convenu entre les
/// deux enseignants et le rend tel quel, sans l'enregistrer : c'est le même
/// texte que celui d'un fichier protégé, envoyé ici par l'échange en direct.
#[tauri::command(async)]
fn proteger_texte_echange(texte: String, mot_de_passe: String) -> Result<String, ErreurCommande> {
    let chiffre = coffre::proteger_texte(
        &texte,
        &mot_de_passe,
        coffre::PARAMETRES_PAR_DEFAUT,
        &mut OsRng,
    )?;
    // Le coffre est écrit en JSON, donc en UTF-8 : un échec ici serait une erreur interne.
    String::from_utf8(chiffre).map_err(|_| ErreurCommande::Interne)
}

/// Déchiffre le texte d'un fichier d'échange protégé, déjà lu par l'interface.
#[tauri::command(async)]
fn dechiffrer_fichier_echange(
    fichier: String,
    mot_de_passe: String,
) -> Result<String, ErreurCommande> {
    Ok(coffre::lire_texte_protege(
        fichier.as_bytes(),
        &mot_de_passe,
    )?)
}

/// Rend les octets transmis par l'interface.
///
/// Selon le système, Tauri livre un même envoi binaire soit tel quel, soit
/// sous forme de liste JSON de nombres (cas de Linux) : les deux sont acceptés.
fn extraire_octets(corps: &InvokeBody) -> Result<Cow<'_, [u8]>, String> {
    match corps {
        InvokeBody::Raw(octets) => Ok(Cow::Borrowed(octets)),
        InvokeBody::Json(valeur) => serde_json::from_value::<Vec<u8>>(valeur.clone())
            .map(Cow::Owned)
            .map_err(|_| "le contenu du fichier doit être transmis en octets".to_owned()),
    }
}

/// Décode une valeur encodée en pourcents (`%C3%A9` → `é`).
///
/// Une séquence invalide est laissée telle quelle : le nom est de toute façon
/// nettoyé ensuite, et un nom un peu abîmé vaut mieux qu'un export refusé.
fn decoder_pourcents(valeur: &str) -> String {
    let octets = valeur.as_bytes();
    let mut decode = Vec::with_capacity(octets.len());
    let mut position = 0;
    while position < octets.len() {
        let hexadecimal = (octets[position] == b'%')
            .then(|| valeur.get(position + 1..position + 3))
            .flatten()
            .and_then(|paire| u8::from_str_radix(paire, 16).ok());
        if let Some(octet) = hexadecimal {
            decode.push(octet);
            position += 3;
        } else {
            decode.push(octets[position]);
            position += 1;
        }
    }
    String::from_utf8_lossy(&decode).into_owned()
}

/// Démarre l'application de bureau.
///
/// # Panics
///
/// S'arrête si la fenêtre ne peut pas être créée (bibliothèque d'affichage
/// absente du système, par exemple) : rien d'utile n'est possible sans elle.
pub fn lancer() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Session::default())
        .manage(DernierExport::default())
        .invoke_handler(tauri::generate_handler![
            enregistrer_fichier,
            ouvrir_dernier_export,
            etat_coffre,
            creer_coffre,
            ouvrir_coffre,
            ouvrir_coffre_par_secours,
            lire_coffre,
            enregistrer_coffre,
            ouvrir_fichier_echange,
            enregistrer_fichier_protege,
            proteger_texte_echange,
            dechiffrer_fichier_echange,
            exporter_coffre,
            installer_coffre,
            changer_mot_de_passe,
            lister_sauvegardes,
            restaurer_sauvegarde,
            verifier_mot_de_passe,
            verrouiller_coffre
        ])
        .setup(|application| {
            // Le titre de la page ne remonte pas jusqu'à la fenêtre : la version y est donc inscrite ici.
            if let Some(fenetre) = application.get_webview_window(ETIQUETTE_FENETRE_PRINCIPALE) {
                let version = &application.package_info().version;
                fenetre.set_title(&format!("{NOM_APPLICATION} {version}"))?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("impossible de démarrer l'application DNMAX");
}

#[cfg(test)]
mod tests {
    use super::{decoder_pourcents, erreur_lecture_sauvegarde, extraire_octets, ErreurCommande};
    use std::io;
    use tauri::ipc::InvokeBody;

    #[test]
    fn une_sauvegarde_absente_de_la_liste_est_inconnue() {
        let erreur = io::Error::new(io::ErrorKind::NotFound, "sauvegarde inconnue");
        assert_eq!(
            erreur_lecture_sauvegarde(&erreur),
            ErreurCommande::SauvegardeInconnue
        );
    }

    #[test]
    fn une_sauvegarde_illisible_signale_le_disque() {
        let erreur = io::Error::new(io::ErrorKind::PermissionDenied, "refusé");
        assert_eq!(
            erreur_lecture_sauvegarde(&erreur),
            ErreurCommande::DisqueInaccessible
        );
    }

    #[test]
    fn le_code_d_une_sauvegarde_inconnue_est_stable() {
        assert_eq!(
            serde_json::to_value(ErreurCommande::SauvegardeInconnue).expect("sérialisation"),
            serde_json::json!("sauvegarde-inconnue")
        );
    }

    #[test]
    fn accepte_des_octets_bruts() {
        let corps = InvokeBody::Raw(vec![1, 2, 255]);
        assert_eq!(
            extraire_octets(&corps).expect("octets").as_ref(),
            [1, 2, 255]
        );
    }

    #[test]
    fn accepte_une_liste_json_de_nombres() {
        let corps = InvokeBody::Json(serde_json::json!([1, 2, 255]));
        assert_eq!(
            extraire_octets(&corps).expect("octets").as_ref(),
            [1, 2, 255]
        );
    }

    #[test]
    fn accepte_un_contenu_vide() {
        let corps = InvokeBody::Json(serde_json::json!([]));
        assert!(extraire_octets(&corps).expect("octets").is_empty());
    }

    #[test]
    fn refuse_un_nombre_hors_d_un_octet() {
        let corps = InvokeBody::Json(serde_json::json!([1, 256]));
        assert!(extraire_octets(&corps).is_err());
    }

    #[test]
    fn refuse_un_objet_json() {
        let corps = InvokeBody::Json(serde_json::json!({ "octets": [1] }));
        assert!(extraire_octets(&corps).is_err());
    }

    #[test]
    fn decode_les_accents() {
        assert_eq!(
            decoder_pourcents("%C3%89valuation%20S3.docx"),
            "Évaluation S3.docx"
        );
    }

    #[test]
    fn laisse_un_texte_sans_encodage() {
        assert_eq!(decoder_pourcents("fiche.odt"), "fiche.odt");
    }

    #[test]
    fn laisse_une_sequence_invalide_telle_quelle() {
        assert_eq!(decoder_pourcents("100%.xlsx"), "100%.xlsx");
        assert_eq!(decoder_pourcents("a%zzb%4"), "a%zzb%4");
    }

    #[test]
    fn accepte_une_valeur_vide() {
        assert_eq!(decoder_pourcents(""), "");
    }
}
