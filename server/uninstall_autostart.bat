@echo off
schtasks /End /TN "NeuroSoleServer" >nul 2>nul
schtasks /Delete /TN "NeuroSoleServer" /F
netsh advfirewall firewall delete rule name="NeuroSole 8080" >nul 2>nul
taskkill /F /IM node.exe >nul 2>nul
echo [OK] Auto-start removed.
pause
