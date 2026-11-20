; SPDX-License-Identifier: CECILL-2.1
; Habillage de l'installeur Windows et de son désinstalleur : fenêtre sans barre de
; titre, aux couleurs de DNMAX. L'installeur va en trois pages (accueil,
; installation, fin), plus une page « Personnaliser » qui ne s'ouvre que si on la
; demande ; le désinstalleur aussi (confirmation, désinstallation, fin).
;
; Inclus par installeur.nsi. Rien ici n'installe ni ne supprime : ce fichier dessine
; les pages et retient les choix (raccourcis, dossier, suppression des données),
; que les sections de installeur.nsi appliquent.
;
; Les cotes sont celles de la maquette, en pixels à 100 %, mises à l'échelle de
; l'écran. Les images (une par échelle) et les polices, celles du site, viennent
; de windows/habillage/, produites par « node outils/generer-habillage-installeur.ts ».
;
; Clavier : Entrée lance l'action principale de la page (le bouton « Suivant » du
; modèle, gardé hors de la fenêtre, reste le bouton par défaut), Échap ferme, Tab
; parcourt les liens et les cases. Un lien qui a le focus au moment d'Entrée est
; traité comme s'il avait été cliqué (voir les fonctions « Quitter… »).

!include "nsDialogs.nsh"
!include "WinMessages.nsh"
!include "LogicLib.nsh"

!define HABILLAGE_FICHIERS "${DOSSIER_INSTALLEUR}\habillage"

; --- Textes ---
!define HABILLAGE_TEXTE_DEVISE "Évaluations par compétences en DN MADE"
!define HABILLAGE_TEXTE_INSTALLER "Installer"
!define HABILLAGE_TEXTE_METTRE_A_JOUR "Mettre à jour"
!define HABILLAGE_TEXTE_REINSTALLER "Réinstaller"
!define HABILLAGE_TEXTE_PERSONNALISER "Personnaliser l'installation"
!define HABILLAGE_TEXTE_MENU_DEMARRER "Raccourci dans le menu Démarrer"
!define HABILLAGE_TEXTE_BUREAU "Raccourci sur le bureau"
!define HABILLAGE_TEXTE_DOSSIER "Dossier d'installation"
!define HABILLAGE_TEXTE_MODIFIER "Modifier…"
!define HABILLAGE_TEXTE_CHOISIR_DOSSIER "Choisissez le dossier où installer ${PRODUCTNAME}."
!define HABILLAGE_TEXTE_RETOUR "‹ Retour"
!define HABILLAGE_TEXTE_EN_COURS "Installation en cours…"
!define HABILLAGE_TEXTE_INSTALLE "${PRODUCTNAME} est installé"
!define HABILLAGE_TEXTE_PREMIER_LANCEMENT "Au premier lancement, vous choisirez votre mot de passe."
!define HABILLAGE_TEXTE_OUVRIR "Ouvrir ${PRODUCTNAME}"
!define HABILLAGE_TEXTE_FERMER "Fermer"
!define HABILLAGE_TEXTE_CROIX "×"
!define HABILLAGE_TEXTE_DESINSTALLER_TITRE "Désinstaller ${PRODUCTNAME} ?"
!define HABILLAGE_TEXTE_SUPPRIMER_DONNEES "Supprimer aussi mes données de ce poste"
!define HABILLAGE_TEXTE_DONNEES_DETAIL "Évaluations, étudiant·es, réglages et sauvegardes automatiques. Sinon, tout est gardé pour une prochaine installation."
!define HABILLAGE_TEXTE_SUPPRESSION_TITRE "Supprimer vos données ?"
!define HABILLAGE_TEXTE_SUPPRESSION_DETAIL "Évaluations, étudiant·es, réglages et sauvegardes automatiques seront effacés de ce poste, sans retour possible."
!define HABILLAGE_TEXTE_SUPPRESSION_EXPORTS "Les documents que vous avez exportés ne sont pas touchés."
!define HABILLAGE_TEXTE_SUPPRIMER "Tout supprimer"
!define HABILLAGE_TEXTE_DESINSTALLER "Désinstaller"
!define HABILLAGE_TEXTE_ANNULER "Annuler"
!define HABILLAGE_TEXTE_DESINSTALLATION_EN_COURS "Désinstallation en cours…"
!define HABILLAGE_TEXTE_DESINSTALLE "${PRODUCTNAME} est désinstallé"
!define HABILLAGE_TEXTE_DONNEES_GARDEES "Vos données sont conservées sur ce poste."
!define HABILLAGE_TEXTE_DONNEES_SUPPRIMEES "Vos données ont été supprimées de ce poste."

; --- Couleurs (RRVVBB), celles de l'icône et de l'écran d'ouverture ---
!define HABILLAGE_PETROLE "10555F"
!define HABILLAGE_PETROLE_FONCE "0C444C"
!define HABILLAGE_AMBRE "E9B978"
!define HABILLAGE_ENCRE "0B3D44"
!define HABILLAGE_BLANC "FFFFFF"
!define HABILLAGE_DOUX "D6E6E6"
; Les mêmes pour les messages Windows, qui les veulent en 0x00BBVVRR.
!define HABILLAGE_REF_AMBRE 0x0078B9E9
!define HABILLAGE_REF_PETROLE_FONCE 0x004C440C
!define HABILLAGE_REF_ENCRE 0x00443D0B

; --- Polices : fichiers, et noms sous lesquels Windows les connaît une fois chargés ---
!define HABILLAGE_POLICE_TEXTE_FICHIER "public-sans-400.ttf"
!define HABILLAGE_POLICE_BOUTON_FICHIER "public-sans-600.ttf"
!define HABILLAGE_POLICE_TITRE_FICHIER "bricolage-grotesque-700.ttf"

; --- Cotes de la maquette ---
!define HABILLAGE_LARGEUR 500
!define HABILLAGE_HAUTEUR 360
!define HABILLAGE_MARGE 44
!define HABILLAGE_BOUTON_LARGEUR 190
!define HABILLAGE_BOUTON_HAUTEUR 40
; Taille du grand logotype, celle de l'image à 100 % (outils/habillage-installeur.ts).
!define HABILLAGE_LOGOTYPE_LARGEUR 233
!define HABILLAGE_LOGOTYPE_HAUTEUR 47
!define HABILLAGE_LOGOTYPE_X 133

; --- Constantes Windows absentes des en-têtes de NSIS ---
!define /ifndef WS_CLIPSIBLINGS 0x04000000
!define /ifndef SS_NOTIFY 0x0100
!define /ifndef SS_CENTERIMAGE 0x0200
!define /ifndef SS_NOPREFIX 0x0080
!define /ifndef SS_ENDELLIPSIS 0x4000
!define /ifndef SS_PATHELLIPSIS 0x8000
!define /ifndef STM_SETIMAGE 0x0172
; SS_CENTERIMAGE | SS_PATHELLIPSIS | SS_NOPREFIX
!define HABILLAGE_STYLE_CHEMIN 0x8280
!define /ifndef IMAGE_BITMAP 0

Var HabillageEchelle ; 100, 125, 150… : échelle des cotes et des images
Var HabillageDialogue
Var HabillagePersonnaliser ; 1 quand la page « Personnaliser » est demandée
Var HabillageSansMenuDemarrer ; 1 quand la case du menu Démarrer est décochée
Var HabillageRaccourciBureau ; 1 quand la case du bureau est cochée
Var HabillageSupprimerDonnees ; désinstalleur : 1 quand la suppression des données est demandée et confirmée
Var HabillageSuppressionDemandee ; désinstalleur : 1 quand la case est cochée, avant confirmation
Var HabillageCaseDonnees
Var HabillagePoliceTexte
Var HabillagePoliceTitre
Var HabillagePoliceBouton
Var HabillagePoliceCroix
Var HabillageImageGrand
Var HabillageImagePetit
Var HabillageImageBouton
Var HabillageLienPrincipal
Var HabillageLienSecondaire
Var HabillageLienModifier
Var HabillageCaseMenu
Var HabillageCaseBureau
Var HabillageChemin
Var HabillageEtat ; texte sous la barre de progression

; Les fonctions du désinstalleur doivent porter le préfixe « un. » : ces deux macros
; choisissent le bon nom selon l'endroit d'où elles sont appelées.
!macro HabillageAppeler fonction
  !ifdef __UNINSTALL__
    Call un.${fonction}
  !else
    Call ${fonction}
  !endif
!macroend

!macro HabillageSurClic poignee fonction
  !ifdef __UNINSTALL__
    ${NSD_OnClick} ${poignee} un.${fonction}
  !else
    ${NSD_OnClick} ${poignee} ${fonction}
  !endif
!macroend

; Cache un élément de la fenêtre du modèle d'origine.
!macro HabillageCacher identifiant
  GetDlgItem $6 $HWNDPARENT ${identifiant}
  ShowWindow $6 ${SW_HIDE}
!macroend

; Rend en $0 $1 $2 $3 le rectangle de la maquette (x, y, largeur, hauteur) à l'échelle de l'écran.
!macro HabillageRectangle x y largeur hauteur
  IntOp $0 ${x} * $HabillageEchelle
  IntOp $0 $0 / 100
  IntOp $1 ${y} * $HabillageEchelle
  IntOp $1 $1 / 100
  IntOp $2 ${largeur} * $HabillageEchelle
  IntOp $2 $2 / 100
  IntOp $3 ${hauteur} * $HabillageEchelle
  IntOp $3 $3 / 100
!macroend

; Deux zones superposées : celle du dessous est créée avec WS_CLIPSIBLINGS, pour
; ne pas se redessiner par-dessus l'autre, et celle du dessus est montée en tête
; avec cette macro (HWND_TOP, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE). L'ordre
; ne dépend ainsi pas de celui de leur création.
!macro HabillageAuDessus poignee
  System::Call 'user32::SetWindowPos(p ${poignee}, p 0, i 0, i 0, i 0, i 0, i 0x13)'
!macroend

; Fond d'une zone superposée : un aplat ou une image, sous un texte. Rend sa poignée en $4.
!macro HabillageFond x y largeur hauteur style
  !insertmacro HabillageRectangle ${x} ${y} ${largeur} ${hauteur}
  nsDialogs::CreateControl STATIC ${DEFAULT_STYLES}|${SS_NOTIFY}|${WS_CLIPSIBLINGS}|${style} 0 $0 $1 $2 $3 ""
  Pop $4
!macroend

; Texte fixe. Rend sa poignée en $4.
!macro HabillageTexte x y largeur hauteur style texte police couleur fond
  !insertmacro HabillageRectangle ${x} ${y} ${largeur} ${hauteur}
  ${NSD_CreateLabel} $0 $1 $2 $3 "${texte}"
  Pop $4
  ${NSD_AddStyle} $4 ${style}
  SendMessage $4 ${WM_SETFONT} ${police} 0
  SetCtlColors $4 ${couleur} ${fond}
!macroend

; Lien : un vrai contrôle, qui prend le focus au clavier. Sa zone épouse son texte
; (nsDialogs dessine le texte en haut à gauche de la zone), posée dans le rectangle
; donné : « centre » ou « gauche ». Rend sa poignée en $4.
!macro HabillageLien x y largeur hauteur position texte police couleur fond fonction
  !insertmacro HabillageRectangle ${x} ${y} ${largeur} ${hauteur}
  StrCpy $R8 "${texte}"
  StrCpy $R9 ${police}
  !insertmacro HabillageAppeler HabillageMesurer
  !if "${position}" == "centre"
    IntOp $7 $2 - $5
    IntOp $7 $7 / 2
    IntOp $0 $0 + $7
  !endif
  IntOp $7 $3 - $6
  IntOp $7 $7 / 2
  IntOp $1 $1 + $7
  ${NSD_CreateLink} $0 $1 $5 $6 "${texte}"
  Pop $4
  SendMessage $4 ${WM_SETFONT} ${police} 0
  SetCtlColors $4 ${couleur} ${fond}
  !insertmacro HabillageSurClic $4 ${fonction}
!macroend

; Bouton principal : l'image du pavé ambre aux coins arrondis et, par-dessus, un
; lien qui porte le texte (net à toute échelle, et atteignable au clavier).
; Rend la poignée du lien en $HabillageLienPrincipal.
!macro HabillageBoutonPrincipal x y texte fonction
  !insertmacro HabillageLien ${x} ${y} ${HABILLAGE_BOUTON_LARGEUR} ${HABILLAGE_BOUTON_HAUTEUR} centre "${texte}" $HabillagePoliceBouton ${HABILLAGE_ENCRE} ${HABILLAGE_AMBRE} ${fonction}
  StrCpy $HabillageLienPrincipal $4
  !insertmacro HabillageFond ${x} ${y} ${HABILLAGE_BOUTON_LARGEUR} ${HABILLAGE_BOUTON_HAUTEUR} ${SS_BITMAP}
  SendMessage $4 ${STM_SETIMAGE} ${IMAGE_BITMAP} $HabillageImageBouton
  !insertmacro HabillageSurClic $4 ${fonction}
  !insertmacro HabillageAuDessus $HabillageLienPrincipal
!macroend

; Le logotype, centré ; le tenir fait glisser la fenêtre.
!macro HabillageLogotype y
  !insertmacro HabillageRectangle ${HABILLAGE_LOGOTYPE_X} ${y} ${HABILLAGE_LOGOTYPE_LARGEUR} ${HABILLAGE_LOGOTYPE_HAUTEUR}
  ${NSD_CreateBitmap} $0 $1 $2 $3 ""
  Pop $4
  SendMessage $4 ${STM_SETIMAGE} ${IMAGE_BITMAP} $HabillageImageGrand
  !insertmacro HabillageSurClic $4 HabillageDeplacer
!macroend

; Case à cocher : la case seule, native, et son libellé à côté. Windows ne laisse
; pas colorer le texte d'une case à cocher ; son texte est donc hors de sa zone, où
; il sert de nom aux lecteurs d'écran. Rend la poignée de la case en $9.
!macro HabillageCase x y largeur texte fonctionLibelle
  !insertmacro HabillageRectangle ${x} ${y} 16 16
  ${NSD_CreateCheckbox} $0 $1 $2 $3 "${texte}"
  Pop $9
  SetCtlColors $9 "" ${HABILLAGE_PETROLE}
  IntOp $8 ${x} + 26
  IntOp $7 ${y} - 2
  !insertmacro HabillageTexte $8 $7 ${largeur} 20 ${SS_NOTIFY} "${texte}" $HabillagePoliceTexte ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  !insertmacro HabillageSurClic $4 ${fonctionLibelle}
!macroend

; Écrit sous la barre de progression pourquoi l'installation s'arrête : sans cela,
; la page resterait figée sans un mot. À appeler juste avant Abort.
!macro HabillageSignalerEchec message
  SendMessage $HabillageEtat ${WM_SETTEXT} 0 "STR:${message}"
!macroend

; Extrait dans le dossier temporaire les images de l'échelle donnée, et elles seules.
!macro HabillageExtraireImages echelle
  StrCpy $HabillageEchelle ${echelle}
  File "/oname=$PLUGINSDIR\logotype-grand.bmp" "${HABILLAGE_FICHIERS}\logotype-grand-${echelle}.bmp"
  File "/oname=$PLUGINSDIR\logotype-petit.bmp" "${HABILLAGE_FICHIERS}\logotype-petit-${echelle}.bmp"
  File "/oname=$PLUGINSDIR\bouton.bmp" "${HABILLAGE_FICHIERS}\bouton-${echelle}.bmp"
!macroend

; Rend la police du fichier utilisable par l'installeur seul (FR_PRIVATE), sans
; l'installer sur le poste. Met $R0 à 0 si Windows la refuse.
!macro HabillageChargerPolice fichier
  File "/oname=$PLUGINSDIR\${fichier}" "${HABILLAGE_FICHIERS}\${fichier}"
  System::Call 'gdi32::AddFontResourceExW(w "$PLUGINSDIR\${fichier}", i 0x10, p 0) i .r0'
  ${If} $0 = 0
    StrCpy $R0 0
  ${EndIf}
!macroend

!macro HabillageChargerImage fichier variable
  System::Call 'user32::LoadImageW(p 0, w "$PLUGINSDIR\${fichier}", i ${IMAGE_BITMAP}, i 0, i 0, i 0x10) p .s'
  Pop ${variable}
!macroend

; --- Fonctions communes à l'installeur et au désinstalleur ---
; Écrites une fois, produites deux fois : sans préfixe, puis avec « un. ».

!macro HabillageFonctionsCommunes un
; Largeur ($5) et hauteur ($6) du texte $R8 dans la police $R9, avec de quoi loger
; le cadre de focus et l'écart entre cette mesure et le tracé. Modifie $7, $8 et $9.
Function ${un}HabillageMesurer
  System::Call 'user32::GetDC(p $HWNDPARENT) p .r7'
  System::Call 'gdi32::SelectObject(p r7, p $R9) p .r8'
  StrLen $9 $R8
  System::Call '*(i 0, i 0) p .r6'
  System::Call 'gdi32::GetTextExtentPoint32W(p r7, w R8, i r9, p r6)'
  System::Call '*$6(i .r5, i .r9)'
  System::Free $6
  StrCpy $6 $9
  System::Call 'gdi32::SelectObject(p r7, p r8)'
  System::Call 'user32::ReleaseDC(p $HWNDPARENT, p r7)'
  IntOp $5 $5 + 8
FunctionEnd

; Appelée une fois, à la création de la fenêtre (pas en installation silencieuse,
; qui n'a pas de fenêtre) : retire la barre de titre et tout ce que le modèle
; d'origine pose autour des pages, et donne à la page toute la fenêtre.
Function ${un}HabillagePreparerFenetre
  InitPluginsDir

  ; Points par pouce de l'écran : 96 à 100 %.
  System::Call 'user32::GetDC(p 0) p .r0'
  System::Call 'gdi32::GetDeviceCaps(p r0, i 88) i .r1'
  System::Call 'user32::ReleaseDC(p 0, p r0)'
  ${If} $1 >= 288
    !insertmacro HabillageExtraireImages 300
  ${ElseIf} $1 >= 240
    !insertmacro HabillageExtraireImages 250
  ${ElseIf} $1 >= 192
    !insertmacro HabillageExtraireImages 200
  ${ElseIf} $1 >= 168
    !insertmacro HabillageExtraireImages 175
  ${ElseIf} $1 >= 144
    !insertmacro HabillageExtraireImages 150
  ${ElseIf} $1 >= 120
    !insertmacro HabillageExtraireImages 125
  ${Else}
    !insertmacro HabillageExtraireImages 100
  ${EndIf}
  !insertmacro HabillageChargerImage "logotype-grand.bmp" $HabillageImageGrand
  !insertmacro HabillageChargerImage "logotype-petit.bmp" $HabillageImagePetit
  !insertmacro HabillageChargerImage "bouton.bmp" $HabillageImageBouton

  ; Les polices du site ; à défaut, celle de Windows.
  StrCpy $R0 1
  !insertmacro HabillageChargerPolice "${HABILLAGE_POLICE_TEXTE_FICHIER}"
  !insertmacro HabillageChargerPolice "${HABILLAGE_POLICE_BOUTON_FICHIER}"
  !insertmacro HabillageChargerPolice "${HABILLAGE_POLICE_TITRE_FICHIER}"
  ${If} $R0 = 1
    CreateFont $HabillagePoliceTexte "Public Sans" 9 400
    CreateFont $HabillagePoliceTitre "Bricolage Grotesque" 14 700
    CreateFont $HabillagePoliceBouton "Public Sans SemiBold" 11 600
    CreateFont $HabillagePoliceCroix "Public Sans" 15 400
  ${Else}
    CreateFont $HabillagePoliceTexte "Segoe UI" 9 400
    CreateFont $HabillagePoliceTitre "Segoe UI" 14 700
    CreateFont $HabillagePoliceBouton "Segoe UI" 11 600
    CreateFont $HabillagePoliceCroix "Segoe UI" 15 400
  ${EndIf}

  ; Sans barre de titre ni bordure : WS_POPUP, moins WS_CAPTION et WS_THICKFRAME ;
  ; côté styles étendus, moins les quatre bordures possibles d'une boîte de dialogue.
  System::Call 'user32::GetWindowLongW(p $HWNDPARENT, i -16) i .r0'
  IntOp $0 $0 & 0xFF3BFFFF
  IntOp $0 $0 | 0x80000000
  System::Call 'user32::SetWindowLongW(p $HWNDPARENT, i -16, i r0)'
  System::Call 'user32::GetWindowLongW(p $HWNDPARENT, i -20) i .r0'
  IntOp $0 $0 & 0xFFFDFCFE
  System::Call 'user32::SetWindowLongW(p $HWNDPARENT, i -20, i r0)'
  SetCtlColors $HWNDPARENT "" ${HABILLAGE_PETROLE}

  ; À la taille de la maquette, au centre de l'écran (SWP_NOZORDER | SWP_FRAMECHANGED).
  !insertmacro HabillageRectangle 0 0 ${HABILLAGE_LARGEUR} ${HABILLAGE_HAUTEUR}
  System::Call 'user32::GetSystemMetrics(i 0) i .r4'
  System::Call 'user32::GetSystemMetrics(i 1) i .r5'
  IntOp $4 $4 - $2
  IntOp $4 $4 / 2
  IntOp $5 $5 - $3
  IntOp $5 $5 / 2
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, p 0, i r4, i r5, i r2, i r3, i 0x24)'

  ; Windows 11 : coins arrondis et liseré foncé. Sans effet sur les versions d'avant.
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 33, *i 2, i 4)'
  System::Call 'dwmapi::DwmSetWindowAttribute(p $HWNDPARENT, i 34, *i ${HABILLAGE_REF_ENCRE}, i 4)'

  ; La zone des pages (1018) prend toute la fenêtre.
  GetDlgItem $6 $HWNDPARENT 1018
  System::Call 'user32::SetWindowPos(p r6, p 0, i 0, i 0, i r2, i r3, i 0x14)'

  ; En-tête, filets et mention de bas de fenêtre du modèle : cachés.
  !insertmacro HabillageCacher 1028
  !insertmacro HabillageCacher 1034
  !insertmacro HabillageCacher 1035
  !insertmacro HabillageCacher 1036
  !insertmacro HabillageCacher 1037
  !insertmacro HabillageCacher 1038
  !insertmacro HabillageCacher 1039
  !insertmacro HabillageCacher 1044
  !insertmacro HabillageCacher 1045
  !insertmacro HabillageCacher 1256

  ; « Précédent » (3) et « Suivant » (1) sortent de la fenêtre et du parcours de
  ; Tab, mais restent actifs : NSIS s'en sert pour passer d'une page à l'autre, et
  ; « Suivant », bouton par défaut, répond à la touche Entrée.
  GetDlgItem $6 $HWNDPARENT 1
  System::Call 'user32::SetWindowLongW(p r6, i -16, i 0x50000001)'
  System::Call 'user32::SetWindowPos(p r6, p 0, i -2000, i -2000, i 0, i 0, i 0x15)'
  GetDlgItem $6 $HWNDPARENT 3
  System::Call 'user32::SetWindowLongW(p r6, i -16, i 0x50000000)'
  System::Call 'user32::SetWindowPos(p r6, p 0, i -2000, i -2000, i 0, i 0, i 0x15)'

  ; « Annuler » (2) devient la croix de fermeture, en haut à droite. Le bouton reste
  ; celui de NSIS, qui le désactive pendant l'installation et le réactive si elle
  ; échoue : c'est alors le seul moyen de fermer à la souris. Dessiné par son
  ; propriétaire (0x0B), il ne trace rien ; la croix est un texte posé par-dessus,
  ; que les clics traversent.
  !insertmacro HabillageRectangle 458 6 34 30
  GetDlgItem $6 $HWNDPARENT 2
  System::Call 'user32::SetWindowLongW(p r6, i -16, i 0x5400000B)'
  SetCtlColors $6 "" ${HABILLAGE_PETROLE}
  System::Call 'user32::SetWindowPos(p r6, p 0, i r0, i r1, i r2, i r3, i 0x34)'
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w "${HABILLAGE_TEXTE_CROIX}", i 0x50000281, i r0, i r1, i r2, i r3, p $HWNDPARENT, p 0, p 0, p 0) p .r7'
  SendMessage $7 ${WM_SETFONT} $HabillagePoliceCroix 0
  SetCtlColors $7 ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}
  !insertmacro HabillageAuDessus $7
FunctionEnd

; Ouvre une page vide aux couleurs de DNMAX, avec en haut la bande qui sert à
; déplacer la fenêtre (elle s'arrête avant la croix).
Function ${un}HabillageOuvrirPage
  nsDialogs::Create 1018
  Pop $HabillageDialogue
  ${If} $HabillageDialogue == error
    Abort
  ${EndIf}
  ; La croix appartient à la fenêtre, pas à la page : la page ne doit pas la recouvrir.
  ${NSD_AddStyle} $HabillageDialogue ${WS_CLIPSIBLINGS}
  SetCtlColors $HabillageDialogue "" ${HABILLAGE_PETROLE}
  !insertmacro HabillageTexte 0 0 456 30 ${SS_NOTIFY} "" $HabillagePoliceTexte ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  !insertmacro HabillageSurClic $4 HabillageDeplacer
FunctionEnd

; Fait suivre la fenêtre à la souris, comme si on la tenait par sa barre de titre.
Function ${un}HabillageDeplacer
  Pop $0
  System::Call 'user32::ReleaseCapture()'
  SendMessage $HWNDPARENT ${WM_NCLBUTTONDOWN} 2 0
FunctionEnd

; Clic sur le bouton principal d'une page : le focus va au bouton, pour que la
; fonction « Quitter… » de la page ne prenne pas ce clic pour celui d'un lien.
Function ${un}HabillageCliquerPrincipal
  Pop $0
  ${NSD_SetFocus} $HabillageLienPrincipal
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

; Clic sur le lien secondaire d'une page (« Personnaliser l'installation », « Fermer »).
Function ${un}HabillageCliquerSecondaire
  Pop $0
  ${NSD_SetFocus} $HabillageLienSecondaire
  SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
FunctionEnd

; La page reste celle de NSIS (barre de progression, liste des opérations) : elle
; est seulement redessinée, et la liste cachée.
Function ${un}HabillagePageInstallation
  FindWindow $HabillageDialogue "#32770" "" $HWNDPARENT
  System::Call 'user32::GetWindowLongW(p $HabillageDialogue, i -16) i .r0'
  IntOp $0 $0 | ${WS_CLIPSIBLINGS}
  System::Call 'user32::SetWindowLongW(p $HabillageDialogue, i -16, i r0)'
  SetCtlColors $HabillageDialogue "" ${HABILLAGE_PETROLE}
  ; NSIS pose cette page dans la zone des pages sans l'agrandir : elle garde la
  ; taille du modèle d'origine, plus petite que la fenêtre, et couperait le bas.
  !insertmacro HabillageRectangle 0 0 ${HABILLAGE_LARGEUR} ${HABILLAGE_HAUTEUR}
  System::Call 'user32::SetWindowPos(p $HabillageDialogue, p 0, i 0, i 0, i r2, i r3, i 0x14)'

  ; Le logotype (STATIC, SS_BITMAP).
  !insertmacro HabillageRectangle ${HABILLAGE_LOGOTYPE_X} 108 ${HABILLAGE_LOGOTYPE_LARGEUR} ${HABILLAGE_LOGOTYPE_HAUTEUR}
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w "", i 0x5000000E, i r0, i r1, i r2, i r3, p $HabillageDialogue, p 0, p 0, p 0) p .r4'
  SendMessage $4 ${STM_SETIMAGE} ${IMAGE_BITMAP} $HabillageImageGrand

  ; Bouton « Plus d'infos » : caché.
  GetDlgItem $4 $HabillageDialogue 1027
  ShowWindow $4 ${SW_HIDE}

  ; Barre de progression : fine, ambre sur pétrole foncé. Les couleurs ne
  ; s'appliquent qu'à une barre sans thème Windows ni bordure.
  GetDlgItem $4 $HabillageDialogue 1004
  System::Call 'uxtheme::SetWindowTheme(p r4, w " ", w " ")'
  System::Call 'user32::GetWindowLongW(p r4, i -16) i .r0'
  IntOp $0 $0 & 0xFF7FFFFF
  System::Call 'user32::SetWindowLongW(p r4, i -16, i r0)'
  System::Call 'user32::GetWindowLongW(p r4, i -20) i .r0'
  IntOp $0 $0 & 0xFFFDFCFE
  System::Call 'user32::SetWindowLongW(p r4, i -20, i r0)'
  SendMessage $4 0x0409 0 ${HABILLAGE_REF_AMBRE}
  SendMessage $4 0x2001 0 ${HABILLAGE_REF_PETROLE_FONCE}
  !insertmacro HabillageRectangle 60 190 380 6
  System::Call 'user32::SetWindowPos(p r4, p 0, i r0, i r1, i r2, i r3, i 0x34)'

  ; Ligne d'état de NSIS, qui défile au fil des fichiers : cachée. À sa place, un
  ; texte fixe (STATIC centré), avec la place de trois lignes pour le message
  ; qu'installeur.nsi y écrit quand l'installation s'arrête (HabillageSignalerEchec).
  GetDlgItem $4 $HabillageDialogue 1006
  ShowWindow $4 ${SW_HIDE}
  !insertmacro HabillageRectangle 60 208 380 60
  !ifdef __UNINSTALL__
    StrCpy $5 "${HABILLAGE_TEXTE_DESINSTALLATION_EN_COURS}"
  !else
    StrCpy $5 "${HABILLAGE_TEXTE_EN_COURS}"
  !endif
  System::Call 'user32::CreateWindowExW(i 0, w "STATIC", w r5, i 0x50000081, i r0, i r1, i r2, i r3, p $HabillageDialogue, p 0, p 0, p 0) p .s'
  Pop $HabillageEtat
  SendMessage $HabillageEtat ${WM_SETFONT} $HabillagePoliceTexte 0
  SetCtlColors $HabillageEtat ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}

  ; Liste des opérations : cachée.
  GetDlgItem $4 $HabillageDialogue 1016
  ShowWindow $4 ${SW_HIDE}
FunctionEnd
!macroend
!insertmacro HabillageFonctionsCommunes ""
!insertmacro HabillageFonctionsCommunes "un."

; À la fermeture : rend les polices, sans quoi leurs fichiers resteraient
; verrouillés dans le dossier temporaire, qui ne pourrait pas être supprimé.
!macro HabillageRendrePolices
  System::Call 'gdi32::RemoveFontResourceExW(w "$PLUGINSDIR\${HABILLAGE_POLICE_TEXTE_FICHIER}", i 0x10, p 0)'
  System::Call 'gdi32::RemoveFontResourceExW(w "$PLUGINSDIR\${HABILLAGE_POLICE_BOUTON_FICHIER}", i 0x10, p 0)'
  System::Call 'gdi32::RemoveFontResourceExW(w "$PLUGINSDIR\${HABILLAGE_POLICE_TITRE_FICHIER}", i 0x10, p 0)'
!macroend
Function .onGUIEnd
  !insertmacro HabillageRendrePolices
FunctionEnd
Function un.onGUIEnd
  !insertmacro HabillageRendrePolices
FunctionEnd

; --- Installeur ---

; « Installer », « Mettre à jour » ou « Réinstaller », selon la version déjà présente. Rend le mot en $R6.
Function HabillageVerbe
  StrCpy $R6 "${HABILLAGE_TEXTE_INSTALLER}"
  ReadRegStr $0 SHCTX "${UNINSTKEY}" "DisplayVersion"
  ${If} $0 != ""
    nsis_tauri_utils::SemverCompare "${VERSION}" $0
    Pop $1
    ${If} $1 = 1
      StrCpy $R6 "${HABILLAGE_TEXTE_METTRE_A_JOUR}"
    ${ElseIf} $1 = 0
      StrCpy $R6 "${HABILLAGE_TEXTE_REINSTALLER}"
    ${EndIf}
  ${EndIf}
FunctionEnd

; --- Page 1 : accueil ---

Function HabillagePageAccueil
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  StrCpy $HabillagePersonnaliser 0
  !insertmacro HabillageAppeler HabillageOuvrirPage
  !insertmacro HabillageLogotype 84
  !insertmacro HabillageTexte 0 150 ${HABILLAGE_LARGEUR} 22 ${SS_CENTER} "${HABILLAGE_TEXTE_DEVISE}" $HabillagePoliceTexte ${HABILLAGE_AMBRE} ${HABILLAGE_PETROLE}
  !insertmacro HabillageAppeler HabillageVerbe
  !insertmacro HabillageBoutonPrincipal 155 236 "$R6" HabillageCliquerPrincipal
  !insertmacro HabillageLien 0 288 ${HABILLAGE_LARGEUR} 24 centre "${HABILLAGE_TEXTE_PERSONNALISER}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE} HabillageCliquerSecondaire
  StrCpy $HabillageLienSecondaire $4
  ${NSD_SetFocus} $HabillageLienPrincipal
  nsDialogs::Show
FunctionEnd

Function HabillageQuitterAccueil
  System::Call 'user32::GetFocus() p .r0'
  ${If} $0 = $HabillageLienSecondaire
    StrCpy $HabillagePersonnaliser 1
  ${EndIf}
FunctionEnd

; --- Page 1 bis : personnaliser, seulement si on l'a demandée ---

Function HabillagePagePersonnaliser
  ${If} $PassiveMode = 1
  ${OrIf} $HabillagePersonnaliser <> 1
    Abort
  ${EndIf}
  !insertmacro HabillageAppeler HabillageOuvrirPage

  !insertmacro HabillageRectangle 40 32 139 28
  ${NSD_CreateBitmap} $0 $1 $2 $3 ""
  Pop $4
  SendMessage $4 ${STM_SETIMAGE} ${IMAGE_BITMAP} $HabillageImagePetit
  !insertmacro HabillageSurClic $4 HabillageDeplacer
  !insertmacro HabillageTexte ${HABILLAGE_MARGE} 82 412 28 0 "${HABILLAGE_TEXTE_PERSONNALISER}" $HabillagePoliceTitre ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}

  !insertmacro HabillageCase ${HABILLAGE_MARGE} 128 380 "${HABILLAGE_TEXTE_MENU_DEMARRER}" HabillageBasculerMenu
  StrCpy $HabillageCaseMenu $9
  ${If} $HabillageSansMenuDemarrer <> 1
    ${NSD_Check} $HabillageCaseMenu
  ${EndIf}
  !insertmacro HabillageCase ${HABILLAGE_MARGE} 156 380 "${HABILLAGE_TEXTE_BUREAU}" HabillageBasculerBureau
  StrCpy $HabillageCaseBureau $9
  ${If} $HabillageRaccourciBureau = 1
    ${NSD_Check} $HabillageCaseBureau
  ${EndIf}

  !insertmacro HabillageTexte ${HABILLAGE_MARGE} 196 412 18 0 "${HABILLAGE_TEXTE_DOSSIER}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}
  ; Le chemin, abrégé en son milieu s'il est trop long, sur un cartouche foncé.
  !insertmacro HabillageTexte 54 218 300 30 ${HABILLAGE_STYLE_CHEMIN} "$INSTDIR" $HabillagePoliceTexte ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE_FONCE}
  StrCpy $HabillageChemin $4
  !insertmacro HabillageFond ${HABILLAGE_MARGE} 218 320 30 0
  SetCtlColors $4 "" ${HABILLAGE_PETROLE_FONCE}
  !insertmacro HabillageAuDessus $HabillageChemin
  !insertmacro HabillageLien 376 218 80 30 gauche "${HABILLAGE_TEXTE_MODIFIER}" $HabillagePoliceTexte ${HABILLAGE_AMBRE} ${HABILLAGE_PETROLE} HabillageChoisirDossier
  StrCpy $HabillageLienModifier $4

  !insertmacro HabillageLien ${HABILLAGE_MARGE} 290 120 ${HABILLAGE_BOUTON_HAUTEUR} gauche "${HABILLAGE_TEXTE_RETOUR}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE} HabillageRevenir
  StrCpy $HabillageLienSecondaire $4
  !insertmacro HabillageAppeler HabillageVerbe
  !insertmacro HabillageBoutonPrincipal 266 290 "$R6" HabillageCliquerPrincipal
  ${NSD_SetFocus} $HabillageCaseMenu
  nsDialogs::Show
FunctionEnd

Function HabillageBasculerMenu
  Pop $0
  SendMessage $HabillageCaseMenu ${BM_CLICK} 0 0
FunctionEnd

Function HabillageBasculerBureau
  Pop $0
  SendMessage $HabillageCaseBureau ${BM_CLICK} 0 0
FunctionEnd

; Retient l'état des deux cases : appelée avant de quitter la page, dans un sens comme dans l'autre.
Function HabillageRetenirCases
  StrCpy $HabillageSansMenuDemarrer 1
  ${NSD_GetState} $HabillageCaseMenu $0
  ${If} $0 = ${BST_CHECKED}
    StrCpy $HabillageSansMenuDemarrer 0
  ${EndIf}
  StrCpy $HabillageRaccourciBureau 0
  ${NSD_GetState} $HabillageCaseBureau $0
  ${If} $0 = ${BST_CHECKED}
    StrCpy $HabillageRaccourciBureau 1
  ${EndIf}
FunctionEnd

; « Retour » : revient à l'accueil (message de NSIS pour changer de page, ici d'un cran en arrière).
Function HabillageRevenir
  Pop $0
  !insertmacro HabillageAppeler HabillageRetenirCases
  SendMessage $HWNDPARENT 0x408 -1 0
FunctionEnd

; Fait choisir un dossier dans le sélecteur de l'Explorateur (IFileOpenDialog en
; mode dossiers, Windows Vista et suivants), ouvert sur le dossier qui contient
; $INSTDIR. Rend en $0 le dossier choisi, « error » si on a annulé, et « absent »
; si ce sélecteur n'existe pas sur ce poste.
; Les numéros sont les rangs des méthodes dans l'interface : 9 SetOptions
; (FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM), 12 SetFolder, 17 SetTitle, 3 Show,
; 20 GetResult, puis IShellItem 5 GetDisplayName (SIGDN_FILESYSPATH) ; 2 Release.
Function HabillageSelecteurDossier
  StrCpy $0 absent
  System::Call 'ole32::CoCreateInstance(g "{DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7}", p 0, i 1, g "{D57C7288-D4AD-4768-BE02-9D969532D960}", *p .r1) i .r2'
  ${If} $2 <> 0
  ${OrIf} $1 = 0
    Return
  ${EndIf}
  StrCpy $0 error
  System::Call '$1->9(i 0x60) i .r2'
  System::Call '$1->17(w "${HABILLAGE_TEXTE_CHOISIR_DOSSIER}") i .r2'
  ${GetParent} "$INSTDIR" $3
  System::Call 'shell32::SHCreateItemFromParsingName(w r3, p 0, g "{43826D1E-E718-42EE-BC55-A1E261C37BFE}", *p .r4) i .r2'
  ${If} $2 = 0
    System::Call '$1->12(p r4) i .r2'
    System::Call '$4->2()'
  ${EndIf}
  System::Call '$1->3(p $HWNDPARENT) i .r2'
  ${If} $2 = 0
    System::Call '$1->20(*p .r4) i .r2'
    ${If} $2 = 0
      System::Call '$4->5(i 0x80058000, *p .r5) i .r2'
      ${If} $2 = 0
        System::Call '*$5(&w${NSIS_MAX_STRLEN} .r0)'
        System::Call 'ole32::CoTaskMemFree(p r5)'
      ${EndIf}
      System::Call '$4->2()'
    ${EndIf}
  ${EndIf}
  System::Call '$1->2()'
FunctionEnd

; « Modifier… » : le dossier choisi reçoit le nom de l'application, sauf s'il le porte déjà.
Function HabillageChoisirDossier
  Pop $0
  Call HabillageSelecteurDossier
  ${If} $0 == absent
    nsDialogs::SelectFolderDialog "${HABILLAGE_TEXTE_CHOISIR_DOSSIER}" "$INSTDIR"
    Pop $0
  ${EndIf}
  ${If} $0 == error
  ${OrIf} $0 == ""
    Return
  ${EndIf}
  StrCpy $1 $0 1 -1
  ${If} $1 == "\"
    StrCpy $0 $0 -1
  ${EndIf}
  ${GetFileName} "$0" $1
  ${If} $1 != "${PRODUCTNAME}"
    StrCpy $0 "$0\${PRODUCTNAME}"
  ${EndIf}
  StrCpy $INSTDIR $0
  ${NSD_SetText} $HabillageChemin "$INSTDIR"
FunctionEnd

Function HabillageQuitterPersonnaliser
  !insertmacro HabillageAppeler HabillageRetenirCases
  System::Call 'user32::GetFocus() p .r0'
  ${If} $0 = $HabillageLienSecondaire
    System::Call 'user32::PostMessageW(p $HWNDPARENT, i 0x408, p -1, p 0)'
    Abort
  ${ElseIf} $0 = $HabillageLienModifier
    Push $0
    !insertmacro HabillageAppeler HabillageChoisirDossier
    Abort
  ${EndIf}
FunctionEnd

; --- Page 2 : installation ---

; --- Page 3 : fin ---

Function HabillagePageFin
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  !insertmacro HabillageAppeler HabillageOuvrirPage
  !insertmacro HabillageLogotype 84
  !insertmacro HabillageTexte 0 150 ${HABILLAGE_LARGEUR} 28 ${SS_CENTER} "${HABILLAGE_TEXTE_INSTALLE}" $HabillagePoliceTitre ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  !insertmacro HabillageTexte 0 182 ${HABILLAGE_LARGEUR} 20 ${SS_CENTER} "${HABILLAGE_TEXTE_PREMIER_LANCEMENT}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}
  !insertmacro HabillageBoutonPrincipal 155 236 "${HABILLAGE_TEXTE_OUVRIR}" HabillageCliquerPrincipal
  !insertmacro HabillageLien 0 288 ${HABILLAGE_LARGEUR} 24 centre "${HABILLAGE_TEXTE_FERMER}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE} HabillageCliquerSecondaire
  StrCpy $HabillageLienSecondaire $4
  ; La croix ferme sans ouvrir l'application, comme « Fermer ».
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
  ${NSD_SetFocus} $HabillageLienPrincipal
  nsDialogs::Show
FunctionEnd

Function HabillageQuitterPageFin
  System::Call 'user32::GetFocus() p .r0'
  ${If} $0 <> $HabillageLienSecondaire
    Call RunMainBinary
  ${EndIf}
FunctionEnd

; --- Désinstalleur ---

; Page 1 : confirmer, et choisir de garder ou de supprimer ses données. La case est
; décochée d'office, et la cocher mène à une seconde confirmation (page 1 bis) :
; c'est le seul endroit où DNMAX efface des données sans retour possible.
Function un.HabillagePageConfirmer
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  !insertmacro HabillageAppeler HabillageOuvrirPage
  !insertmacro HabillageLogotype 44
  !insertmacro HabillageTexte 0 106 ${HABILLAGE_LARGEUR} 30 ${SS_CENTER} "${HABILLAGE_TEXTE_DESINSTALLER_TITRE}" $HabillagePoliceTitre ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  !insertmacro HabillageCase 70 152 340 "${HABILLAGE_TEXTE_SUPPRIMER_DONNEES}" HabillageBasculerDonnees
  StrCpy $HabillageCaseDonnees $9
  ${If} $HabillageSuppressionDemandee = 1
    ${NSD_Check} $HabillageCaseDonnees
  ${EndIf}
  !insertmacro HabillageTexte 96 174 340 56 0 "${HABILLAGE_TEXTE_DONNEES_DETAIL}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}
  !insertmacro HabillageBoutonPrincipal 155 250 "${HABILLAGE_TEXTE_DESINSTALLER}" HabillageCliquerPrincipal
  !insertmacro HabillageLien 0 300 ${HABILLAGE_LARGEUR} 24 centre "${HABILLAGE_TEXTE_ANNULER}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE} HabillageFermer
  StrCpy $HabillageLienSecondaire $4
  ${NSD_SetFocus} $HabillageLienPrincipal
  nsDialogs::Show
FunctionEnd

Function un.HabillageBasculerDonnees
  Pop $0
  SendMessage $HabillageCaseDonnees ${BM_CLICK} 0 0
FunctionEnd

; « Annuler » : comme la croix.
Function un.HabillageFermer
  Pop $0
  SendMessage $HWNDPARENT ${WM_CLOSE} 0 0
FunctionEnd

Function un.HabillageQuitterConfirmer
  System::Call 'user32::GetFocus() p .r0'
  ${If} $0 = $HabillageLienSecondaire
    System::Call 'user32::PostMessageW(p $HWNDPARENT, i ${WM_CLOSE}, p 0, p 0)'
    Abort
  ${EndIf}
  ; La suppression n'est acquise qu'une fois confirmée, à la page suivante.
  StrCpy $HabillageSupprimerDonnees 0
  StrCpy $HabillageSuppressionDemandee 0
  ${NSD_GetState} $HabillageCaseDonnees $0
  ${If} $0 = ${BST_CHECKED}
    StrCpy $HabillageSuppressionDemandee 1
  ${EndIf}
FunctionEnd

; Page 1 bis : confirmer la suppression des données, seulement si la case est
; cochée. Le focus est sur « Retour » : Entrée ramène en arrière, et il faut
; choisir le bouton pour supprimer.
Function un.HabillagePageSuppression
  ${If} $PassiveMode = 1
  ${OrIf} $HabillageSuppressionDemandee <> 1
    Abort
  ${EndIf}
  !insertmacro HabillageAppeler HabillageOuvrirPage
  !insertmacro HabillageLogotype 44
  !insertmacro HabillageTexte 0 106 ${HABILLAGE_LARGEUR} 30 ${SS_CENTER} "${HABILLAGE_TEXTE_SUPPRESSION_TITRE}" $HabillagePoliceTitre ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  !insertmacro HabillageTexte 60 144 380 56 ${SS_CENTER} "${HABILLAGE_TEXTE_SUPPRESSION_DETAIL}" $HabillagePoliceTexte ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  !insertmacro HabillageTexte 60 204 380 36 ${SS_CENTER} "${HABILLAGE_TEXTE_SUPPRESSION_EXPORTS}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}
  !insertmacro HabillageBoutonPrincipal 155 250 "${HABILLAGE_TEXTE_SUPPRIMER}" HabillageCliquerPrincipal
  !insertmacro HabillageLien 0 300 ${HABILLAGE_LARGEUR} 24 centre "${HABILLAGE_TEXTE_RETOUR}" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE} HabillageRevenir
  StrCpy $HabillageLienSecondaire $4
  ${NSD_SetFocus} $HabillageLienSecondaire
  nsDialogs::Show
FunctionEnd

Function un.HabillageRevenir
  Pop $0
  SendMessage $HWNDPARENT 0x408 -1 0
FunctionEnd

Function un.HabillageQuitterSuppression
  System::Call 'user32::GetFocus() p .r0'
  ${If} $0 <> $HabillageLienPrincipal
    System::Call 'user32::PostMessageW(p $HWNDPARENT, i 0x408, p -1, p 0)'
    Abort
  ${EndIf}
  StrCpy $HabillageSupprimerDonnees 1
FunctionEnd

; Page 3 : fin, qui dit ce qu'il est advenu des données.
Function un.HabillagePageFin
  ${If} $PassiveMode = 1
  ${OrIf} $UpdateMode = 1
    Abort
  ${EndIf}
  !insertmacro HabillageAppeler HabillageOuvrirPage
  !insertmacro HabillageLogotype 84
  !insertmacro HabillageTexte 0 150 ${HABILLAGE_LARGEUR} 30 ${SS_CENTER} "${HABILLAGE_TEXTE_DESINSTALLE}" $HabillagePoliceTitre ${HABILLAGE_BLANC} ${HABILLAGE_PETROLE}
  ${If} $HabillageSupprimerDonnees = 1
    StrCpy $R6 "${HABILLAGE_TEXTE_DONNEES_SUPPRIMEES}"
  ${Else}
    StrCpy $R6 "${HABILLAGE_TEXTE_DONNEES_GARDEES}"
  ${EndIf}
  !insertmacro HabillageTexte 0 184 ${HABILLAGE_LARGEUR} 20 ${SS_CENTER} "$R6" $HabillagePoliceTexte ${HABILLAGE_DOUX} ${HABILLAGE_PETROLE}
  !insertmacro HabillageBoutonPrincipal 155 250 "${HABILLAGE_TEXTE_FERMER}" HabillageCliquerPrincipal
  StrCpy $HabillageLienSecondaire 0
  GetDlgItem $0 $HWNDPARENT 2
  EnableWindow $0 1
  ${NSD_SetFocus} $HabillageLienPrincipal
  nsDialogs::Show
FunctionEnd
