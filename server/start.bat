@echo off
REM NeuroSole server (test run). Close this window to stop the server.
cd /d "%~dp0"
call "%~dp0run_server.cmd"
if %errorlevel% neq 0 echo [ERROR] Node.js was not found. Install Node.js LTS from https://nodejs.org (Windows Installer .msi), then run again.
pause
