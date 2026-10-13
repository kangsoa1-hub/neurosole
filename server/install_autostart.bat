@echo off
REM NeuroSole server: register auto-start at boot + open firewall port 8080
REM Run as Administrator (right-click -> Run as administrator)
cd /d "%~dp0"
call "%~dp0find_node.cmd"
if not defined NODE (
  echo [ERROR] Node.js was not found on this PC.
  echo   1^) Install Node.js LTS: https://nodejs.org  -^> "LTS" -^> Windows Installer ^(.msi^) -^> Next ... Finish
  echo   2^) After the installer finishes, run this file again ^(if it still fails, restart Windows once^).
  where winget >nul 2>nul
  if not errorlevel 1 (
    set /p ANS=Install Node.js LTS automatically now with winget? [Y/N]:
    if /i "%ANS%"=="Y" winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  )
  pause
  exit /b 1
)
echo Using Node.js: %NODE%
echo Server folder : %~dp0
set "TR=\"%~dp0run_server.cmd\""
schtasks /Delete /TN "NeuroSoleServer" /F >nul 2>nul
schtasks /Create /TN "NeuroSoleServer" /SC ONSTART /RU SYSTEM /RL HIGHEST /F /TR "%TR%"
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Could not register the scheduled task. Run this file as Administrator ^(right-click^).
  pause
  exit /b 1
)
netsh advfirewall firewall delete rule name="NeuroSole 8080" >nul 2>nul
netsh advfirewall firewall add rule name="NeuroSole 8080" dir=in action=allow protocol=TCP localport=8080 >nul
schtasks /Run /TN "NeuroSoleServer" >nul
timeout /t 3 >nul
echo.
echo [OK] Registered: auto-start at boot (Task Scheduler "NeuroSoleServer"), firewall 8080 opened, server started.
echo      Verify on this PC: open http://localhost:8080 in a browser.
echo      Tablets/PCs:       http://THIS-PC-IP:8080   (find IP with: ipconfig)
echo      To remove:         uninstall_autostart.bat
echo.
pause
