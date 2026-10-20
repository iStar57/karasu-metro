# Genera la versión de Firefox de la extensión:
#   dist/firefox/                                  carpeta lista para cargar
#   dist/karasu-metro-firefox-<versión>.xpi paquete para firmar/instalar
#
# El código es el mismo que el de Chrome. Solo cambia el manifest: Firefox
# necesita un ID propio (browser_specific_settings.gecko) y que los permisos
# de host se declaren aparte. Esas claves no van en el manifest de Chrome
# porque Chrome las marca como "clave no reconocida".
#
# Uso: powershell -ExecutionPolicy Bypass -File build-firefox.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$dist = Join-Path $root "dist"
$out = Join-Path $dist "firefox"

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force $out | Out-Null

foreach ($f in "content.js", "theme.css", "popup.html", "popup.js") {
  Copy-Item (Join-Path $root $f) $out
}
Copy-Item (Join-Path $root "fonts") $out -Recurse
Copy-Item (Join-Path $root "icons") $out -Recurse

$manifest = Get-Content (Join-Path $root "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest | Add-Member -NotePropertyName host_permissions -NotePropertyValue $manifest.content_scripts[0].matches
$manifest | Add-Member -NotePropertyName browser_specific_settings -NotePropertyValue ([ordered]@{
    gecko = [ordered]@{
      # ID del nombre antiguo, a propósito: cambiarlo haría que Firefox la
      # tratara como otra extensión (sin actualizar ni conservar ajustes)
      id                          = "karasu-metro@extension"
      # @property, :has(), container queries y color-mix(): Firefox 128+
      strict_min_version          = "128.0"
      data_collection_permissions = [ordered]@{ required = @("none") }
    }
  })
# UTF-8 sin BOM: Firefox no acepta un manifest con BOM
$json = $manifest | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText((Join-Path $out "manifest.json"), $json, (New-Object Text.UTF8Encoding $false))

# El .xpi es un zip con rutas separadas por "/". Compress-Archive de
# PowerShell 5 las guarda con "\" y Firefox lo rechaza, así que se crea a mano.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$xpi = Join-Path $dist ("karasu-metro-firefox-" + $manifest.version + ".xpi")
if (Test-Path $xpi) { Remove-Item $xpi -Force }
$zip = [IO.Compression.ZipFile]::Open($xpi, "Create")
try {
  Get-ChildItem $out -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($out.Length + 1).Replace("\", "/")
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel)
  }
} finally {
  $zip.Dispose()
}

Write-Host "Listo:"
Write-Host "  Carpeta: $out"
Write-Host "  Paquete: $xpi"
