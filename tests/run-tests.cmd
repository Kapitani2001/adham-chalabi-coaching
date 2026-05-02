@echo off
cd /d "%~dp0\.."
set TZ=America/New_York
node --test tests/*.test.js
exit /b %ERRORLEVEL%
