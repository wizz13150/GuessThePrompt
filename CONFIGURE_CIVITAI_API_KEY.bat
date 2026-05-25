@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONFIGURE_CIVITAI_API_KEY.ps1"
pause
