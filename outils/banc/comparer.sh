#!/bin/bash
# SPDX-License-Identifier: CECILL-2.1
# Rejoue chaque parcours, heure figée, sur main (deux fois, port 1421) et sur la
# branche (port 1420), puis compare tout, stockage final compris.
# Usage : PARCOURS="enseignants promotions" outils/banc/comparer.sh [dossier-de-sortie]
# Sans PARCOURS, rejoue les 21 parcours (compter plus de dix minutes).
set -u
ICI="$(cd "$(dirname "$0")" && pwd)"
SORTIE="${1:-${TMPDIR:-/tmp}/banc}"
mkdir -p "$SORTIE"
TOUS="$(grep -o 'parcours === "[a-z]*"' "$ICI/banc.cjs" | cut -d'"' -f2 | sort -u | tr '\n' ' ')"
for p in ${PARCOURS:-$TOUS}; do
  for x in "1421 main" "1421 main2" "1420 branche"; do
    set -- $x
    BANC_FIGEE=1 BANC_STOCKAGE=1 timeout 600 node "$ICI/banc.cjs" "$1" "$SORTIE/$2-$p.json" "$p" > "$SORTIE/$2-$p.log" 2>&1 || echo "ECHEC $2 $p"
  done
  r=$(cmp -s "$SORTIE/main-$p.json" "$SORTIE/main2-$p.json" && echo repro || echo NON-REPRO)
  e=$(cmp -s "$SORTIE/main-$p.json" "$SORTIE/branche-$p.json" && echo EGAL || echo DIFFERENT)
  echo "$p $r $e"
done
