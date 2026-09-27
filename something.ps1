$ErrorActionPreference = "Stop"
$installer = Join-Path $PSScriptRoot "vs_community.exe"

if (-not (Test-Path -LiteralPath $installer)) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "vs_community.exe must be in the same folder as this script.",
        "Visual Studio Installer"
    ) | Out-Null
    exit 1
}

$arguments = @(
    "--wait"
    "--passive"
    "--norestart"
    "--add", "Microsoft.VisualStudio.Workload.Universal"
    "--add", "Microsoft.VisualStudio.Workload.NativeDesktop"
    "--add", "Microsoft.VisualStudio.Workload.ManagedDesktop"
    "--includeRecommended"
)

try {
    $process = Start-Process -FilePath $installer -ArgumentList $arguments -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Installer exited with code $($process.ExitCode)."
    }
} catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, "Visual Studio Installer") | Out-Null
    exit 1
}