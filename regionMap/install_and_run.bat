@echo off
cd /d "%~dp0"

set "NODE_VER=v20.15.0"
set "NODE_ZIP=node-%NODE_VER%-win-x64.zip"
set "NODE_DIR=node-portable"
set "NODE_EXE=%~dp0%NODE_DIR%\node.exe"
set "ELECTRON_DIR=%~dp0node_modules\electron"
set "ELECTRON=%ELECTRON_DIR%\dist\electron.exe"
set "ECHARTS=%~dp0node_modules\echarts\dist\echarts.min.js"
set "XLSX=%~dp0node_modules\xlsx\package.json"
set "DL_DIR=%TEMP%\regionmap_node_dl"

echo ============================================
echo   Region Map Widget - Environment Setup
echo ============================================
echo.

REM ====== STEP 1: Node.js ======
echo [STEP 1] Setting up Node.js...
if exist "%NODE_EXE%" (
    echo   [OK] Node.js found.
) else (
    if exist "%~dp0..\tracker\node-portable\node.exe" (
        echo   [INFO] Copying Node.js from sibling tracker...
        robocopy "%~dp0..\tracker\node-portable" "%~dp0%NODE_DIR%" /E /NFL /NDL /NJH /NJS /NP >nul
        if not exist "%NODE_EXE%" goto DOWNLOAD_NODE
        echo   [OK] Node.js copied.
    ) else (
        goto DOWNLOAD_NODE
    )
)
goto STEP2

:DOWNLOAD_NODE
echo   [INFO] Downloading Node.js %NODE_VER%...
if exist "%DL_DIR%" rmdir /s /q "%DL_DIR%"
mkdir "%DL_DIR%"
powershell -Command "(New-Object System.Net.WebClient).DownloadFile('https://npmmirror.com/mirrors/node/%NODE_VER%/%NODE_ZIP%', '%DL_DIR%\%NODE_ZIP%')"
if not exist "%DL_DIR%\%NODE_ZIP%" (
    echo   [ERROR] Download failed! Check network.
    rmdir /s /q "%DL_DIR%" 2>nul
    pause
    exit /b 1
)
echo   [INFO] Extracting...
powershell -Command "Expand-Archive -Path '%DL_DIR%\%NODE_ZIP%' -DestinationPath '%DL_DIR%' -Force"
set "EXTRACTED="
for /d %%d in ("%DL_DIR%\node-*") do set "EXTRACTED=%%d"
if not defined EXTRACTED (
    echo   [ERROR] Extract failed!
    rmdir /s /q "%DL_DIR%" 2>nul
    pause
    exit /b 1
)
echo   [INFO] Copying Node.js files...
robocopy "%EXTRACTED%" "%~dp0%NODE_DIR%" /E /NFL /NDL /NJH /NJS /NP >nul
rmdir /s /q "%DL_DIR%" 2>nul
if not exist "%NODE_EXE%" (
    echo   [ERROR] Node.js setup failed!
    pause
    exit /b 1
)
echo   [OK] Node.js ready.

:STEP2
echo [STEP 2] Setting PATH...
for %%f in ("%NODE_EXE%") do set "PATH=%%~dpf;%PATH%"

REM ====== STEP 3: Electron + ECharts + xlsx ======
echo [STEP 3] Setting up dependencies...
if exist "%ELECTRON%" if exist "%ECHARTS%" if exist "%XLSX%" goto STEP4

REM Copy from tracker sibling when possible
if not exist "%ELECTRON%" (
    if exist "%~dp0..\tracker\node_modules\electron\dist\electron.exe" (
        echo   [INFO] Copying Electron from sibling tracker...
        if not exist "%ELECTRON_DIR%" mkdir "%ELECTRON_DIR%"
        robocopy "%~dp0..\tracker\node_modules\electron" "%ELECTRON_DIR%" /E /NFL /NDL /NJH /NJS /NP >nul
        echo   [OK] Electron copied.
    )
)

if not exist "%XLSX%" (
    if exist "%~dp0..\tracker\node_modules\xlsx\package.json" (
        echo   [INFO] Copying xlsx from sibling tracker...
        robocopy "%~dp0..\tracker\node_modules\xlsx" "%~dp0node_modules\xlsx" /E /NFL /NDL /NJH /NJS /NP >nul
        echo   [OK] xlsx copied.
    )
)

REM Install missing packages via npm
echo   [INFO] Installing packages via npm...
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm install --ignore-scripts --registry=https://registry.npmmirror.com

if not exist "%ELECTRON%" (
    echo   [WARN] Electron not ready, trying full install...
    call npm install electron --registry=https://registry.npmmirror.com
)
if not exist "%ECHARTS%" (
    echo   [WARN] ECharts not ready, retrying...
    call npm install echarts --registry=https://registry.npmmirror.com
)
if not exist "%XLSX%" (
    echo   [WARN] xlsx not ready, retrying...
    call npm install xlsx --registry=https://registry.npmmirror.com
)

if not exist "%ELECTRON%" (
    echo   [ERROR] Electron setup failed!
    pause
    exit /b 1
)
if not exist "%ECHARTS%" (
    echo   [ERROR] ECharts setup failed!
    pause
    exit /b 1
)
if not exist "%XLSX%" (
    echo   [ERROR] xlsx setup failed!
    pause
    exit /b 1
)
echo   [OK] Dependencies ready.

:STEP4
echo.
echo [STEP 4] Starting Region Map Widget...
echo.
start "" "%ELECTRON%" .
exit
