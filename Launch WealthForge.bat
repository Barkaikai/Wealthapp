@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Launch WealthForge.ps1"
exit /b %errorlevel%
