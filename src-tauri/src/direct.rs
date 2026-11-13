// SPDX-License-Identifier: AGPL-3.0-or-later

//! Échange en direct : protocole entre deux ordinateurs d'un même réseau local.
//!
//! L'expéditeur tire un code de 8 chiffres, que l'enseignant dicte à son
//! collègue. Ce code sert à la fois à trouver l'expéditeur sur le réseau (ses
//! deux premiers chiffres, le « canal », sont publics) et de mot de passe à un
//! échange de clé authentifié par mot de passe (SPAKE2) : sans le code, un
//! tiers du même réseau ne peut ni lire le contenu ni se faire passer pour
//! l'un des deux ordinateurs, et une écoute du trafic ne permet pas de
//! retrouver le code hors ligne. Le contenu est ensuite chiffré et authentifié
//! (ChaCha20-Poly1305). L'expéditeur n'accepte qu'une tentative : après un
//! code erroné, il se ferme.
//!
//! Ce module ne parle qu'aux flux qu'on lui confie (TCP en pratique, en boucle
//! locale dans les tests) ; l'annonce sur le réseau est dans `voisinage`.
//!
//! Déroulé, chaque message étant une trame préfixée de sa longueur :
//!
//! 1. destinataire → expéditeur : `DNMAX-DIRECT`, version, canal, message SPAKE2 ;
//! 2. expéditeur → destinataire : message SPAKE2 (ou `AUTRE`, `VERSION` : pas pour lui) ;
//! 3. destinataire → expéditeur : confirmation chiffrée sous la clé commune ;
//! 4. expéditeur → destinataire : `REFUS` si la confirmation ne s'ouvre pas, sinon
//!    la taille chiffrée puis le contenu en morceaux chiffrés ;
//! 5. destinataire → expéditeur : accusé de réception chiffré.

use std::io::{self, Read, Write};
use std::net::{IpAddr, Shutdown, SocketAddr, TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use chacha20poly1305::aead::rand_core::{CryptoRng, RngCore};
use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{ChaCha20Poly1305, Nonce};
use serde::Serialize;
use spake2::{Ed25519Group, Identity, Password, Spake2};
use zeroize::Zeroizing;

/// Nombre de chiffres du code dicté.
pub const LONGUEUR_CODE: usize = 8;
/// Chiffres de tête du code, publics : ils désignent l'envoi sur le réseau.
pub const LONGUEUR_CANAL: usize = 2;

/// Taille maximale d'un contenu échangé en direct, en octets : celle d'un fichier d'échange.
pub const TAILLE_MAXIMALE_ECHANGE_DIRECT: u64 = crate::import::TAILLE_MAXIMALE_ECHANGE;

const MAGIE: &[u8] = b"DNMAX-DIRECT";
const VERSION_PROTOCOLE: u8 = 1;
const IDENTITE_DESTINATAIRE: &[u8] = b"dnmax/direct/v1/destinataire";
const IDENTITE_EXPEDITEUR: &[u8] = b"dnmax/direct/v1/expediteur";

/// Longueur d'un message SPAKE2 sur Ed25519 : une lettre de rôle et un point.
const LONGUEUR_MESSAGE_PAKE: usize = 33;
const LONGUEUR_SALUT: usize = MAGIE.len() + 1 + LONGUEUR_CANAL + LONGUEUR_MESSAGE_PAKE;

/// Réponses en clair de l'expéditeur : elles ne donnent aucun accès, seulement un motif d'échec.
const REPONSE_AUTRE_CANAL: &[u8] = b"AUTRE";
const REPONSE_AUTRE_VERSION: &[u8] = b"VERSION";
const REPONSE_REFUS: &[u8] = b"REFUS";

// Données associées de chaque type de message chiffré : l'un ne peut pas être rejoué pour l'autre.
const USAGE_CONFIRMATION: &[u8] = b"dnmax/direct/v1/confirmation";
const USAGE_TAILLE: &[u8] = b"dnmax/direct/v1/taille";
const USAGE_MORCEAU: &[u8] = b"dnmax/direct/v1/morceau";
const USAGE_ACCUSE: &[u8] = b"dnmax/direct/v1/accuse";
const TEXTE_CONFIRMATION: &[u8] = b"confirmation";
const TEXTE_ACCUSE: &[u8] = b"recu";

/// Octets de contenu par morceau chiffré.
const TAILLE_MORCEAU: usize = 64 * 1024;
const TAILLE_ETIQUETTE: usize = 16;
/// Plus longue trame admise : un morceau chiffré.
const TAILLE_MAXIMALE_TRAME: usize = TAILLE_MORCEAU + TAILLE_ETIQUETTE;

/// Pause entre deux regards sur l'écoute, en attendant le destinataire.
const PAS_ATTENTE: Duration = Duration::from_millis(50);

/// Délais et limites de l'échange en direct.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ParametresDirect {
    /// Durée de validité d'un code, à partir de son affichage.
    pub validite: Duration,
    /// Silence admis sur la connexion avant de la déclarer interrompue.
    pub inactivite: Duration,
    /// Délai pour joindre l'ordinateur de l'expéditeur une fois trouvé.
    pub connexion: Duration,
    /// Durée de recherche de l'expéditeur sur le réseau local.
    pub decouverte: Duration,
    /// Taille maximale du contenu, en octets.
    pub taille_maximale: u64,
}

/// Réglages de l'application.
pub const PARAMETRES_DIRECT: ParametresDirect = ParametresDirect {
    validite: Duration::from_secs(5 * 60),
    inactivite: Duration::from_secs(30),
    connexion: Duration::from_secs(10),
    decouverte: Duration::from_secs(8),
    taille_maximale: TAILLE_MAXIMALE_ECHANGE_DIRECT,
};

/// Échec de l'échange en direct, rendu à l'interface comme un code stable.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ErreurDirect {
    /// Le code saisi n'a pas 8 chiffres.
    CodeInvalide,
    /// Le contenu dépasse la taille admise.
    TropVolumineux,
    /// Aucun réseau local utilisable (pas de connexion, écoute ou annonce impossibles).
    ReseauIndisponible,
    /// Aucun envoi portant ce code n'a été trouvé sur le réseau.
    ExpediteurIntrouvable,
    /// Plusieurs envois portent le même canal : impossible de savoir lequel joindre.
    PlusieursExpediteurs,
    /// L'expéditeur a été trouvé, mais pas joint.
    ConnexionImpossible,
    /// Le code ne correspond pas : vu des deux côtés, l'essai est consommé.
    CodeErrone,
    /// Le code a expiré sans que personne ne se connecte.
    DelaiDepasse,
    /// La connexion s'est rompue ou tue en route.
    TransfertInterrompu,
    /// Un message authentifié a été altéré, ou n'a pas la forme attendue.
    DonneesAlterees,
    /// L'autre ordinateur utilise une version incompatible de l'échange en direct.
    VersionIncompatible,
    /// L'enseignant a annulé.
    Annule,
    /// Échec inattendu d'une primitive de chiffrement.
    Interne,
}

/// Étape franchie, signalée à l'interface pendant l'échange.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(
    tag = "etape",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum EtapeDirect {
    /// Le code à dicter, et sa durée de validité.
    Code {
        code: String,
        validite_secondes: u64,
    },
    /// Le destinataire cherche l'expéditeur sur le réseau.
    Recherche,
    /// Les deux ordinateurs se sont reconnus : le transfert commence.
    Connexion,
    /// Avancement du transfert, en octets.
    Progression { faits: u64, total: u64 },
}

/// Code de 8 chiffres d'un échange. Jamais affiché dans les journaux.
#[derive(Clone, PartialEq, Eq)]
pub struct Code([u8; LONGUEUR_CODE]);

impl std::fmt::Debug for Code {
    fn fmt(&self, formateur: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formateur.write_str("Code(…)")
    }
}

impl Code {
    /// Tire un code uniformément parmi les 100 millions possibles.
    pub fn tirer(alea: &mut (impl RngCore + CryptoRng)) -> Self {
        const NOMBRE_CODES: u32 = 100_000_000;
        // Rejet des tirages de la dernière tranche incomplète : sans lui, les petits codes seraient favorisés.
        const ZONE_UNIFORME: u32 = u32::MAX - u32::MAX % NOMBRE_CODES;
        let valeur = loop {
            let tirage = alea.next_u32();
            if tirage < ZONE_UNIFORME {
                break tirage % NOMBRE_CODES;
            }
        };
        let mut chiffres = [b'0'; LONGUEUR_CODE];
        chiffres.copy_from_slice(format!("{valeur:08}").as_bytes());
        Self(chiffres)
    }

    /// Lit un code saisi : espaces, tirets et points sont ignorés, il doit rester 8 chiffres.
    pub fn lire(saisie: &str) -> Result<Self, ErreurDirect> {
        let mut chiffres = [b'0'; LONGUEUR_CODE];
        let mut compte = 0;
        for caractere in saisie.chars() {
            if caractere.is_whitespace() || matches!(caractere, '-' | '.') {
                continue;
            }
            if !caractere.is_ascii_digit() || compte == LONGUEUR_CODE {
                return Err(ErreurDirect::CodeInvalide);
            }
            // Un chiffre ASCII tient sur un octet.
            chiffres[compte] = caractere as u8;
            compte += 1;
        }
        if compte == LONGUEUR_CODE {
            Ok(Self(chiffres))
        } else {
            Err(ErreurDirect::CodeInvalide)
        }
    }

    /// Les chiffres de tête, publics : ils désignent l'envoi sur le réseau.
    pub fn canal(&self) -> &str {
        // Que des chiffres ASCII : toujours de l'UTF-8 valide.
        std::str::from_utf8(&self.0[..LONGUEUR_CANAL]).unwrap_or_default()
    }

    /// Le code tel qu'on le lit à voix haute : « 4821 7395 ».
    pub fn affichage(&self) -> String {
        let texte = String::from_utf8_lossy(&self.0);
        format!("{} {}", &texte[..4], &texte[4..])
    }

    fn mot_de_passe(&self) -> Password {
        Password::new(self.0)
    }
}

/// Permet d'interrompre un échange depuis un autre fil d'exécution : la
/// connexion en cours est coupée, l'attente s'arrête au prochain regard.
#[derive(Default)]
pub struct Annulation {
    demandee: AtomicBool,
    flux: Mutex<Option<TcpStream>>,
}

impl Annulation {
    pub fn annuler(&self) {
        self.demandee.store(true, Ordering::SeqCst);
        if let Some(flux) = self.verrou().take() {
            // Débloque une lecture en cours ; une connexion déjà fermée ne gêne pas.
            let _ = flux.shutdown(Shutdown::Both);
        }
    }

    pub fn est_demandee(&self) -> bool {
        self.demandee.load(Ordering::SeqCst)
    }

    fn suivre(&self, flux: &TcpStream) {
        if let Ok(copie) = flux.try_clone() {
            *self.verrou() = Some(copie);
        }
        if self.est_demandee() {
            let _ = flux.shutdown(Shutdown::Both);
        }
    }

    /// Une erreur survenue après une annulation est l'annulation elle-même.
    fn ou(&self, erreur: ErreurDirect) -> ErreurDirect {
        if self.est_demandee() {
            ErreurDirect::Annule
        } else {
            erreur
        }
    }

    fn verrou(&self) -> std::sync::MutexGuard<'_, Option<TcpStream>> {
        self.flux
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

fn ecrire_trame(flux: &mut impl Write, donnees: &[u8]) -> Result<(), ErreurDirect> {
    let longueur = u32::try_from(donnees.len()).map_err(|_| ErreurDirect::Interne)?;
    flux.write_all(&longueur.to_be_bytes())
        .and_then(|()| flux.write_all(donnees))
        .and_then(|()| flux.flush())
        .map_err(|_| ErreurDirect::TransfertInterrompu)
}

/// Lit une trame d'au plus `maximum` octets. La longueur annoncée est vérifiée
/// avant toute allocation : un pair malveillant ne peut pas réserver plus.
fn lire_trame(flux: &mut impl Read, maximum: usize) -> Result<Vec<u8>, ErreurDirect> {
    let mut entete = [0_u8; 4];
    flux.read_exact(&mut entete)
        .map_err(|_| ErreurDirect::TransfertInterrompu)?;
    let longueur =
        usize::try_from(u32::from_be_bytes(entete)).map_err(|_| ErreurDirect::DonneesAlterees)?;
    if longueur > maximum {
        return Err(ErreurDirect::DonneesAlterees);
    }
    let mut donnees = vec![0_u8; longueur];
    flux.read_exact(&mut donnees)
        .map_err(|_| ErreurDirect::TransfertInterrompu)?;
    Ok(donnees)
}

#[derive(Clone, Copy)]
enum Sens {
    VersDestinataire = 1,
    VersExpediteur = 2,
}

/// Chiffrement du flux sous la clé tirée de SPAKE2. Chaque message a un rang
/// propre à son sens : un message rejoué, déplacé ou renvoyé à son auteur ne
/// s'ouvre pas.
pub(crate) struct Chiffreur(ChaCha20Poly1305);

impl Chiffreur {
    fn depuis_cle(cle: &[u8]) -> Result<Self, ErreurDirect> {
        ChaCha20Poly1305::new_from_slice(cle)
            .map(Self)
            .map_err(|_| ErreurDirect::Interne)
    }

    fn nonce(sens: Sens, rang: u64) -> Nonce {
        let mut octets = [0_u8; 12];
        octets[0] = sens as u8;
        octets[4..].copy_from_slice(&rang.to_be_bytes());
        Nonce::from(octets)
    }

    fn sceller(
        &self,
        sens: Sens,
        rang: u64,
        texte: &[u8],
        usage: &[u8],
    ) -> Result<Vec<u8>, ErreurDirect> {
        self.0
            .encrypt(
                &Self::nonce(sens, rang),
                Payload {
                    msg: texte,
                    aad: usage,
                },
            )
            .map_err(|_| ErreurDirect::Interne)
    }

    fn ouvrir(
        &self,
        sens: Sens,
        rang: u64,
        chiffre: &[u8],
        usage: &[u8],
    ) -> Result<Vec<u8>, ErreurDirect> {
        self.0
            .decrypt(
                &Self::nonce(sens, rang),
                Payload {
                    msg: chiffre,
                    aad: usage,
                },
            )
            .map_err(|_| ErreurDirect::DonneesAlterees)
    }
}

fn identites() -> (Identity, Identity) {
    (
        Identity::new(IDENTITE_DESTINATAIRE),
        Identity::new(IDENTITE_EXPEDITEUR),
    )
}

/// Envoie le contenu : sa taille, puis ses morceaux, tous chiffrés.
fn ecrire_contenu(
    flux: &mut impl Write,
    chiffreur: &Chiffreur,
    contenu: &[u8],
    annulation: &Annulation,
    suivi: &mut impl FnMut(EtapeDirect),
) -> Result<(), ErreurDirect> {
    let total = u64::try_from(contenu.len()).map_err(|_| ErreurDirect::Interne)?;
    let taille = chiffreur.sceller(
        Sens::VersDestinataire,
        0,
        &total.to_be_bytes(),
        USAGE_TAILLE,
    )?;
    ecrire_trame(flux, &taille)?;
    let mut faits = 0_u64;
    for (rang, morceau) in (1_u64..).zip(contenu.chunks(TAILLE_MORCEAU)) {
        if annulation.est_demandee() {
            return Err(ErreurDirect::Annule);
        }
        let chiffre = chiffreur.sceller(Sens::VersDestinataire, rang, morceau, USAGE_MORCEAU)?;
        ecrire_trame(flux, &chiffre).map_err(|erreur| annulation.ou(erreur))?;
        faits += morceau.len() as u64;
        suivi(EtapeDirect::Progression { faits, total });
    }
    Ok(())
}

/// Ouvre la trame de taille et vérifie que le contenu annoncé ne dépasse pas `taille_maximale`.
fn ouvrir_taille(
    chiffreur: &Chiffreur,
    trame: &[u8],
    taille_maximale: u64,
) -> Result<u64, ErreurDirect> {
    let taille = chiffreur.ouvrir(Sens::VersDestinataire, 0, trame, USAGE_TAILLE)?;
    let total = u64::from_be_bytes(
        taille
            .as_slice()
            .try_into()
            .map_err(|_| ErreurDirect::DonneesAlterees)?,
    );
    if total > taille_maximale {
        return Err(ErreurDirect::TropVolumineux);
    }
    Ok(total)
}

/// Reçoit les morceaux d'un contenu de `total` octets, déjà annoncé et admis.
fn lire_morceaux(
    flux: &mut impl Read,
    chiffreur: &Chiffreur,
    total: u64,
    annulation: &Annulation,
    suivi: &mut impl FnMut(EtapeDirect),
) -> Result<Vec<u8>, ErreurDirect> {
    let attendu = usize::try_from(total).map_err(|_| ErreurDirect::TropVolumineux)?;
    let mut contenu = Vec::with_capacity(attendu);
    let mut rang = 1_u64;
    while contenu.len() < attendu {
        let trame =
            lire_trame(flux, TAILLE_MAXIMALE_TRAME).map_err(|erreur| annulation.ou(erreur))?;
        let morceau = chiffreur.ouvrir(Sens::VersDestinataire, rang, &trame, USAGE_MORCEAU)?;
        if morceau.is_empty() || morceau.len() > attendu - contenu.len() {
            return Err(ErreurDirect::DonneesAlterees);
        }
        contenu.extend_from_slice(&morceau);
        rang += 1;
        suivi(EtapeDirect::Progression {
            faits: contenu.len() as u64,
            total,
        });
    }
    Ok(contenu)
}

/// Issue d'une connexion côté expéditeur.
enum Issue {
    /// La connexion ne visait pas cet envoi (autre canal, autre version, inconnu) : l'essai n'est pas compté.
    PasPourMoi,
    Envoye,
}

/// Envoi prêt : code tiré, écoute ouverte, contenu vérifié.
pub struct Envoi {
    ecoute: TcpListener,
    code: Code,
    contenu: Vec<u8>,
}

impl Envoi {
    /// Vérifie la taille du contenu, tire le code et ouvre l'écoute sur `adresse`
    /// (port éphémère : `0.0.0.0:0` en pratique, `127.0.0.1:0` dans les tests).
    pub fn preparer(
        texte: String,
        adresse: SocketAddr,
        parametres: &ParametresDirect,
        alea: &mut (impl RngCore + CryptoRng),
    ) -> Result<Self, ErreurDirect> {
        if texte.len() as u64 > parametres.taille_maximale {
            return Err(ErreurDirect::TropVolumineux);
        }
        let ecoute = TcpListener::bind(adresse).map_err(|_| ErreurDirect::ReseauIndisponible)?;
        ecoute
            .set_nonblocking(true)
            .map_err(|_| ErreurDirect::ReseauIndisponible)?;
        Ok(Self {
            ecoute,
            code: Code::tirer(alea),
            contenu: texte.into_bytes(),
        })
    }

    pub fn code(&self) -> &Code {
        &self.code
    }

    pub fn port(&self) -> Result<u16, ErreurDirect> {
        self.ecoute
            .local_addr()
            .map(|adresse| adresse.port())
            .map_err(|_| ErreurDirect::ReseauIndisponible)
    }

    /// Attend le destinataire jusqu'à expiration du code et lui envoie le
    /// contenu. Une seule tentative est admise : dès qu'une connexion présente
    /// le bon canal, son issue, quelle qu'elle soit, met fin à l'envoi et
    /// ferme l'écoute. Les connexions venues d'ailleurs que du réseau local
    /// (`voisine`) sont ignorées.
    pub fn servir(
        self,
        parametres: &ParametresDirect,
        alea: &mut (impl RngCore + CryptoRng),
        voisine: impl Fn(IpAddr) -> bool,
        annulation: &Annulation,
        suivi: &mut impl FnMut(EtapeDirect),
    ) -> Result<(), ErreurDirect> {
        let limite = Instant::now() + parametres.validite;
        loop {
            if annulation.est_demandee() {
                return Err(ErreurDirect::Annule);
            }
            match self.ecoute.accept() {
                Ok((flux, pair)) => {
                    if !voisine(pair.ip()) {
                        continue;
                    }
                    match self.servir_connexion(flux, parametres, alea, annulation, suivi) {
                        Ok(Issue::PasPourMoi) => {}
                        Ok(Issue::Envoye) => return Ok(()),
                        Err(erreur) => return Err(annulation.ou(erreur)),
                    }
                }
                Err(erreur) if erreur.kind() == io::ErrorKind::WouldBlock => {
                    if Instant::now() >= limite {
                        return Err(ErreurDirect::DelaiDepasse);
                    }
                    thread::sleep(PAS_ATTENTE);
                }
                Err(erreur) if erreur.kind() == io::ErrorKind::Interrupted => {}
                Err(_) => return Err(ErreurDirect::ReseauIndisponible),
            }
        }
    }

    fn servir_connexion(
        &self,
        mut flux: TcpStream,
        parametres: &ParametresDirect,
        alea: &mut (impl RngCore + CryptoRng),
        annulation: &Annulation,
        suivi: &mut impl FnMut(EtapeDirect),
    ) -> Result<Issue, ErreurDirect> {
        // Selon le système, la connexion acceptée hérite ou non du mode non bloquant de l'écoute.
        // Le salut doit venir vite : une connexion muette ne doit pas faire attendre le vrai destinataire.
        if flux.set_nonblocking(false).is_err()
            || flux.set_read_timeout(Some(parametres.connexion)).is_err()
            || flux.set_write_timeout(Some(parametres.inactivite)).is_err()
        {
            return Ok(Issue::PasPourMoi);
        }
        annulation.suivre(&flux);
        // Tant que le salut n'est pas lu, rien ne prouve que la connexion vise cet envoi : elle ne compte pas.
        let Ok(salut) = lire_trame(&mut flux, LONGUEUR_SALUT) else {
            return Ok(Issue::PasPourMoi);
        };
        if flux.set_read_timeout(Some(parametres.inactivite)).is_err() {
            return Ok(Issue::PasPourMoi);
        }
        if salut.len() < MAGIE.len() + 1 || !salut.starts_with(MAGIE) {
            return Ok(Issue::PasPourMoi);
        }
        if salut[MAGIE.len()] != VERSION_PROTOCOLE || salut.len() != LONGUEUR_SALUT {
            let _ = ecrire_trame(&mut flux, REPONSE_AUTRE_VERSION);
            return Ok(Issue::PasPourMoi);
        }
        let (canal, message_destinataire) = salut[MAGIE.len() + 1..].split_at(LONGUEUR_CANAL);
        if canal != self.code.canal().as_bytes() {
            let _ = ecrire_trame(&mut flux, REPONSE_AUTRE_CANAL);
            return Ok(Issue::PasPourMoi);
        }

        // À partir d'ici, l'essai est consommé.
        let (destinataire, expediteur) = identites();
        let (etat, message) = Spake2::<Ed25519Group>::start_b_with_rng(
            &self.code.mot_de_passe(),
            &destinataire,
            &expediteur,
            &mut *alea,
        );
        ecrire_trame(&mut flux, &message)?;
        let cle = Zeroizing::new(
            etat.finish(message_destinataire)
                .map_err(|_| ErreurDirect::CodeErrone)?,
        );
        let chiffreur = Chiffreur::depuis_cle(&cle)?;
        let confirmation = lire_trame(&mut flux, LONGUEUR_SALUT + TAILLE_ETIQUETTE)?;
        let confirmee = chiffreur
            .ouvrir(Sens::VersExpediteur, 0, &confirmation, USAGE_CONFIRMATION)
            .is_ok_and(|texte| texte == TEXTE_CONFIRMATION);
        if !confirmee {
            let _ = ecrire_trame(&mut flux, REPONSE_REFUS);
            return Err(ErreurDirect::CodeErrone);
        }
        suivi(EtapeDirect::Connexion);
        ecrire_contenu(&mut flux, &chiffreur, &self.contenu, annulation, suivi)?;
        let accuse = lire_trame(&mut flux, TAILLE_MAXIMALE_TRAME)?;
        if chiffreur.ouvrir(Sens::VersExpediteur, 1, &accuse, USAGE_ACCUSE)? != TEXTE_ACCUSE {
            return Err(ErreurDirect::DonneesAlterees);
        }
        Ok(Issue::Envoye)
    }
}

/// Se connecte à la première adresse joignable de l'expéditeur, s'authentifie
/// par le code et rend le texte reçu, vérifié.
pub fn recevoir(
    adresses: &[SocketAddr],
    code: &Code,
    parametres: &ParametresDirect,
    alea: &mut (impl RngCore + CryptoRng),
    annulation: &Annulation,
    suivi: &mut impl FnMut(EtapeDirect),
) -> Result<String, ErreurDirect> {
    let mut flux = adresses
        .iter()
        .find_map(|adresse| TcpStream::connect_timeout(adresse, parametres.connexion).ok())
        .ok_or_else(|| annulation.ou(ErreurDirect::ConnexionImpossible))?;
    flux.set_read_timeout(Some(parametres.inactivite))
        .and_then(|()| flux.set_write_timeout(Some(parametres.inactivite)))
        .map_err(|_| ErreurDirect::ConnexionImpossible)?;
    annulation.suivre(&flux);
    echanger_comme_destinataire(&mut flux, code, parametres, alea, annulation, suivi)
        .map_err(|erreur| annulation.ou(erreur))
}

fn echanger_comme_destinataire(
    flux: &mut TcpStream,
    code: &Code,
    parametres: &ParametresDirect,
    alea: &mut (impl RngCore + CryptoRng),
    annulation: &Annulation,
    suivi: &mut impl FnMut(EtapeDirect),
) -> Result<String, ErreurDirect> {
    let (destinataire, expediteur) = identites();
    let (etat, message) = Spake2::<Ed25519Group>::start_a_with_rng(
        &code.mot_de_passe(),
        &destinataire,
        &expediteur,
        &mut *alea,
    );
    let mut salut = Vec::with_capacity(LONGUEUR_SALUT);
    salut.extend_from_slice(MAGIE);
    salut.push(VERSION_PROTOCOLE);
    salut.extend_from_slice(code.canal().as_bytes());
    salut.extend_from_slice(&message);
    ecrire_trame(flux, &salut)?;

    let reponse = lire_trame(flux, LONGUEUR_MESSAGE_PAKE)?;
    match reponse.as_slice() {
        REPONSE_AUTRE_CANAL => return Err(ErreurDirect::ExpediteurIntrouvable),
        REPONSE_AUTRE_VERSION => return Err(ErreurDirect::VersionIncompatible),
        _ => {}
    }
    let cle = Zeroizing::new(
        etat.finish(&reponse)
            .map_err(|_| ErreurDirect::DonneesAlterees)?,
    );
    let chiffreur = Chiffreur::depuis_cle(&cle)?;
    let confirmation = chiffreur.sceller(
        Sens::VersExpediteur,
        0,
        TEXTE_CONFIRMATION,
        USAGE_CONFIRMATION,
    )?;
    ecrire_trame(flux, &confirmation)?;

    // Réponse à la confirmation : un refus en clair, ou la taille chiffrée du contenu.
    let reponse = lire_trame(flux, TAILLE_MAXIMALE_TRAME)?;
    if reponse == REPONSE_REFUS {
        return Err(ErreurDirect::CodeErrone);
    }
    let total = match ouvrir_taille(&chiffreur, &reponse, parametres.taille_maximale) {
        // Une taille qui ne s'ouvre pas sous la clé commune : l'autre ordinateur
        // ne connaît pas le code, il se fait passer pour l'expéditeur.
        Err(ErreurDirect::DonneesAlterees) => return Err(ErreurDirect::CodeErrone),
        autre => autre?,
    };
    suivi(EtapeDirect::Connexion);
    let contenu = lire_morceaux(flux, &chiffreur, total, annulation, suivi)?;
    let texte = String::from_utf8(contenu).map_err(|_| ErreurDirect::DonneesAlterees)?;
    let accuse = chiffreur.sceller(Sens::VersExpediteur, 1, TEXTE_ACCUSE, USAGE_ACCUSE)?;
    ecrire_trame(flux, &accuse)?;
    Ok(texte)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand_chacha::rand_core::SeedableRng;
    use rand_chacha::ChaCha20Rng;
    use std::net::{Ipv4Addr, SocketAddrV4};
    use std::sync::Arc;

    fn alea(graine: u64) -> ChaCha20Rng {
        ChaCha20Rng::seed_from_u64(graine)
    }

    fn parametres() -> ParametresDirect {
        ParametresDirect {
            validite: Duration::from_secs(10),
            inactivite: Duration::from_secs(5),
            connexion: Duration::from_secs(2),
            decouverte: Duration::from_millis(100),
            taille_maximale: 1024 * 1024,
        }
    }

    fn boucle_locale() -> SocketAddr {
        SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::LOCALHOST, 0))
    }

    fn adresse_locale(envoi: &Envoi) -> SocketAddr {
        SocketAddr::V4(SocketAddrV4::new(
            Ipv4Addr::LOCALHOST,
            envoi.port().expect("port"),
        ))
    }

    /// Issue de l'expéditeur lancé à part, et les étapes qu'il a signalées.
    type FilExpediteur = thread::JoinHandle<(Result<(), ErreurDirect>, Vec<EtapeDirect>)>;

    /// Lance l'expéditeur dans un fil à part ; rend son adresse, son code et son issue à venir.
    fn lancer_expediteur(
        texte: &str,
        parametres: ParametresDirect,
    ) -> (SocketAddr, Code, Arc<Annulation>, FilExpediteur) {
        let envoi = Envoi::preparer(texte.to_owned(), boucle_locale(), &parametres, &mut alea(1))
            .expect("préparation");
        let adresse = adresse_locale(&envoi);
        let code = envoi.code().clone();
        let annulation = Arc::new(Annulation::default());
        let annulation_fil = Arc::clone(&annulation);
        let fil = thread::spawn(move || {
            let mut etapes = Vec::new();
            let issue = envoi.servir(
                &parametres,
                &mut alea(2),
                |_| true,
                &annulation_fil,
                &mut |etape| etapes.push(etape),
            );
            (issue, etapes)
        });
        (adresse, code, annulation, fil)
    }

    fn recevoir_avec(
        adresse: SocketAddr,
        code: &Code,
        parametres: &ParametresDirect,
    ) -> Result<String, ErreurDirect> {
        recevoir(
            &[adresse],
            code,
            parametres,
            &mut alea(3),
            &Annulation::default(),
            &mut |_| {},
        )
    }

    /// Un code de même canal que `code`, mais faux.
    fn code_voisin(code: &Code) -> Code {
        let mut chiffres = code.0;
        chiffres[LONGUEUR_CODE - 1] = if chiffres[LONGUEUR_CODE - 1] == b'9' {
            b'0'
        } else {
            chiffres[LONGUEUR_CODE - 1] + 1
        };
        Code(chiffres)
    }

    /// Tirages imposés, pour éprouver le rejet du tirage du code.
    struct TiragesImposes(Vec<u32>);

    impl RngCore for TiragesImposes {
        fn next_u32(&mut self) -> u32 {
            self.0.remove(0)
        }
        fn next_u64(&mut self) -> u64 {
            u64::from(self.next_u32())
        }
        fn fill_bytes(&mut self, octets: &mut [u8]) {
            octets.fill(0);
        }
        fn try_fill_bytes(
            &mut self,
            octets: &mut [u8],
        ) -> Result<(), rand_chacha::rand_core::Error> {
            self.fill_bytes(octets);
            Ok(())
        }
    }

    impl CryptoRng for TiragesImposes {}

    #[test]
    fn le_code_tire_compte_huit_chiffres() {
        let code = Code::tirer(&mut alea(7));
        let affichage = code.affichage();
        assert_eq!(affichage.len(), 9);
        assert!(affichage.chars().enumerate().all(|(rang, c)| if rang == 4 {
            c == ' '
        } else {
            c.is_ascii_digit()
        }));
    }

    #[test]
    fn deux_tirages_donnent_des_codes_differents() {
        let mut generateur = alea(7);
        assert_ne!(Code::tirer(&mut generateur), Code::tirer(&mut generateur));
    }

    #[test]
    fn le_tirage_rejette_la_tranche_incomplete() {
        let code = Code::tirer(&mut TiragesImposes(vec![u32::MAX, 4_200_000_000, 5]));
        assert_eq!(code.affichage(), "0000 0005");
    }

    #[test]
    fn le_code_garde_ses_zeros_de_tete() {
        let code = Code::tirer(&mut TiragesImposes(vec![42]));
        assert_eq!(code.affichage(), "0000 0042");
        assert_eq!(code.canal(), "00");
    }

    #[test]
    fn lit_un_code_saisi_avec_espaces_ou_tirets() {
        for saisie in ["4821 7395", "48217395", " 4821-7395 ", "48.21.73.95"] {
            let code = Code::lire(saisie).expect(saisie);
            assert_eq!(code.affichage(), "4821 7395");
            assert_eq!(code.canal(), "48");
        }
    }

    #[test]
    fn refuse_un_code_qui_n_a_pas_huit_chiffres() {
        for saisie in [
            "",
            "4821 739",
            "4821 73955",
            "4821 739a",
            "٤٨٢١٧٣٩٥",
            "4821\u{0}7395",
        ] {
            assert_eq!(
                Code::lire(saisie),
                Err(ErreurDirect::CodeInvalide),
                "{saisie:?}"
            );
        }
    }

    #[test]
    fn le_code_ne_s_affiche_pas_dans_les_journaux() {
        let code = Code::lire("4821 7395").expect("code");
        assert_eq!(format!("{code:?}"), "Code(…)");
    }

    #[test]
    fn transmet_le_texte_avec_le_bon_code() {
        // Plusieurs morceaux, et des caractères hors ASCII coupés n'importe où.
        let texte = "élève ✓ ".repeat(30_000);
        let (adresse, code, _, expediteur) = lancer_expediteur(&texte, parametres());
        let mut progression = Vec::new();
        let recu = recevoir(
            &[adresse],
            &code,
            &parametres(),
            &mut alea(3),
            &Annulation::default(),
            &mut |etape| progression.push(etape),
        );
        assert_eq!(recu.as_deref(), Ok(texte.as_str()));
        let (issue, etapes) = expediteur.join().expect("fil");
        assert_eq!(issue, Ok(()));
        assert_eq!(etapes.first(), Some(&EtapeDirect::Connexion));
        let total = texte.len() as u64;
        assert_eq!(
            etapes.last(),
            Some(&EtapeDirect::Progression {
                faits: total,
                total
            })
        );
        assert_eq!(
            progression.last(),
            Some(&EtapeDirect::Progression {
                faits: total,
                total
            })
        );
    }

    #[test]
    fn transmet_un_texte_vide() {
        let (adresse, code, _, expediteur) = lancer_expediteur("", parametres());
        assert_eq!(
            recevoir_avec(adresse, &code, &parametres()).as_deref(),
            Ok("")
        );
        assert_eq!(expediteur.join().expect("fil").0, Ok(()));
    }

    #[test]
    fn un_mauvais_code_est_refuse_des_deux_cotes() {
        let (adresse, code, _, expediteur) = lancer_expediteur("secret", parametres());
        assert_eq!(
            recevoir_avec(adresse, &code_voisin(&code), &parametres()),
            Err(ErreurDirect::CodeErrone)
        );
        assert_eq!(
            expediteur.join().expect("fil").0,
            Err(ErreurDirect::CodeErrone)
        );
    }

    #[test]
    fn apres_un_mauvais_code_le_bon_ne_sert_plus() {
        let (adresse, code, _, expediteur) = lancer_expediteur("secret", parametres());
        let _ = recevoir_avec(adresse, &code_voisin(&code), &parametres());
        let _ = expediteur.join();
        assert_eq!(
            recevoir_avec(adresse, &code, &parametres()),
            Err(ErreurDirect::ConnexionImpossible)
        );
    }

    #[test]
    fn un_autre_canal_ne_consomme_pas_l_essai() {
        let (adresse, code, _, expediteur) = lancer_expediteur("contenu", parametres());
        let canal_suivant = (code.canal().parse::<u8>().expect("canal") + 1) % 100;
        let autre = Code::lire(&format!("{canal_suivant:02}000000")).expect("code");
        assert_eq!(
            recevoir_avec(adresse, &autre, &parametres()),
            Err(ErreurDirect::ExpediteurIntrouvable)
        );
        assert_eq!(
            recevoir_avec(adresse, &code, &parametres()).as_deref(),
            Ok("contenu")
        );
        assert_eq!(expediteur.join().expect("fil").0, Ok(()));
    }

    #[test]
    fn une_connexion_etrangere_ne_consomme_pas_l_essai() {
        let (adresse, code, _, expediteur) = lancer_expediteur("contenu", parametres());
        let mut intrus = TcpStream::connect(adresse).expect("connexion");
        intrus
            .write_all(b"GET / HTTP/1.0\r\n\r\n")
            .expect("écriture");
        drop(intrus);
        assert_eq!(
            recevoir_avec(adresse, &code, &parametres()).as_deref(),
            Ok("contenu")
        );
        assert_eq!(expediteur.join().expect("fil").0, Ok(()));
    }

    #[test]
    fn une_connexion_muette_ne_fait_pas_attendre_le_destinataire() {
        let mut reglages = parametres();
        reglages.connexion = Duration::from_millis(200);
        reglages.inactivite = Duration::from_secs(20);
        let (adresse, code, _, expediteur) = lancer_expediteur("contenu", reglages);
        // Reste ouverte sans rien dire pendant que le vrai destinataire se présente.
        let _muette = TcpStream::connect(adresse).expect("connexion");
        thread::sleep(Duration::from_millis(50));
        // Le destinataire n'attendrait pas les 20 secondes d'inactivité admises par l'expéditeur.
        let mut impatient = parametres();
        impatient.inactivite = Duration::from_secs(2);
        assert_eq!(
            recevoir_avec(adresse, &code, &impatient).as_deref(),
            Ok("contenu")
        );
        assert_eq!(expediteur.join().expect("fil").0, Ok(()));
    }

    #[test]
    fn le_code_expire_si_personne_ne_se_connecte() {
        let mut reglages = parametres();
        reglages.validite = Duration::from_millis(150);
        let (adresse, code, _, expediteur) = lancer_expediteur("contenu", reglages);
        assert_eq!(
            expediteur.join().expect("fil").0,
            Err(ErreurDirect::DelaiDepasse)
        );
        assert_eq!(
            recevoir_avec(adresse, &code, &reglages),
            Err(ErreurDirect::ConnexionImpossible)
        );
    }

    #[test]
    fn l_expediteur_refuse_un_contenu_trop_gros() {
        let mut reglages = parametres();
        reglages.taille_maximale = 4;
        assert!(matches!(
            Envoi::preparer("12345".to_owned(), boucle_locale(), &reglages, &mut alea(1)),
            Err(ErreurDirect::TropVolumineux)
        ));
    }

    #[test]
    fn le_destinataire_refuse_un_contenu_plus_gros_que_sa_limite() {
        let (adresse, code, _, expediteur) = lancer_expediteur("0123456789", parametres());
        let mut reglages = parametres();
        reglages.taille_maximale = 9;
        assert_eq!(
            recevoir_avec(adresse, &code, &reglages),
            Err(ErreurDirect::TropVolumineux)
        );
        assert!(expediteur.join().expect("fil").0.is_err());
    }

    #[test]
    fn l_annulation_arrete_l_attente_de_l_expediteur() {
        let (_, _, annulation, expediteur) = lancer_expediteur("contenu", parametres());
        annulation.annuler();
        assert_eq!(expediteur.join().expect("fil").0, Err(ErreurDirect::Annule));
    }

    #[test]
    fn personne_a_joindre_est_une_connexion_impossible() {
        let ecoute = TcpListener::bind(boucle_locale()).expect("écoute");
        let adresse = ecoute.local_addr().expect("adresse");
        drop(ecoute);
        assert_eq!(
            recevoir_avec(
                adresse,
                &Code::lire("12345678").expect("code"),
                &parametres()
            ),
            Err(ErreurDirect::ConnexionImpossible)
        );
    }

    fn chiffreur_essai() -> Chiffreur {
        Chiffreur::depuis_cle(&[7_u8; 32]).expect("clé")
    }

    fn contenu_chiffre(texte: &[u8]) -> Vec<u8> {
        let mut flux = Vec::new();
        ecrire_contenu(
            &mut flux,
            &chiffreur_essai(),
            texte,
            &Annulation::default(),
            &mut |_| {},
        )
        .expect("écriture");
        flux
    }

    fn relire(flux: &[u8], taille_maximale: u64) -> Result<Vec<u8>, ErreurDirect> {
        let mut lecteur = io::Cursor::new(flux);
        let chiffreur = chiffreur_essai();
        let trame = lire_trame(&mut lecteur, TAILLE_MAXIMALE_TRAME)?;
        let total = ouvrir_taille(&chiffreur, &trame, taille_maximale)?;
        lire_morceaux(
            &mut lecteur,
            &chiffreur,
            total,
            &Annulation::default(),
            &mut |_| {},
        )
    }

    #[test]
    fn relit_un_contenu_chiffre_intact() {
        let texte = vec![42_u8; TAILLE_MORCEAU * 2 + 3];
        assert_eq!(relire(&contenu_chiffre(&texte), 1 << 20), Ok(texte));
    }

    #[test]
    fn refuse_un_contenu_altere_en_route() {
        let mut flux = contenu_chiffre(&vec![42_u8; TAILLE_MORCEAU + 10]);
        let milieu = flux.len() / 2;
        flux[milieu] ^= 1;
        assert_eq!(relire(&flux, 1 << 20), Err(ErreurDirect::DonneesAlterees));
    }

    #[test]
    fn refuse_un_contenu_tronque() {
        let flux = contenu_chiffre(&vec![42_u8; TAILLE_MORCEAU + 10]);
        assert_eq!(
            relire(&flux[..flux.len() - 1], 1 << 20),
            Err(ErreurDirect::TransfertInterrompu)
        );
    }

    #[test]
    fn refuse_des_morceaux_dans_le_desordre() {
        let texte = vec![42_u8; TAILLE_MORCEAU * 2];
        let flux = contenu_chiffre(&texte);
        // Trames : taille (4 + 24 octets), puis deux morceaux de même longueur, échangés.
        let debut = 4 + 8 + TAILLE_ETIQUETTE;
        let longueur = 4 + TAILLE_MORCEAU + TAILLE_ETIQUETTE;
        let mut echange = flux[..debut].to_vec();
        echange.extend_from_slice(&flux[debut + longueur..]);
        echange.extend_from_slice(&flux[debut..debut + longueur]);
        assert_eq!(
            relire(&echange, 1 << 20),
            Err(ErreurDirect::DonneesAlterees)
        );
    }

    #[test]
    fn refuse_une_trame_qui_annonce_une_longueur_demesuree() {
        let flux = u32::MAX.to_be_bytes();
        assert_eq!(
            lire_trame(&mut io::Cursor::new(flux), TAILLE_MAXIMALE_TRAME),
            Err(ErreurDirect::DonneesAlterees)
        );
    }

    #[test]
    fn un_contenu_chiffre_sous_une_autre_cle_ne_s_ouvre_pas() {
        let mut flux = Vec::new();
        ecrire_contenu(
            &mut flux,
            &Chiffreur::depuis_cle(&[8_u8; 32]).expect("clé"),
            b"texte",
            &Annulation::default(),
            &mut |_| {},
        )
        .expect("écriture");
        assert_eq!(relire(&flux, 1 << 20), Err(ErreurDirect::DonneesAlterees));
    }

    #[test]
    fn les_codes_d_erreur_sont_stables() {
        assert_eq!(
            serde_json::to_value(ErreurDirect::CodeErrone).expect("json"),
            serde_json::json!("code-errone")
        );
        assert_eq!(
            serde_json::to_value(EtapeDirect::Code {
                code: "4821 7395".to_owned(),
                validite_secondes: 300
            })
            .expect("json"),
            serde_json::json!({ "etape": "code", "code": "4821 7395", "validiteSecondes": 300 })
        );
    }
}
