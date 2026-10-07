@echo off
setlocal
cd /d "%~dp0.."
for /f "delims=" %%I in ('git rev-parse --short HEAD') do set "BUILD_COMMIT=%%I"
for /f "delims=" %%I in ('powershell -NoProfile -Command "(Get-Date).ToUniversalTime().ToString('o')"') do set "BUILD_TIME=%%I"
if not defined APP_VERSION set "APP_VERSION=0.1.0-local"
"C:\Program Files\nodejs\node.exe" "apps\api\dist\main.js"
