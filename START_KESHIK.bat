@echo off
setlocal
cd /d "%~dp0"
set "APP=%~dp0index.html"

rem Prefer Chromium-based browsers. This is safer than opening with Internet Explorer on older Windows.
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --new-window "%APP%"
  exit /b
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --new-window "%APP%"
  exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --new-window "%APP%"
  exit /b
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --new-window "%APP%"
  exit /b
)

echo Chrome/Edge was not found. Opening with the Windows default browser...
start "" "%APP%"
endlocal
