!macro customInstall
  DetailPrint "Configuring Supergence AppData & Shell Registration..."

  ; Register in Windows App Paths (for Run dialog and shell execution)
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\Supergence.exe" "" "$INSTDIR\Supergence.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\Supergence.exe" "Path" "$INSTDIR"

  ; Register in Windows Applications for shell:appsfolder recognition
  WriteRegStr HKCU "Software\Classes\Applications\Supergence.exe" "FriendlyAppName" "Supergence SIS 1.0"
  WriteRegStr HKCU "Software\Classes\Applications\Supergence.exe" "ApplicationCompany" "Supergence"
  WriteRegStr HKCU "Software\Classes\Applications\Supergence.exe\DefaultIcon" "" "$INSTDIR\Supergence.exe,0"

  ; Initialize AppData structure for persistent user cognitive data
  CreateDirectory "$APPDATA\Supergence"
  CreateDirectory "$APPDATA\Supergence\data"
  CreateDirectory "$APPDATA\Supergence\data\conversations"
  CreateDirectory "$APPDATA\Supergence\data\memory"
  CreateDirectory "$APPDATA\Supergence\data\theories"
  CreateDirectory "$APPDATA\Supergence\data\research"
  CreateDirectory "$APPDATA\Supergence\data\rules"
  CreateDirectory "$APPDATA\Supergence\data\skills"
  CreateDirectory "$APPDATA\Supergence\data\tools\custom"
  CreateDirectory "$APPDATA\Supergence\workspace"

  ; Write supergence-config.json with chosen installation directory
  FileOpen $0 "$APPDATA\Supergence\supergence-config.json" w
  FileWrite $0 '{"installPath":"$INSTDIR","dataPath":"$APPDATA\\Supergence\\data","workspacePath":"$APPDATA\\Supergence\\workspace","version":"1.0.0"}'
  FileClose $0

  ; Copy config to installation directory
  CopyFiles "$APPDATA\Supergence\supergence-config.json" "$INSTDIR\supergence-config.json"

  ; Refresh Windows Shell so shell:appsfolder updates immediately
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\Supergence.exe"
  DeleteRegKey HKCU "Software\Classes\Applications\Supergence.exe"
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
