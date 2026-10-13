@echo off
title NeuroSole network check
echo ===============================================
echo  NeuroSole - network check (server PC)
echo ===============================================
echo.
echo [1] This PC IP address (server address = IPv4 below, port 8080)
ipconfig | findstr /i "IPv4 Default Gateway adapter"
echo.
echo [2] Is the server listening on port 8080?  (should show 0.0.0.0:8080 LISTENING)
netstat -an | findstr ":8080"
if errorlevel 1 echo    -^> NOT running. Run run_server.cmd or reboot (autostart).
echo.
echo [3] Firewall rule "NeuroSole 8080"  (Enabled: Yes / Profiles: Domain,Private,Public)
netsh advfirewall firewall show rule name="NeuroSole 8080" | findstr /i "Enabled Profiles Action LocalPort"
if errorlevel 1 echo    -^> Rule missing. Run install_autostart.bat as administrator again.
echo.
echo [4] Network profile of this PC's connection (Public is OK if rule above exists)
powershell -NoProfile -Command "Get-NetConnectionProfile | Select-Object Name,InterfaceAlias,NetworkCategory | Format-Table -AutoSize" 2>nul
echo.
echo [5] Local test from this PC
powershell -NoProfile -Command "try{ (Invoke-WebRequest -UseBasicParsing http://localhost:8080/api/health -TimeoutSec 5).Content }catch{ 'FAILED: server not responding on localhost' }" 2>nul
echo.
echo ===============================================
echo  Now on the TABLET: Settings ^> Wi-Fi ^> (connected network) ^> IP address
echo    - If the tablet IP starts with the same 3 numbers as this PC
echo      (e.g. 192.168.0.x)  -^> same network. Check router "AP isolation".
echo    - If it is different (e.g. 220.x.x.x, 172.30.x.x, 192.168.1.x)
echo      -^> the Wi-Fi is a DIFFERENT network. Connect the Wi-Fi router
echo         to the same router as this PC, or connect this PC to that Wi-Fi.
echo ===============================================
echo.
set /p TIP=Type the tablet IP to ping it (or press Enter to skip):
if not "%TIP%"=="" ping -n 3 %TIP%
echo.
pause
