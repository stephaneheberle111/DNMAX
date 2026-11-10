// SPDX-License-Identifier: AGPL-3.0-or-later

mod export;

use std::borrow::Cow;

use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

const NOM_APPLICATION: &str = "DNMAX";

/// Étiquette que Tauri donne à la fenêtre déclarée dans `tauri.conf.json`.
const ETIQUETTE_FENETRE_PRINCIPALE: &str = "main";

/// En-tête par lequel l'interface transmet le nom de fichier proposé, encodé en pourcents.
const ENTETE_NOM_FICHIER: &str = "x-nom-fichier";

/// Propose à l'enseignant d'enregistrer un fichier produit par l'interface.
///
/// Rend `true` si le fichier a été écrit, `false` si l'enseignant a annulé.
#[tauri::command(async)]
fn enregistrer_fichier(application: AppHandle, requete: Request<'_>) -> Result<bool, String> {
    let contenu = extraire_octets(requete.body())?;
    let nom_propose = requete
        .headers()
        .get(ENTETE_NOM_FICHIER)
        .and_then(|valeur| valeur.to_str().ok())
        .map(decoder_pourcents)
        .unwrap_or_default();

    let choix = application
        .dialog()
        .file()
        .set_file_name(export::nettoyer_nom_fichier(&nom_propose))
        .blocking_save_file();
    let Some(emplacement) = choix else {
        return Ok(false);
    };
    let chemin = emplacement
        .into_path()
        .map_err(|erreur| format!("emplacement inutilisable : {erreur}"))?;
    export::ecrire_export(&chemin, &contenu)
        .map_err(|erreur| format!("écriture impossible : {erreur}"))?;
    Ok(true)
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
        .invoke_handler(tauri::generate_handler![enregistrer_fichier])
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
    use super::{decoder_pourcents, extraire_octets};
    use tauri::ipc::InvokeBody;

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
