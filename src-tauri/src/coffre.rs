// SPDX-License-Identifier: AGPL-3.0-or-later

//! Chiffrement des données de l'enseignant.
//!
//! Ce module ne touche ni au disque ni à l'horloge : il transforme des octets
//! en octets. Le fichier produit est un document JSON dont seules les
//! métadonnées (version, paramètres, sels) sont lisibles.
//!
//! Principe : une clé de données aléatoire chiffre le contenu. Cette clé est
//! elle-même enfermée deux fois, une fois sous le mot de passe et une fois
//! sous le code de secours, de sorte que l'un ou l'autre permet de l'ouvrir
//! et que changer de mot de passe ne demande pas de rechiffrer le contenu.

use std::collections::BTreeMap;

use argon2::{Algorithm, Argon2, Params, Version};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use chacha20poly1305::aead::rand_core::{CryptoRng, RngCore};
use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

/// Données de l'enseignant : une valeur texte par clé.
pub type Entrees = BTreeMap<String, String>;

const FORMAT: &str = "dnmax-coffre";
const VERSION_COURANTE: u32 = 1;

const TAILLE_CLE: usize = 32;
const TAILLE_SEL: usize = 16;
const TAILLE_NONCE: usize = 24;

/// Nombre minimal de caractères d'un mot de passe.
pub const LONGUEUR_MINIMALE_MOT_DE_PASSE: usize = 8;

/// Alphabet du code de secours (base 32 de Crockford) : sans I, L, O ni U, pour être
/// recopié à la main sans erreur. À la saisie, O est lu comme 0, I et L comme 1.
const ALPHABET_SECOURS: &[u8; 32] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LONGUEUR_CODE_SECOURS: usize = 20;
const TAILLE_GROUPE_CODE_SECOURS: usize = 5;

// Étiquettes liées à chaque usage : un bloc chiffré pour un usage ne peut pas être rejoué pour un autre.
const USAGE_MOT_DE_PASSE: &[u8] = b"dnmax-coffre/v1/acces/mot-de-passe";
const USAGE_SECOURS: &[u8] = b"dnmax-coffre/v1/acces/secours";
const USAGE_CONTENU: &[u8] = b"dnmax-coffre/v1/contenu";

/// Coût de la dérivation de clé (Argon2id). Enregistré dans le fichier pour pouvoir évoluer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ParametresDerivation {
    pub memoire_kio: u32,
    pub iterations: u32,
    pub parallelisme: u32,
}

/// Réglage retenu pour les postes des enseignants : 64 Mio, 3 passes.
pub const PARAMETRES_PAR_DEFAUT: ParametresDerivation = ParametresDerivation {
    memoire_kio: 64 * 1024,
    iterations: 3,
    parallelisme: 1,
};

// Bornes acceptées à la lecture : un fichier trafiqué ne doit pas pouvoir
// exiger des gigaoctets de mémoire ni des heures de calcul.
const MEMOIRE_MAXIMALE_KIO: u32 = 1024 * 1024;
const ITERATIONS_MAXIMALES: u32 = 20;
const PARALLELISME_MAXIMAL: u32 = 8;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErreurCoffre {
    /// Le mot de passe choisi est trop court.
    MotDePasseTropCourt,
    /// Mot de passe ou code de secours incorrect.
    AccesRefuse,
    /// Le fichier n'est pas un coffre DNMAX, ou il a été altéré.
    FichierIllisible,
    /// Le fichier vient d'une version plus récente de l'application.
    VersionInconnue(u32),
    /// Échec inattendu d'une primitive de chiffrement.
    Interne,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CleScellee {
    sel: String,
    nonce: String,
    cle: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ContenuScelle {
    nonce: String,
    donnees: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Acces {
    mot_de_passe: CleScellee,
    secours: CleScellee,
}

#[derive(Debug, Serialize, Deserialize)]
struct Fichier {
    format: String,
    version: u32,
    derivation: ParametresDerivation,
    acces: Acces,
    contenu: ContenuScelle,
}

/// En-tête minimal lu avant tout le reste, pour reconnaître une version future
/// dont la structure aurait changé.
#[derive(Debug, Deserialize)]
struct Entete {
    format: String,
    version: u32,
}

/// Coffre déverrouillé : détient la clé de données en mémoire.
pub struct CoffreOuvert {
    cle_donnees: Zeroizing<[u8; TAILLE_CLE]>,
    derivation: ParametresDerivation,
    acces: Acces,
}

/// Crée un coffre vide protégé par `mot_de_passe`.
///
/// Rend le coffre ouvert et le code de secours, à montrer une seule fois à
/// l'enseignant : il n'est conservé nulle part en clair.
///
/// # Errors
///
/// `MotDePasseTropCourt` si le mot de passe compte moins de
/// [`LONGUEUR_MINIMALE_MOT_DE_PASSE`] caractères.
pub fn creer(
    mot_de_passe: &str,
    derivation: ParametresDerivation,
    alea: &mut (impl RngCore + CryptoRng),
) -> Result<(CoffreOuvert, String), ErreurCoffre> {
    verifier_mot_de_passe(mot_de_passe)?;
    let mut cle_donnees = Zeroizing::new([0_u8; TAILLE_CLE]);
    alea.fill_bytes(cle_donnees.as_mut());
    let code_secours = tirer_code_secours(alea);
    let acces = Acces {
        mot_de_passe: sceller_cle(
            &cle_donnees,
            mot_de_passe.as_bytes(),
            USAGE_MOT_DE_PASSE,
            derivation,
            alea,
        )?,
        secours: sceller_cle(
            &cle_donnees,
            normaliser_code_secours(&code_secours).as_bytes(),
            USAGE_SECOURS,
            derivation,
            alea,
        )?,
    };
    let coffre = CoffreOuvert {
        cle_donnees,
        derivation,
        acces,
    };
    Ok((coffre, code_secours))
}

/// Ouvre un coffre avec le mot de passe et rend son contenu.
///
/// # Errors
///
/// `AccesRefuse` si le mot de passe est incorrect, `FichierIllisible` ou
/// `VersionInconnue` si le fichier n'est pas exploitable.
pub fn ouvrir(fichier: &[u8], mot_de_passe: &str) -> Result<(CoffreOuvert, Entrees), ErreurCoffre> {
    let fichier = analyser(fichier)?;
    let cle_donnees = desceller_cle(
        &fichier.acces.mot_de_passe,
        mot_de_passe.as_bytes(),
        USAGE_MOT_DE_PASSE,
        fichier.derivation,
    )?;
    let entrees = desceller_contenu(&cle_donnees, &fichier.contenu)?;
    let coffre = CoffreOuvert {
        cle_donnees,
        derivation: fichier.derivation,
        acces: fichier.acces,
    };
    Ok((coffre, entrees))
}

/// Ouvre un coffre avec le code de secours et le protège par un nouveau mot de passe.
///
/// Le code de secours reste valable. L'appelant doit réécrire le coffre
/// (voir [`CoffreOuvert::sceller`]) pour que le nouveau mot de passe prenne effet.
///
/// # Errors
///
/// `AccesRefuse` si le code est incorrect, `MotDePasseTropCourt` si le nouveau
/// mot de passe est trop court, `FichierIllisible` ou `VersionInconnue` si le
/// fichier n'est pas exploitable.
pub fn ouvrir_par_secours(
    fichier: &[u8],
    code_secours: &str,
    nouveau_mot_de_passe: &str,
    alea: &mut (impl RngCore + CryptoRng),
) -> Result<(CoffreOuvert, Entrees), ErreurCoffre> {
    verifier_mot_de_passe(nouveau_mot_de_passe)?;
    let fichier = analyser(fichier)?;
    let cle_donnees = desceller_cle(
        &fichier.acces.secours,
        normaliser_code_secours(code_secours).as_bytes(),
        USAGE_SECOURS,
        fichier.derivation,
    )?;
    let entrees = desceller_contenu(&cle_donnees, &fichier.contenu)?;
    let acces = Acces {
        mot_de_passe: sceller_cle(
            &cle_donnees,
            nouveau_mot_de_passe.as_bytes(),
            USAGE_MOT_DE_PASSE,
            fichier.derivation,
            alea,
        )?,
        secours: fichier.acces.secours,
    };
    let coffre = CoffreOuvert {
        cle_donnees,
        derivation: fichier.derivation,
        acces,
    };
    Ok((coffre, entrees))
}

impl CoffreOuvert {
    /// Produit le fichier chiffré contenant `entrees`.
    ///
    /// # Errors
    ///
    /// `Interne` si le chiffrement échoue, ce qui ne doit pas arriver.
    pub fn sceller(
        &self,
        entrees: &Entrees,
        alea: &mut (impl RngCore + CryptoRng),
    ) -> Result<Vec<u8>, ErreurCoffre> {
        let clair = Zeroizing::new(serde_json::to_vec(entrees).map_err(|_| ErreurCoffre::Interne)?);
        let mut nonce = [0_u8; TAILLE_NONCE];
        alea.fill_bytes(&mut nonce);
        let donnees = XChaCha20Poly1305::new(self.cle_donnees.as_ref().into())
            .encrypt(
                XNonce::from_slice(&nonce),
                Payload {
                    msg: clair.as_slice(),
                    aad: USAGE_CONTENU,
                },
            )
            .map_err(|_| ErreurCoffre::Interne)?;
        let fichier = Fichier {
            format: FORMAT.to_owned(),
            version: VERSION_COURANTE,
            derivation: self.derivation,
            acces: self.acces.clone(),
            contenu: ContenuScelle {
                nonce: BASE64.encode(nonce),
                donnees: BASE64.encode(donnees),
            },
        };
        serde_json::to_vec(&fichier).map_err(|_| ErreurCoffre::Interne)
    }

    /// Relit le contenu d'un fichier avec la clé déjà en mémoire, sans redemander le mot de passe.
    ///
    /// # Errors
    ///
    /// `FichierIllisible` si le fichier a été altéré ou appartient à un autre coffre.
    pub fn relire(&self, fichier: &[u8]) -> Result<Entrees, ErreurCoffre> {
        desceller_contenu(&self.cle_donnees, &analyser(fichier)?.contenu)
    }
}

/// Clé sous laquelle un texte protégé est rangé dans son coffre.
const CLE_TEXTE_PROTEGE: &str = "contenu";

/// Chiffre un texte sous un mot de passe, pour un fichier à transmettre.
///
/// Le résultat a le format d'un coffre : il s'ouvre avec [`lire_texte_protege`].
/// Le code de secours du coffre n'est pas rendu : pour un fichier transmis,
/// seul le mot de passe convenu entre les deux enseignants doit l'ouvrir.
///
/// # Errors
///
/// `MotDePasseTropCourt` si le mot de passe est trop court.
pub fn proteger_texte(
    texte: &str,
    mot_de_passe: &str,
    derivation: ParametresDerivation,
    alea: &mut (impl RngCore + CryptoRng),
) -> Result<Vec<u8>, ErreurCoffre> {
    let (coffre, _code_secours) = creer(mot_de_passe, derivation, alea)?;
    let entrees = Entrees::from([(CLE_TEXTE_PROTEGE.to_owned(), texte.to_owned())]);
    coffre.sceller(&entrees, alea)
}

/// Déchiffre un texte produit par [`proteger_texte`].
///
/// # Errors
///
/// `AccesRefuse` si le mot de passe est incorrect, `FichierIllisible` ou
/// `VersionInconnue` si le fichier n'est pas exploitable.
pub fn lire_texte_protege(fichier: &[u8], mot_de_passe: &str) -> Result<String, ErreurCoffre> {
    let (_coffre, mut entrees) = ouvrir(fichier, mot_de_passe)?;
    entrees
        .remove(CLE_TEXTE_PROTEGE)
        .ok_or(ErreurCoffre::FichierIllisible)
}

fn verifier_mot_de_passe(mot_de_passe: &str) -> Result<(), ErreurCoffre> {
    if mot_de_passe.chars().count() < LONGUEUR_MINIMALE_MOT_DE_PASSE {
        return Err(ErreurCoffre::MotDePasseTropCourt);
    }
    Ok(())
}

fn analyser(fichier: &[u8]) -> Result<Fichier, ErreurCoffre> {
    let entete: Entete =
        serde_json::from_slice(fichier).map_err(|_| ErreurCoffre::FichierIllisible)?;
    if entete.format != FORMAT {
        return Err(ErreurCoffre::FichierIllisible);
    }
    if entete.version != VERSION_COURANTE {
        return Err(ErreurCoffre::VersionInconnue(entete.version));
    }
    let fichier: Fichier =
        serde_json::from_slice(fichier).map_err(|_| ErreurCoffre::FichierIllisible)?;
    let derivation = fichier.derivation;
    if derivation.memoire_kio > MEMOIRE_MAXIMALE_KIO
        || derivation.iterations > ITERATIONS_MAXIMALES
        || derivation.parallelisme > PARALLELISME_MAXIMAL
    {
        return Err(ErreurCoffre::FichierIllisible);
    }
    Ok(fichier)
}

/// Dérive une clé de chiffrement à partir d'un secret saisi par l'enseignant.
fn deriver_cle(
    secret: &[u8],
    sel: &[u8],
    derivation: ParametresDerivation,
) -> Result<Zeroizing<[u8; TAILLE_CLE]>, ErreurCoffre> {
    let parametres = Params::new(
        derivation.memoire_kio,
        derivation.iterations,
        derivation.parallelisme,
        Some(TAILLE_CLE),
    )
    .map_err(|_| ErreurCoffre::FichierIllisible)?;
    let mut cle = Zeroizing::new([0_u8; TAILLE_CLE]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, parametres)
        .hash_password_into(secret, sel, cle.as_mut())
        .map_err(|_| ErreurCoffre::FichierIllisible)?;
    Ok(cle)
}

fn sceller_cle(
    cle_donnees: &[u8; TAILLE_CLE],
    secret: &[u8],
    usage: &[u8],
    derivation: ParametresDerivation,
    alea: &mut (impl RngCore + CryptoRng),
) -> Result<CleScellee, ErreurCoffre> {
    let mut sel = [0_u8; TAILLE_SEL];
    alea.fill_bytes(&mut sel);
    let mut nonce = [0_u8; TAILLE_NONCE];
    alea.fill_bytes(&mut nonce);
    let cle_derivee = deriver_cle(secret, &sel, derivation).map_err(|_| ErreurCoffre::Interne)?;
    let cle = XChaCha20Poly1305::new(cle_derivee.as_ref().into())
        .encrypt(
            XNonce::from_slice(&nonce),
            Payload {
                msg: cle_donnees,
                aad: usage,
            },
        )
        .map_err(|_| ErreurCoffre::Interne)?;
    Ok(CleScellee {
        sel: BASE64.encode(sel),
        nonce: BASE64.encode(nonce),
        cle: BASE64.encode(cle),
    })
}

fn desceller_cle(
    scellee: &CleScellee,
    secret: &[u8],
    usage: &[u8],
    derivation: ParametresDerivation,
) -> Result<Zeroizing<[u8; TAILLE_CLE]>, ErreurCoffre> {
    let sel = decoder(&scellee.sel)?;
    let nonce = decoder_nonce(&scellee.nonce)?;
    let chiffre = decoder(&scellee.cle)?;
    let cle_derivee = deriver_cle(secret, &sel, derivation)?;
    // Un échec ici signifie que le secret saisi n'est pas le bon (ou que le bloc a été altéré,
    // ce qui est indiscernable) : c'est le seul endroit où l'on répond « accès refusé ».
    let clair = Zeroizing::new(
        XChaCha20Poly1305::new(cle_derivee.as_ref().into())
            .decrypt(
                XNonce::from_slice(&nonce),
                Payload {
                    msg: chiffre.as_slice(),
                    aad: usage,
                },
            )
            .map_err(|_| ErreurCoffre::AccesRefuse)?,
    );
    let mut cle_donnees = Zeroizing::new([0_u8; TAILLE_CLE]);
    if clair.len() != TAILLE_CLE {
        return Err(ErreurCoffre::FichierIllisible);
    }
    cle_donnees.copy_from_slice(&clair);
    Ok(cle_donnees)
}

fn desceller_contenu(
    cle_donnees: &[u8; TAILLE_CLE],
    contenu: &ContenuScelle,
) -> Result<Entrees, ErreurCoffre> {
    let nonce = decoder_nonce(&contenu.nonce)?;
    let chiffre = decoder(&contenu.donnees)?;
    let clair = Zeroizing::new(
        XChaCha20Poly1305::new(cle_donnees.into())
            .decrypt(
                XNonce::from_slice(&nonce),
                Payload {
                    msg: chiffre.as_slice(),
                    aad: USAGE_CONTENU,
                },
            )
            .map_err(|_| ErreurCoffre::FichierIllisible)?,
    );
    serde_json::from_slice(&clair).map_err(|_| ErreurCoffre::FichierIllisible)
}

fn decoder(texte: &str) -> Result<Vec<u8>, ErreurCoffre> {
    BASE64
        .decode(texte)
        .map_err(|_| ErreurCoffre::FichierIllisible)
}

fn decoder_nonce(texte: &str) -> Result<[u8; TAILLE_NONCE], ErreurCoffre> {
    decoder(texte)?
        .try_into()
        .map_err(|_| ErreurCoffre::FichierIllisible)
}

fn tirer_code_secours(alea: &mut (impl RngCore + CryptoRng)) -> String {
    let mut octets = [0_u8; LONGUEUR_CODE_SECOURS];
    alea.fill_bytes(&mut octets);
    let symboles: Vec<char> = octets
        .iter()
        // L'alphabet compte 32 symboles : garder 5 bits par octet ne biaise pas le tirage.
        .map(|octet| char::from(ALPHABET_SECOURS[usize::from(octet & 0b1_1111)]))
        .collect();
    symboles
        .chunks(TAILLE_GROUPE_CODE_SECOURS)
        .map(|groupe| groupe.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join("-")
}

/// Ramène un code de secours saisi à sa forme canonique : majuscules, sans
/// espaces ni tirets, lettres ambiguës ramenées au chiffre qu'elles imitent,
/// pour tolérer la façon dont il a été recopié.
fn normaliser_code_secours(code: &str) -> String {
    code.chars()
        .filter(|caractere| !caractere.is_whitespace() && *caractere != '-')
        .flat_map(char::to_uppercase)
        .map(|caractere| match caractere {
            'O' => '0',
            'I' | 'L' => '1',
            autre => autre,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand_chacha::rand_core::SeedableRng;
    use rand_chacha::ChaCha20Rng;

    /// Coût minimal : les tests vérifient la logique, pas la résistance.
    const DERIVATION_DE_TEST: ParametresDerivation = ParametresDerivation {
        memoire_kio: 8,
        iterations: 1,
        parallelisme: 1,
    };
    const MOT_DE_PASSE: &str = "tabouret-en-frêne";

    fn alea() -> ChaCha20Rng {
        ChaCha20Rng::seed_from_u64(7)
    }

    fn entrees_exemple() -> Entrees {
        Entrees::from([
            (
                "dnmade.fiches".to_owned(),
                "[{\"titre\":\"Évaluation S3\"}]".to_owned(),
            ),
            ("dnmade.promos".to_owned(), "[\"Élève fictif\"]".to_owned()),
        ])
    }

    fn coffre_scelle() -> (Vec<u8>, String) {
        let mut alea = alea();
        let (coffre, code) = creer(MOT_DE_PASSE, DERIVATION_DE_TEST, &mut alea).expect("création");
        let fichier = coffre
            .sceller(&entrees_exemple(), &mut alea)
            .expect("scellement");
        (fichier, code)
    }

    #[test]
    fn rend_le_contenu_avec_le_bon_mot_de_passe() {
        let (fichier, _) = coffre_scelle();
        let (_, entrees) = ouvrir(&fichier, MOT_DE_PASSE).expect("ouverture");
        assert_eq!(entrees, entrees_exemple());
    }

    #[test]
    fn refuse_un_mauvais_mot_de_passe() {
        let (fichier, _) = coffre_scelle();
        assert_eq!(
            ouvrir(&fichier, "autre-mot-de-passe").err(),
            Some(ErreurCoffre::AccesRefuse)
        );
    }

    #[test]
    fn le_fichier_ne_contient_aucune_donnee_en_clair() {
        let (fichier, code) = coffre_scelle();
        let texte = String::from_utf8_lossy(&fichier);
        for secret in [
            "dnmade.fiches",
            "Évaluation",
            "Élève fictif",
            MOT_DE_PASSE,
            &code,
        ] {
            assert!(!texte.contains(secret), "« {secret} » apparaît en clair");
        }
    }

    #[test]
    fn accepte_un_coffre_vide() {
        let mut alea = alea();
        let (coffre, _) = creer(MOT_DE_PASSE, DERIVATION_DE_TEST, &mut alea).expect("création");
        let fichier = coffre
            .sceller(&Entrees::new(), &mut alea)
            .expect("scellement");
        let (_, entrees) = ouvrir(&fichier, MOT_DE_PASSE).expect("ouverture");
        assert!(entrees.is_empty());
    }

    #[test]
    fn refuse_un_mot_de_passe_trop_court() {
        assert_eq!(
            creer("1234567", DERIVATION_DE_TEST, &mut alea()).err(),
            Some(ErreurCoffre::MotDePasseTropCourt)
        );
    }

    #[test]
    fn compte_les_caracteres_et_non_les_octets() {
        // Sept caractères accentués pèsent quatorze octets : toujours trop court.
        assert_eq!(
            creer("ééééééé", DERIVATION_DE_TEST, &mut alea()).err(),
            Some(ErreurCoffre::MotDePasseTropCourt)
        );
        assert!(creer("éééééééé", DERIVATION_DE_TEST, &mut alea()).is_ok());
    }

    #[test]
    fn le_code_de_secours_a_la_forme_attendue() {
        let (_, code) = coffre_scelle();
        let groupes: Vec<&str> = code.split('-').collect();
        assert_eq!(groupes.len(), 4);
        assert!(groupes.iter().all(|groupe| groupe.len() == 5));
        assert!(code
            .bytes()
            .all(|octet| octet == b'-' || ALPHABET_SECOURS.contains(&octet)));
    }

    #[test]
    fn le_code_de_secours_ouvre_et_installe_un_nouveau_mot_de_passe() {
        let (fichier, code) = coffre_scelle();
        let mut alea = alea();
        let (coffre, entrees) =
            ouvrir_par_secours(&fichier, &code, "nouveau-mot-de-passe", &mut alea)
                .expect("secours");
        assert_eq!(entrees, entrees_exemple());

        let fichier = coffre.sceller(&entrees, &mut alea).expect("scellement");
        assert!(ouvrir(&fichier, "nouveau-mot-de-passe").is_ok());
        assert_eq!(
            ouvrir(&fichier, MOT_DE_PASSE).err(),
            Some(ErreurCoffre::AccesRefuse)
        );
    }

    #[test]
    fn le_code_de_secours_reste_valable_apres_usage() {
        let (fichier, code) = coffre_scelle();
        let mut alea = alea();
        let (coffre, entrees) =
            ouvrir_par_secours(&fichier, &code, "nouveau-mot-de-passe", &mut alea)
                .expect("secours");
        let fichier = coffre.sceller(&entrees, &mut alea).expect("scellement");
        assert!(ouvrir_par_secours(&fichier, &code, "troisième-mot-de-passe", &mut alea).is_ok());
    }

    #[test]
    fn tolere_un_code_de_secours_recopie_en_minuscules_avec_espaces() {
        let (fichier, code) = coffre_scelle();
        let recopie = code.to_lowercase().replace('-', " ");
        assert!(
            ouvrir_par_secours(&fichier, &recopie, "nouveau-mot-de-passe", &mut alea()).is_ok()
        );
    }

    #[test]
    fn lit_les_lettres_ambigues_comme_les_chiffres_qu_elles_imitent() {
        assert_eq!(normaliser_code_secours("o0iIlL-1"), "0011111");
    }

    #[test]
    fn refuse_un_mauvais_code_de_secours() {
        let (fichier, _) = coffre_scelle();
        assert_eq!(
            ouvrir_par_secours(
                &fichier,
                "AAAAA-AAAAA-AAAAA-AAAAA",
                "nouveau-mot-de-passe",
                &mut alea()
            )
            .err(),
            Some(ErreurCoffre::AccesRefuse)
        );
    }

    #[test]
    fn refuse_un_nouveau_mot_de_passe_trop_court_meme_avec_le_bon_code() {
        let (fichier, code) = coffre_scelle();
        assert_eq!(
            ouvrir_par_secours(&fichier, &code, "court", &mut alea()).err(),
            Some(ErreurCoffre::MotDePasseTropCourt)
        );
    }

    #[test]
    fn le_mot_de_passe_ne_sert_pas_de_code_de_secours() {
        let (fichier, _) = coffre_scelle();
        assert_eq!(
            ouvrir_par_secours(&fichier, MOT_DE_PASSE, "nouveau-mot-de-passe", &mut alea()).err(),
            Some(ErreurCoffre::AccesRefuse)
        );
    }

    #[test]
    fn detecte_un_contenu_altere() {
        let (fichier, _) = coffre_scelle();
        let mut document: serde_json::Value = serde_json::from_slice(&fichier).expect("json");
        let donnees = document["contenu"]["donnees"].as_str().expect("donnees");
        let mut octets = BASE64.decode(donnees).expect("base64");
        octets[0] ^= 1;
        document["contenu"]["donnees"] = BASE64.encode(octets).into();
        let altere = serde_json::to_vec(&document).expect("json");
        assert_eq!(
            ouvrir(&altere, MOT_DE_PASSE).err(),
            Some(ErreurCoffre::FichierIllisible)
        );
    }

    #[test]
    fn refuse_le_contenu_d_un_autre_coffre() {
        let (fichier, _) = coffre_scelle();
        let (autre, _) = creer(
            MOT_DE_PASSE,
            DERIVATION_DE_TEST,
            &mut ChaCha20Rng::seed_from_u64(99),
        )
        .expect("création");
        assert_eq!(
            autre.relire(&fichier).err(),
            Some(ErreurCoffre::FichierIllisible)
        );
    }

    #[test]
    fn relit_son_propre_fichier_sans_mot_de_passe() {
        let mut alea = alea();
        let (coffre, _) = creer(MOT_DE_PASSE, DERIVATION_DE_TEST, &mut alea).expect("création");
        let fichier = coffre
            .sceller(&entrees_exemple(), &mut alea)
            .expect("scellement");
        assert_eq!(coffre.relire(&fichier), Ok(entrees_exemple()));
    }

    #[test]
    fn refuse_un_fichier_qui_n_est_pas_un_coffre() {
        for contenu in [
            &b""[..],
            b"pas du json",
            b"{}",
            b"{\"format\":\"autre\",\"version\":1}",
        ] {
            assert_eq!(
                ouvrir(contenu, MOT_DE_PASSE).err(),
                Some(ErreurCoffre::FichierIllisible)
            );
        }
    }

    #[test]
    fn refuse_un_fichier_tronque() {
        let (fichier, _) = coffre_scelle();
        assert_eq!(
            ouvrir(&fichier[..fichier.len() / 2], MOT_DE_PASSE).err(),
            Some(ErreurCoffre::FichierIllisible)
        );
    }

    #[test]
    fn signale_une_version_plus_recente() {
        let futur = br#"{"format":"dnmax-coffre","version":2,"structure":"inconnue"}"#;
        assert_eq!(
            ouvrir(futur, MOT_DE_PASSE).err(),
            Some(ErreurCoffre::VersionInconnue(2))
        );
    }

    #[test]
    fn refuse_des_parametres_de_derivation_demesures() {
        let (fichier, _) = coffre_scelle();
        let mut document: serde_json::Value = serde_json::from_slice(&fichier).expect("json");
        document["derivation"]["memoire_kio"] = (MEMOIRE_MAXIMALE_KIO + 1).into();
        let trafique = serde_json::to_vec(&document).expect("json");
        assert_eq!(
            ouvrir(&trafique, MOT_DE_PASSE).err(),
            Some(ErreurCoffre::FichierIllisible)
        );
    }

    #[test]
    fn un_texte_protege_se_relit_avec_son_mot_de_passe() {
        let fichier = proteger_texte(
            "résultats de l'élève fictif",
            MOT_DE_PASSE,
            DERIVATION_DE_TEST,
            &mut alea(),
        )
        .expect("protection");
        assert_eq!(
            lire_texte_protege(&fichier, MOT_DE_PASSE),
            Ok("résultats de l'élève fictif".to_owned())
        );
    }

    #[test]
    fn un_texte_protege_n_apparait_pas_en_clair() {
        let fichier = proteger_texte(
            "élève fictif",
            MOT_DE_PASSE,
            DERIVATION_DE_TEST,
            &mut alea(),
        )
        .expect("protection");
        assert!(!String::from_utf8_lossy(&fichier).contains("fictif"));
    }

    #[test]
    fn un_texte_protege_refuse_un_mauvais_mot_de_passe() {
        let fichier = proteger_texte("texte", MOT_DE_PASSE, DERIVATION_DE_TEST, &mut alea())
            .expect("protection");
        assert_eq!(
            lire_texte_protege(&fichier, "autre-mot-de-passe"),
            Err(ErreurCoffre::AccesRefuse)
        );
    }

    #[test]
    fn proteger_refuse_un_mot_de_passe_trop_court() {
        assert_eq!(
            proteger_texte("texte", "court", DERIVATION_DE_TEST, &mut alea()).err(),
            Some(ErreurCoffre::MotDePasseTropCourt)
        );
    }

    #[test]
    fn un_coffre_ordinaire_n_est_pas_un_texte_protege() {
        let (fichier, _) = coffre_scelle();
        assert_eq!(
            lire_texte_protege(&fichier, MOT_DE_PASSE),
            Err(ErreurCoffre::FichierIllisible)
        );
    }

    #[test]
    fn accepte_un_texte_protege_vide() {
        let fichier =
            proteger_texte("", MOT_DE_PASSE, DERIVATION_DE_TEST, &mut alea()).expect("protection");
        assert_eq!(
            lire_texte_protege(&fichier, MOT_DE_PASSE),
            Ok(String::new())
        );
    }

    #[test]
    fn deux_scellements_du_meme_contenu_different() {
        let mut alea = alea();
        let (coffre, _) = creer(MOT_DE_PASSE, DERIVATION_DE_TEST, &mut alea).expect("création");
        let premier = coffre
            .sceller(&entrees_exemple(), &mut alea)
            .expect("scellement");
        let second = coffre
            .sceller(&entrees_exemple(), &mut alea)
            .expect("scellement");
        assert_ne!(premier, second);
    }
}
