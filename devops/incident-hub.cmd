@echo off
rem Lanzador para Windows (cmd). Delega en PowerShell sin exigir cambiar la politica de ejecucion.
rem Ejemplos: devops\incident-hub.cmd start | stop | destroy -Yes
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0incident-hub.ps1" %*
exit /b %ERRORLEVEL%
