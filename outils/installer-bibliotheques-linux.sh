#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Installe, sur une machine d'intégration continue Ubuntu, les bibliothèques
# système dont Tauri a besoin pour compiler.
#
# Les machines de GitHub pointent par défaut sur un miroir de paquets
# (azure.archive.ubuntu.com) qui a déjà cessé de répondre pendant des heures :
# chaque paquet attendait alors vingt secondes et le job dépassait son délai.
# On passe donc par le miroir officiel d'Ubuntu, avec des délais courts et
# quelques nouvelles tentatives, pour échouer vite plutôt que rester bloqué.
set -euo pipefail

MIROIR_PAR_DEFAUT="http://azure.archive.ubuntu.com/ubuntu"
MIROIR_OFFICIEL="http://archive.ubuntu.com/ubuntu"
OPTIONS_APT=(-o Acquire::Retries=3 -o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20)

# L'adresse du miroir peut figurer dans les sources elles-mêmes ou dans une liste de
# miroirs à part (/etc/apt/apt-mirrors.txt sur les machines GitHub) : on la remplace
# partout où elle se trouve sous /etc/apt.
while IFS= read -r fichier; do
  sudo sed -i "s|${MIROIR_PAR_DEFAUT}|${MIROIR_OFFICIEL}|g" "$fichier"
  echo "Miroir remplacé dans ${fichier}"
done < <(sudo grep -rl "${MIROIR_PAR_DEFAUT}" /etc/apt 2>/dev/null || true)

sudo apt-get "${OPTIONS_APT[@]}" update
sudo apt-get "${OPTIONS_APT[@]}" install -y --no-install-recommends \
  libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev libayatana-appindicator3-dev
