$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
$env:BUILD_COMMIT = (& git rev-parse --short HEAD).Trim()
$env:BUILD_TIME = (Get-Date).ToUniversalTime().ToString("o")
if (-not $env:APP_VERSION) { $env:APP_VERSION = "0.1.0-local" }
& "C:\Program Files\nodejs\node.exe" "apps\api\dist\main.js"
