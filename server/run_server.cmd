@echo off
REM Launcher used by Task Scheduler / start.bat. Finds node.exe and runs the server from this folder.
cd /d "%~dp0"
call "%~dp0find_node.cmd"
if not defined NODE exit /b 1
"%NODE%" server.js
