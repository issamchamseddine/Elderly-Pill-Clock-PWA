@echo off
cd /d "C:\Users\Scientia-Global-3\Desktop\Subtitles\Elderly Clock PWA"

:: Start the Python server in a new background window
start "Elderly Clock Server" python -m http.server 8080

:: Give Python 2 seconds to initialize before launching the browser
timeout /t 2 /nobreak >nul

:: Launch the PWA in your default browser
start "" "http://localhost:8080/"