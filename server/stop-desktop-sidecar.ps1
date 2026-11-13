param(
    [Parameter(Mandatory = $true)]
    [string]$InstallDirectory
)

$ErrorActionPreference = 'Stop'

function Get-NormalizedPath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    if ($Path.StartsWith('\\?\UNC\')) {
        $Path = '\\' + $Path.Substring(8)
    } elseif ($Path.StartsWith('\\?\')) {
        $Path = $Path.Substring(4)
    }
    return [IO.Path]::GetFullPath($Path)
}

try {
    $installPath = (Get-NormalizedPath $InstallDirectory).TrimEnd('\')
    if ($installPath -eq [IO.Path]::GetPathRoot($installPath).TrimEnd('\')) {
        throw 'Refusing to clean processes for a drive root.'
    }
    $sidecarPath = [IO.Path]::Combine($installPath, 'sidecar-node') + '\'
    $comparison = [StringComparison]::OrdinalIgnoreCase
    $candidates = Get-CimInstance Win32_Process | Where-Object {
        $executable = Get-NormalizedPath $_.ExecutablePath
        $executable -and $executable.StartsWith($sidecarPath, $comparison)
    }
    foreach ($candidate in $candidates) {
        $process = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $process) { continue }
        try {
            if ($process.HasExited) { continue }
            $executable = Get-NormalizedPath $process.Path
            if (!$executable -or !$executable.StartsWith($sidecarPath, $comparison)) {
                throw "Unable to verify the background process path for PID $($candidate.ProcessId)."
            }
            $process.Kill()
            if (!$process.WaitForExit(10000)) {
                throw "Timed out stopping background process $($candidate.ProcessId)."
            }
        } catch {
            if (!$process.HasExited) { throw }
        } finally {
            $process.Dispose()
        }
    }

    $nodePath = [IO.Path]::Combine($sidecarPath, 'runtime', 'node.exe')
    if ([IO.File]::Exists($nodePath)) {
        $handle = [IO.File]::Open($nodePath, [IO.FileMode]::Open, [IO.FileAccess]::Write, [IO.FileShare]::None)
        $handle.Dispose()
    }
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
