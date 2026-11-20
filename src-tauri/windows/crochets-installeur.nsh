; SPDX-License-Identifier: CECILL-2.1
; Crochets de l'installeur Windows (NSIS), appelés par le modèle de Tauri.
;
; Une mise à jour remplace DNMAX.exe au même endroit : Windows garde alors
; en cache l'ancienne icône (barre des tâches, épingles, menu Démarrer,
; raccourci du bureau). L'installeur de Tauri ne le prévient que pour les
; associations de fichiers, que DNMAX n'a pas : on le fait ici, après
; chaque installation ou mise à jour.

; Dossier de ce fichier, donc des autres fichiers de l'installeur : le modèle
; (installeur.nsi) est copié ailleurs avant d'être compilé, et les retrouve par là.
!define DOSSIER_INSTALLEUR "${__FILEDIR__}"

!macro NSIS_HOOK_POSTINSTALL
  ; SHCNE_ASSOCCHANGED (0x08000000) avec SHCNF_FLUSH (0x1000) : l'Explorateur relit les icônes.
  System::Call "shell32::SHChangeNotify(i 0x08000000, i 0x1000, p 0, p 0)"
  ; Windows 10 et 11 : reconstruit le cache d'icônes de la session sans redémarrage.
  ${If} ${FileExists} "$SYSDIR\ie4uinit.exe"
    nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
    Pop $0
  ${EndIf}
!macroend
