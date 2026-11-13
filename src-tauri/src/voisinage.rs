// SPDX-License-Identifier: AGPL-3.0-or-later

//! Annonce et recherche d'un envoi en direct sur le réseau local (mDNS/DNS-SD).
//!
//! L'annonce ne contient rien de personnel : un nom de service fixe, un nom
//! d'instance et un nom d'hôte tirés au hasard (pas le nom de l'ordinateur),
//! la version du protocole, le canal (les deux premiers chiffres du code,
//! publics) et le port d'écoute. La multidiffusion mDNS ne franchit pas le
//! réseau local, et seules les adresses IPv4 d'un sous-réseau de cet
//! ordinateur sont jointes : DNMAX ne se connecte jamais au-delà.

use std::collections::BTreeMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, SocketAddrV4};
use std::time::{Duration, Instant};

use mdns_sd::{IfKind, ServiceDaemon, ServiceEvent, ServiceInfo};

use crate::direct::{Annulation, ErreurDirect};

/// Type de service DNS-SD de l'échange en direct.
pub const TYPE_SERVICE: &str = "_dnmax-direct._tcp.local.";

const CLE_VERSION: &str = "v";
const CLE_CANAL: &str = "canal";
const VERSION_ANNONCE: &str = "1";

/// Une fois un envoi trouvé, temps laissé à un éventuel second envoi de même
/// canal pour se manifester, afin de ne pas joindre le mauvais.
const ATTENTE_APRES_PREMIER: Duration = Duration::from_millis(1500);
/// Intervalle entre deux regards sur l'annulation pendant la recherche.
const PAS_RECHERCHE: Duration = Duration::from_millis(100);

/// Envoi annoncé sur le réseau, tel qu'il a été entendu.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnvoiTrouve {
    /// Nom complet de l'instance : distingue deux envois.
    pub nom: String,
    pub version: Option<String>,
    pub canal: Option<String>,
    pub adresses: Vec<Ipv4Addr>,
    pub port: u16,
}

/// Adresse et masque d'une interface IPv4 de cet ordinateur.
pub type ReseauLocal = (Ipv4Addr, Ipv4Addr);

/// Réseaux IPv4 auxquels cet ordinateur est relié, hors boucle locale.
pub fn reseaux_locaux() -> Vec<ReseauLocal> {
    if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|interface| match interface.addr {
            if_addrs::IfAddr::V4(adresse) if !adresse.ip.is_loopback() => {
                Some((adresse.ip, adresse.netmask))
            }
            _ => None,
        })
        .collect()
}

/// Indique si `adresse` est sur l'un des `reseaux` de cet ordinateur (ou est
/// cet ordinateur lui-même) : seules ces adresses sont jointes ou admises.
pub fn est_voisine(adresse: IpAddr, reseaux: &[ReseauLocal]) -> bool {
    let IpAddr::V4(adresse) = adresse else {
        // Une adresse IPv4 transcrite en IPv6 (`::ffff:a.b.c.d`) est jugée comme IPv4.
        return match adresse {
            IpAddr::V6(v6) => v6
                .to_ipv4_mapped()
                .is_some_and(|v4| est_voisine(IpAddr::V4(v4), reseaux)),
            IpAddr::V4(_) => false,
        };
    };
    if adresse.is_loopback() {
        return true;
    }
    if adresse.is_unspecified() || adresse.is_broadcast() || adresse.is_multicast() {
        return false;
    }
    reseaux.iter().any(|(locale, masque)| {
        let masque = u32::from(*masque);
        // Un masque nul engloberait tout Internet : il ne définit pas un voisinage.
        masque != 0 && u32::from(*locale) & masque == u32::from(adresse) & masque
    })
}

/// Choisit, parmi les envois entendus, celui qui porte `canal`, et rend ses
/// adresses voisines.
///
/// # Errors
///
/// `ExpediteurIntrouvable` si aucun envoi de ce canal n'a d'adresse voisine,
/// `PlusieursExpediteurs` si plusieurs en ont (deux envois de même canal, ou
/// un tiers qui imite l'annonce) : mieux vaut un nouveau code que joindre le mauvais.
pub fn choisir_expediteur(
    trouves: &[EnvoiTrouve],
    canal: &str,
    voisine: impl Fn(IpAddr) -> bool,
) -> Result<Vec<SocketAddr>, ErreurDirect> {
    let mut candidats: BTreeMap<&str, Vec<SocketAddr>> = BTreeMap::new();
    for envoi in trouves {
        if envoi.canal.as_deref() != Some(canal)
            || envoi.version.as_deref() != Some(VERSION_ANNONCE)
        {
            continue;
        }
        let adresses = candidats.entry(envoi.nom.as_str()).or_default();
        for adresse in &envoi.adresses {
            let prise = SocketAddr::V4(SocketAddrV4::new(*adresse, envoi.port));
            if voisine(IpAddr::V4(*adresse)) && !adresses.contains(&prise) {
                adresses.push(prise);
            }
        }
    }
    candidats.retain(|_, adresses| !adresses.is_empty());
    let mut restants = candidats.into_values();
    match (restants.next(), restants.next()) {
        (Some(adresses), None) => Ok(adresses),
        (None, _) => Err(ErreurDirect::ExpediteurIntrouvable),
        (Some(_), Some(_)) => Err(ErreurDirect::PlusieursExpediteurs),
    }
}

fn demarrer_demon() -> Result<ServiceDaemon, ErreurDirect> {
    let demon = ServiceDaemon::new().map_err(|_| ErreurDirect::ReseauIndisponible)?;
    // IPv4 seulement, hors boucle locale : c'est là que le voisinage est vérifiable.
    let _ = demon.disable_interface(vec![IfKind::IPv6, IfKind::LoopbackV4, IfKind::LoopbackV6]);
    Ok(demon)
}

/// Annonce d'un envoi, retirée du réseau à sa destruction.
pub struct Annonce {
    demon: ServiceDaemon,
    nom: String,
}

impl Annonce {
    /// Annonce sur le réseau local l'envoi de canal `canal`, en écoute sur `port`.
    /// `suffixe` (tiré au hasard) distingue cette annonce des autres.
    pub fn publier(canal: &str, port: u16, suffixe: &str) -> Result<Self, ErreurDirect> {
        let demon = demarrer_demon()?;
        let instance = format!("dnmax-{suffixe}");
        let hote = format!("dnmax-{suffixe}.local.");
        let proprietes = [(CLE_VERSION, VERSION_ANNONCE), (CLE_CANAL, canal)];
        let service = ServiceInfo::new(TYPE_SERVICE, &instance, &hote, (), port, &proprietes[..])
            .map_err(|_| ErreurDirect::Interne)?
            .enable_addr_auto();
        let nom = service.get_fullname().to_owned();
        demon
            .register(service)
            .map_err(|_| ErreurDirect::ReseauIndisponible)?;
        Ok(Self { demon, nom })
    }
}

impl Drop for Annonce {
    fn drop(&mut self) {
        // Prévient les voisins que l'envoi n'existe plus ; un échec est sans conséquence.
        let _ = self.demon.unregister(&self.nom);
        let _ = self.demon.shutdown();
    }
}

/// Écoute les annonces de l'échange en direct pendant au plus `duree`, et
/// s'arrête peu après avoir entendu un envoi du canal `canal`.
pub fn chercher(
    canal: &str,
    duree: Duration,
    annulation: &Annulation,
) -> Result<Vec<EnvoiTrouve>, ErreurDirect> {
    let demon = demarrer_demon()?;
    let evenements = demon
        .browse(TYPE_SERVICE)
        .map_err(|_| ErreurDirect::ReseauIndisponible)?;
    let mut limite = Instant::now() + duree;
    let mut trouves = Vec::new();
    while Instant::now() < limite {
        if annulation.est_demandee() {
            let _ = demon.shutdown();
            return Err(ErreurDirect::Annule);
        }
        let Ok(evenement) = evenements.recv_timeout(PAS_RECHERCHE) else {
            continue;
        };
        if let ServiceEvent::ServiceResolved(service) = evenement {
            let envoi = EnvoiTrouve {
                nom: service.get_fullname().to_owned(),
                version: service.get_property_val_str(CLE_VERSION).map(str::to_owned),
                canal: service.get_property_val_str(CLE_CANAL).map(str::to_owned),
                adresses: service.get_addresses_v4().into_iter().collect(),
                port: service.get_port(),
            };
            if envoi.canal.as_deref() == Some(canal) {
                limite = limite.min(Instant::now() + ATTENTE_APRES_PREMIER);
            }
            trouves.push(envoi);
        }
    }
    let _ = demon.shutdown();
    Ok(trouves)
}

#[cfg(test)]
mod tests {
    use super::*;

    const RESEAU_MAISON: ReseauLocal = (
        Ipv4Addr::new(192, 168, 1, 20),
        Ipv4Addr::new(255, 255, 255, 0),
    );

    fn envoi(nom: &str, canal: &str, adresses: &[[u8; 4]]) -> EnvoiTrouve {
        EnvoiTrouve {
            nom: nom.to_owned(),
            version: Some(VERSION_ANNONCE.to_owned()),
            canal: Some(canal.to_owned()),
            adresses: adresses
                .iter()
                .map(|octets| Ipv4Addr::from(*octets))
                .collect(),
            port: 40_000,
        }
    }

    fn voisine_maison(adresse: IpAddr) -> bool {
        est_voisine(adresse, &[RESEAU_MAISON])
    }

    #[test]
    fn une_adresse_du_meme_sous_reseau_est_voisine() {
        assert!(voisine_maison("192.168.1.42".parse().expect("adresse")));
    }

    #[test]
    fn une_adresse_d_un_autre_reseau_n_est_pas_voisine() {
        for adresse in ["192.168.2.42", "8.8.8.8", "10.0.0.1"] {
            assert!(
                !voisine_maison(adresse.parse().expect("adresse")),
                "{adresse}"
            );
        }
    }

    #[test]
    fn sans_reseau_seule_la_boucle_locale_est_voisine() {
        assert!(est_voisine("127.0.0.1".parse().expect("adresse"), &[]));
        assert!(!est_voisine("192.168.1.42".parse().expect("adresse"), &[]));
    }

    #[test]
    fn un_masque_nul_ne_rend_pas_internet_voisin() {
        let reseau = (Ipv4Addr::new(192, 168, 1, 20), Ipv4Addr::UNSPECIFIED);
        assert!(!est_voisine("8.8.8.8".parse().expect("adresse"), &[reseau]));
    }

    #[test]
    fn les_adresses_speciales_ne_sont_pas_voisines() {
        for adresse in ["0.0.0.0", "255.255.255.255", "224.0.0.251", "fe80::1"] {
            assert!(
                !voisine_maison(adresse.parse().expect("adresse")),
                "{adresse}"
            );
        }
    }

    #[test]
    fn une_adresse_ipv4_transcrite_en_ipv6_est_jugee_comme_ipv4() {
        assert!(voisine_maison(
            "::ffff:192.168.1.42".parse().expect("adresse")
        ));
    }

    #[test]
    fn retient_l_envoi_du_bon_canal() {
        let trouves = [
            envoi("a", "48", &[[192, 168, 1, 30]]),
            envoi("b", "12", &[[192, 168, 1, 31]]),
        ];
        assert_eq!(
            choisir_expediteur(&trouves, "48", voisine_maison),
            Ok(vec!["192.168.1.30:40000".parse().expect("adresse")])
        );
    }

    #[test]
    fn regroupe_les_annonces_repetees_d_un_meme_envoi() {
        let trouves = [
            envoi("a", "48", &[[192, 168, 1, 30]]),
            envoi("a", "48", &[[192, 168, 1, 30], [192, 168, 1, 35]]),
        ];
        assert_eq!(
            choisir_expediteur(&trouves, "48", voisine_maison).map(|adresses| adresses.len()),
            Ok(2)
        );
    }

    #[test]
    fn ignore_les_adresses_hors_du_reseau_local() {
        let trouves = [envoi("a", "48", &[[8, 8, 8, 8], [192, 168, 1, 30]])];
        assert_eq!(
            choisir_expediteur(&trouves, "48", voisine_maison),
            Ok(vec!["192.168.1.30:40000".parse().expect("adresse")])
        );
    }

    #[test]
    fn aucun_envoi_du_canal_est_introuvable() {
        let trouves = [envoi("b", "12", &[[192, 168, 1, 31]])];
        assert_eq!(
            choisir_expediteur(&trouves, "48", voisine_maison),
            Err(ErreurDirect::ExpediteurIntrouvable)
        );
        assert_eq!(
            choisir_expediteur(&[], "48", voisine_maison),
            Err(ErreurDirect::ExpediteurIntrouvable)
        );
    }

    #[test]
    fn un_envoi_sans_adresse_voisine_est_introuvable() {
        let trouves = [envoi("a", "48", &[[10, 0, 0, 5]])];
        assert_eq!(
            choisir_expediteur(&trouves, "48", voisine_maison),
            Err(ErreurDirect::ExpediteurIntrouvable)
        );
    }

    #[test]
    fn deux_envois_du_meme_canal_ne_sont_pas_departages() {
        let trouves = [
            envoi("a", "48", &[[192, 168, 1, 30]]),
            envoi("b", "48", &[[192, 168, 1, 31]]),
        ];
        assert_eq!(
            choisir_expediteur(&trouves, "48", voisine_maison),
            Err(ErreurDirect::PlusieursExpediteurs)
        );
    }

    #[test]
    fn ignore_une_annonce_d_une_autre_version() {
        let mut ancien = envoi("a", "48", &[[192, 168, 1, 30]]);
        ancien.version = Some("2".to_owned());
        assert_eq!(
            choisir_expediteur(&[ancien], "48", voisine_maison),
            Err(ErreurDirect::ExpediteurIntrouvable)
        );
    }
}
