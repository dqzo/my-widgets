@echo off
pushd "%~dp0"

set "NODE_VER=v20.15.0"
set "NODE_ZIP=node-%NODE_VER%-win-x64.zip"
set "NODE_DIR=node-portable"
set "NODE_EXE=%~dp0%NODE_DIR%\node.exe"
set "ELECTRON=%~dp0node_modules\electron\dist\electron.exe"
set "TEMP_DIR=%~dp0temp_download"

echo [STEP 1] Checking Node.js...
if exist "%NODE_EXE%" goto STEP2

echo [INFO] Downloading Node.js...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

powershell -Command "(New-Object System.Net.WebClient).DownloadFile('https://npmmirror.com/mirrors/node/%NODE_VER%/%NODE_ZIP%', '%TEMP_DIR%\%NODE_ZIP%')"

if not exist "%TEMP_DIR%\%NODE_ZIP%" (
    echo [ERROR] Download failed!
    pause
    popd
    exit /b 1
)

echo [INFO] Extracting...
powershell -Command "Expand-Archive -Path '%TEMP_DIR%\%NODE_ZIP%' -DestinationPath '%TEMP_DIR%' -Force"

for /d %%d in ("%TEMP_DIR%\node-*") do set "EXTRACTED=%%d"
if exist "%~dp0%NODE_DIR%" rmdir /s /q "%~dp0%NODE_DIR%"
move "%EXTRACTED%" "%~dp0%NODE_DIR%"
rmdir /s /q "%TEMP_DIR%"

:STEP2
echo [STEP 2] Setting PATH...
for %%f in ("%NODE_EXE%") do set "PATH=%%~dpf;%PATH%"

echo [STEP 3] Installing dependencies...
if exist "%ELECTRON%" goto STEP4

set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm install

if not exist "%ELECTRON%" (
    echo [ERROR] Install failed!
    pause
    popd
    exit /b 1
)

:STEP4
echo [STEP 4] Starting widget...
start "" "%ELECTRON%" .

if %errorlevel% neq 0 (
    echo [ERROR] Start failed!
    pause
)

echo [OK] Done!
popd
