$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$node = "C:\Program Files\nodejs\node.exe"
$script = "apps\api\dist\main.js"

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName "ActivityRegistrationLocalApi" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName "ActivityRegistrationLocalApi"
