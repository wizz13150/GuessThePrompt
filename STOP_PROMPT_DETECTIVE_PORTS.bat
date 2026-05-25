@echo off
chcp 65001 >nul
setlocal EnableExtensions

echo Stopping processes that listen on ports 5173 and 5174...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING" /C:":5174 .*LISTENING"') do (
  echo Killing PID %%P
  taskkill /PID %%P /F >nul 2>&1
)
echo Done.
pause
