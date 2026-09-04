@echo off
pushd "%~dp0"

set "ELECTRON=%~dp0node_modules\electron\dist\electron.exe"
set "NODE_PARENT=%~dp0..\projcetNew\node-portable\node.exe"

echo [1] Checking Electron...

if exist "%ELECTRON%" goto START
echo [INFO] Electron not found, installing...

if exist "%NODE_PARENT%" (
    for %%f in ("%NODE_PARENT%") do set "PATH=%%~dpf;%PATH%"
)

set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm install

if not exist "%ELECTRON%" (
    echo [ERROR] Install failed!
    pause
    popd
    exit /b 1
)

:START
echo [2] Starting widget...
start "" "%ELECTRON%" .

if %errorlevel% neq 0 (
    echo [ERROR] Start failed!
    pause
)

echo [OK] Started.
popd
