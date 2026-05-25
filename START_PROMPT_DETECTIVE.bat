@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
set "APP_DIR=%~dp0"
set "APP_PORT=5174"
set "APP_URL=http://localhost:%APP_PORT%"
cd /d "%APP_DIR%"
title Guess The Prompt - Civitai Minigame

echo ============================================================
echo  Guess The Prompt - Civitai Minigame
echo  One-click Windows launcher
echo ============================================================
echo.

if not exist "logs" mkdir "logs" >nul 2>&1
set "LOG_FILE=%APP_DIR%logs\launcher.log"
echo [%DATE% %TIME%] Starting Guess The Prompt > "%LOG_FILE%"

if not exist "package.json" (
  echo [ERROR] package.json was not found.
  echo [ERROR] package.json was not found.>>"%LOG_FILE%"
  echo Start this file from the application root folder.
  pause
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    echo [INFO] Creating .env from .env.example.
    echo [INFO] Creating .env from .env.example.>>"%LOG_FILE%"
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo [ERROR] .env.example was not found.
    echo [ERROR] .env.example was not found.>>"%LOG_FILE%"
    pause
    exit /b 1
  )
)

where node >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\npm.cmd" set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where node >nul 2>&1
if errorlevel 1 goto NODE_MISSING
where npm.cmd >nul 2>&1
if errorlevel 1 goto NODE_MISSING

echo [OK] Node detected:
node -v
node -v >>"%LOG_FILE%" 2>>&1

echo [OK] npm detected:
call npm.cmd -v
call npm.cmd -v >>"%LOG_FILE%" 2>>&1
echo.

for /f "tokens=1,* delims==" %%A in ('findstr /B /C:"APP_MODE=" .env 2^>nul') do set "DETECTED_APP_MODE=%%B"
if "!DETECTED_APP_MODE!"=="" set "DETECTED_APP_MODE=civitai"
if /I "!DETECTED_APP_MODE!"=="civitai-images" (
  echo [WARN] Legacy APP_MODE=civitai-images detected. Switching to APP_MODE=civitai because this build generates fresh images.
  echo [WARN] Legacy APP_MODE=civitai-images detected.>>"%LOG_FILE%"
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='.env'; $lines=Get-Content $p; $lines=$lines -replace '^APP_MODE=.*','APP_MODE=civitai'; [System.IO.File]::WriteAllLines((Resolve-Path $p), $lines, [System.Text.UTF8Encoding]::new($false))"
  set "DETECTED_APP_MODE=civitai"
)
echo [INFO] APP_MODE=!DETECTED_APP_MODE!
echo [INFO] APP_MODE=!DETECTED_APP_MODE!>>"%LOG_FILE%"

if /I "!DETECTED_APP_MODE!"=="civitai" (
  echo [INFO] Public demo mode: visitors enter their own Civitai API Key in the web UI.
  echo [INFO] Public demo mode uses visitor-supplied API keys.>>"%LOG_FILE%"
)
echo [INFO] Ensuring port %APP_PORT% is free before starting this build...
echo [INFO] Ensuring port %APP_PORT% is free before starting this build...>>"%LOG_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$listeners=Get-NetTCPConnection -LocalPort %APP_PORT% -State Listen -ErrorAction SilentlyContinue; if($listeners){ foreach($c in $listeners){ try { Write-Host ('[INFO] Stopping process using port %APP_PORT%: PID ' + $c.OwningProcess); Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch { Write-Host ('[WARN] Could not stop PID ' + $c.OwningProcess + ': ' + $_.Exception.Message) } } Start-Sleep -Seconds 1 } else { Write-Host '[OK] Port %APP_PORT% is free.' }"

if not exist "node_modules" (
  echo.
  echo [INFO] First launch detected: installing npm dependencies.
  echo [INFO] This can take a few minutes.
  echo [INFO] Running npm install...>>"%LOG_FILE%"
  call npm.cmd install >>"%LOG_FILE%" 2>>&1
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    echo [ERROR] npm install failed.>>"%LOG_FILE%"
    echo Check this file: logs\launcher.log
    pause
    exit /b 1
  )
) else (
  echo [OK] Dependencies already installed.
  echo [OK] Dependencies already installed.>>"%LOG_FILE%"
)

echo [INFO] Running environment diagnostics...
call npm.cmd run doctor
if errorlevel 1 (
  echo.
  echo [WARN] Diagnostics reported an issue, but startup will continue.
  echo [WARN] Non-blocking doctor warning.>>"%LOG_FILE%"
)

if not exist "dist-server\index.js" goto BUILD_APP
if not exist "dist\index.html" goto BUILD_APP
goto START_APP

:BUILD_APP
echo.
echo [INFO] Production build is missing or incomplete. Building the application.
echo [INFO] Running npm run build...>>"%LOG_FILE%"
call npm.cmd run build >>"%LOG_FILE%" 2>>&1
if errorlevel 1 (
  echo.
  echo [ERROR] Production build failed.
  echo [ERROR] Production build failed.>>"%LOG_FILE%"
  echo Check this file: logs\launcher.log
  pause
  exit /b 1
)

:START_APP
echo.
echo [INFO] Interface: %APP_URL%
echo [INFO] API      : %APP_URL%/api/health
echo [INFO] The browser will open automatically.
echo [INFO] To stop the app, close this window or press CTRL+C.
echo.
echo [INFO] Starting production server on %APP_URL%...>>"%LOG_FILE%"
start "Guess The Prompt Browser" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process '%APP_URL%'"
node dist-server\index.js

echo.
echo [INFO] The server stopped.
echo [INFO] If this was unexpected, check: logs\launcher.log
pause
exit /b 0

:NODE_MISSING
echo [ERROR] Node.js / npm was not found on this computer.
echo [ERROR] Node.js / npm missing.>>"%LOG_FILE%"
echo.
echo Guess The Prompt is a local React PWA plus Hono BFF. It needs Node.js LTS to run locally.
echo.
where winget >nul 2>&1
if errorlevel 1 (
  echo [INFO] winget was not found. Opening the official Node.js download page.
  start "" "https://nodejs.org/en/download"
  echo Install Node.js LTS, close this window, then start this BAT again.
  pause
  exit /b 1
)

choice /M "Install Node.js LTS automatically with winget now"
if errorlevel 2 (
  start "" "https://nodejs.org/en/download"
  echo Install Node.js LTS, close this window, then start this BAT again.
  pause
  exit /b 1
)

echo [INFO] Installing Node.js LTS with winget...
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
set "PATH=%ProgramFiles%\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js may have been installed, but this terminal cannot see it yet.
  echo Close this window, then start START_PROMPT_DETECTIVE.bat again.
  pause
  exit /b 1
)

echo [OK] Node.js is installed. Start START_PROMPT_DETECTIVE.bat again.
pause
exit /b 0
