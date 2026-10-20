# Firma la versión de Firefox con Mozilla para USO PERSONAL.
#
# Usa el canal "unlisted": Mozilla firma el archivo pero NO lo publica en
# addons.mozilla.org. No aparece en la tienda ni en búsquedas; el .xpi
# firmado solo lo tienes tú y se instala en cualquier Firefox normal.
#
# Necesita las claves de API de tu cuenta de Mozilla (una sola vez):
#   https://addons.mozilla.org/developers/addon/api/key/
# Se piden al ejecutar el script (el secreto no se ve al escribirlo) o se
# leen de las variables de entorno AMO_JWT_ISSUER y AMO_JWT_SECRET. No se
# guardan en ningún sitio.
#
# Uso: powershell -ExecutionPolicy Bypass -File sign-firefox.ps1
# Resultado: dist/firmado/*.xpi

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# 1. Versión de Firefox al día
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "build-firefox.ps1")
if ($LASTEXITCODE -ne 0) { throw "Falló build-firefox.ps1" }

# 2. Claves de la cuenta de Mozilla
$issuer = $env:AMO_JWT_ISSUER
if (-not $issuer) { $issuer = Read-Host "Emisor JWT (empieza por user:)" }
$secret = $env:AMO_JWT_SECRET
if (-not $secret) {
  $secure = Read-Host "Secreto JWT" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $secret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# 3. Firma (web-ext lee las claves de estas variables; así no aparecen en
#    la línea de comandos del proceso)
$env:WEB_EXT_API_KEY = $issuer
$env:WEB_EXT_API_SECRET = $secret
try {
  npx --yes web-ext@8 sign `
    --channel unlisted `
    --source-dir (Join-Path $root "dist\firefox") `
    --artifacts-dir (Join-Path $root "dist\firmado")
  if ($LASTEXITCODE -ne 0) { throw "Mozilla no ha firmado la extensión (mira el mensaje de arriba)" }
} finally {
  Remove-Item Env:WEB_EXT_API_KEY, Env:WEB_EXT_API_SECRET -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Firmada. Pasale a tu amigo el .xpi de:" -ForegroundColor Green
Get-ChildItem (Join-Path $root "dist\firmado") -Filter *.xpi | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { Write-Host "  $($_.FullName)" }
