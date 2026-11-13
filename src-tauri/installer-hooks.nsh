!include LogicLib.nsh
!define AGENT_SMC_HOOK_DIR "${__FILEDIR__}"

!macro AGENT_SMC_STOP_SIDECAR SCRIPT
  !insertmacro CheckIfAppIsRunning "${MAINBINARYNAME}.exe" "${PRODUCTNAME}"
  StrCpy $2 "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe"
  ${If} ${FileExists} "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
    StrCpy $2 "$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
  ${EndIf}
  nsExec::ExecToStack /TIMEOUT=60000 '"$2" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "${SCRIPT}" -InstallDirectory "$INSTDIR"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    DetailPrint "$1"
    MessageBox MB_OK|MB_ICONSTOP "Unable to stop Agent SMC background services. Close Agent SMC and retry.$\r$\n$1" /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREINSTALL
  InitPluginsDir
  File "/oname=$PLUGINSDIR\agent-smc-stop-sidecar.ps1" "${AGENT_SMC_HOOK_DIR}\..\server\stop-desktop-sidecar.ps1"
  !insertmacro AGENT_SMC_STOP_SIDECAR "$PLUGINSDIR\agent-smc-stop-sidecar.ps1"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ${If} ${FileExists} "$INSTDIR\sidecar-node\server\stop-desktop-sidecar.ps1"
    !insertmacro AGENT_SMC_STOP_SIDECAR "$INSTDIR\sidecar-node\server\stop-desktop-sidecar.ps1"
  ${EndIf}
!macroend
