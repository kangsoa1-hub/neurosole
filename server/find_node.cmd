@echo off
REM Locate node.exe (PATH or common install folders). Sets NODE variable for the caller.
set "NODE="
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE set "NODE=%%i"
if defined NODE goto :found
for %%p in ("%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe" "%LOCALAPPDATA%\Programs\nodejs\node.exe" "%ProgramW6432%\nodejs\node.exe" "C:\nodejs\node.exe") do (
  if not defined NODE if exist %%p set "NODE=%%~p"
)
if defined NODE goto :found
for /d %%d in ("%APPDATA%\nvm\v*") do if not defined NODE if exist "%%d\node.exe" set "NODE=%%d\node.exe"
:found
exit /b 0
