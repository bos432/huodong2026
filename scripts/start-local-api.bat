@echo off
setlocal
cd /d "%~dp0.."
"C:\Program Files\nodejs\node.exe" "apps\api\dist\main.js"
