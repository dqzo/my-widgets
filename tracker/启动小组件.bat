@echo off
cd /d "%~dp0"

set "NODE_DIR=node-portable"
set "NODE_EXE=%~dp0%NODE_DIR%\node.exe"
set "ELECTRON=%~dp0node_modules\electron\dist\electron.exe"

if not exist "%NODE_EXE%" (
    echo [ERROR] Node.js not found!
    echo Please run "install_and_run.bat" first.
    pause
    exit /b 1
)

if not exist "%ELECTRON%" (
    echo [ERROR] Electron not found!
    echo Please run "install_and_run.bat" first.
    pause
    exit /b 1
)

if not exist "%~dp0node_modules\xlsx\package.json" (
    echo [ERROR] xlsx dependency not found!
    echo Please run "install_and_run.bat" first.
    pause
    exit /b 1
)

echo [INFO] Starting Tracker Widget...
start "" "%ELECTRON%" .
exit