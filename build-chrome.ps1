# Genera la versión de Chrome (también Edge, Brave, Opera):
#   dist/karasu-metro-chrome-<versión>.zip
# Para instalarla: descomprimir, abrir chrome://extensions, activar
# "Modo de desarrollador" y "Cargar descomprimida" sobre la carpeta.
#
# Uso: powershell -ExecutionPolicy Bypass -File build-chrome.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Force $dist | Out-Null

$manifest = Get-Content (Join-Path $root "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$zipPath = Join-Path $dist ("karasu-metro-chrome-" + $manifest.version + ".zip")
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$files = @("manifest.json", "content.js", "theme.css", "popup.html", "popup.js")
$dirs = @("fonts", "icons")

# Rutas con "/" dentro del zip (Compress-Archive de PowerShell 5 usa "\")
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($zipPath, "Create")
try {
  foreach ($f in $files) {
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $root $f), $f)
  }
  foreach ($d in $dirs) {
    Get-ChildItem (Join-Path $root $d) -File | ForEach-Object {
      [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, "$d/$($_.Name)")
    }
  }
} finally {
  $zip.Dispose()
}

Write-Host "Listo: $zipPath"
