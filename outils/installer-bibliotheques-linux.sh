#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Installe, sur une machine d'intégration continue Ubuntu, les bibliothèques
# système dont Tauri a besoin pour compiler ; ou, si des noms de paquets sont
# passés en arguments, ces paquets-là (par exemple l'outil d'envoi du site).
#
# Les machines de GitHub pointent sur un miroir de paquets qui a déjà cessé de
# répondre pendant des heures, en même temps que le miroir officiel d'Ubuntu :
# chaque paquet attendait alors vingt secondes et le job dépassait son délai.
# On sonde donc plusieurs miroirs et on retient le premier qui répond. Changer
# de miroir ne réduit pas la sécurité : apt vérifie la signature des paquets,
# quel que soit le serveur qui les livre.
set -euo pipefail

MIROIR_PAR_DEFAUT="http://azure.archive.ubuntu.com/ubuntu"
MIROIRS_CANDIDATS=(
  "$MIROIR_PAR_DEFAUT"
  "http://archive.ubuntu.com/ubuntu"
  "http://mirrors.edge.kernel.org/ubuntu"
  "http://ftp.halifax.rwth-aachen.de/ubuntu"
  "http://mirror.math.princeton.edu/pub/ubuntu"
)
DELAI_SONDE_SECONDES=8
OPTIONS_APT=(-o Acquire::Retries=2 -o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20)

version_ubuntu="$(. /etc/os-release && echo "$VERSION_CODENAME")"

miroir_retenu=""
for miroir in "${MIROIRS_CANDIDATS[@]}"; do
  if curl --fail --silent --show-error --max-time "$DELAI_SONDE_SECONDES" --output /dev/null \
    "${miroir}/dists/${version_ubuntu}/InRelease"; then
    miroir_retenu="$miroir"
    break
  fi
  echo "Miroir injoignable : ${miroir}"
done
if [ -z "$miroir_retenu" ]; then
  echo "::error::Aucun miroir de paquets Ubuntu ne répond. Relancer plus tard."
  exit 1
fi
echo "Miroir retenu : ${miroir_retenu}"

if [ "$miroir_retenu" != "$MIROIR_PAR_DEFAUT" ]; then
  # L'adresse par défaut peut figurer dans les sources ou dans une liste de miroirs à
  # part (/etc/apt/apt-mirrors.txt sur les machines GitHub) : on la remplace partout.
  while IFS= read -r fichier; do
    sudo sed -i "s|${MIROIR_PAR_DEFAUT}|${miroir_retenu}|g" "$fichier"
  done < <(sudo grep -rl "${MIROIR_PAR_DEFAUT}" /etc/apt 2>/dev/null || true)
  # Sans cela, apt irait encore chercher les correctifs de sécurité sur les serveurs en panne.
  while IFS= read -r fichier; do
    sudo sed -i -E "s#https?://(security|archive)\\.ubuntu\\.com/ubuntu#${miroir_retenu}#g" "$fichier"
  done < <(sudo grep -rlE "(security|archive)\\.ubuntu\\.com/ubuntu" /etc/apt 2>/dev/null || true)
fi

sudo apt-get "${OPTIONS_APT[@]}" update
PAQUETS_TAURI=(libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev)
if [ "$#" -gt 0 ]; then
  paquets=("$@")
else
  paquets=("${PAQUETS_TAURI[@]}")
fi
sudo apt-get "${OPTIONS_APT[@]}" install -y --no-install-recommends "${paquets[@]}"
