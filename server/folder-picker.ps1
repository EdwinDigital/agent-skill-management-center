$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$owner = New-Object System.Windows.Forms.Form
try {
    $owner.TopMost = $true
    $owner.ShowInTaskbar = $false
    $dialog.Description = 'Choose a Skill directory'
    $dialog.ShowNewFolderButton = $false
    $dialog.SelectedPath = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
    if ($env:AGENT_SMC_FOLDER_PICKER_INITIAL_PATH -and [IO.Directory]::Exists($env:AGENT_SMC_FOLDER_PICKER_INITIAL_PATH)) {
        $dialog.SelectedPath = $env:AGENT_SMC_FOLDER_PICKER_INITIAL_PATH
    }
    if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::Write($dialog.SelectedPath)
    }
} finally {
    $dialog.Dispose()
    $owner.Dispose()
}
