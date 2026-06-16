$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
& "C:\Program Files\nodejs\node.exe" "apps\api\dist\main.js"
