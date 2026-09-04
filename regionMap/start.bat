@echo off
cd /d "%~dp0"

set "NODE_EXE=%~dp0node-portable\node.exe"
set "ELECTRON=%~dp0node_modules\electron\dist\electron.exe"
set "ECHARTS=%~dp0node_modules\echarts\dist\echarts.min.js"
set "XLSX=%~dp0node_modules\xlsx\package.json"

if not exist "%NODE_EXE%" (
    echo [ERROR] node-portable not found!
    echo Please run install_and_run.bat first.
    pause
    exit /b 1
)
if not exist "%ELECTRON%" (
    echo [ERROR] Electron not found!
    echo Please run install_and_run.bat first.
    pause
    exit /b 1
)
if not exist "%ECHARTS%" (
    echo [ERROR] ECharts not found!
    echo Please run install_and_run.bat first.
    pause
    exit /b 1
)
if not exist "%XLSX%" (
    echo [ERROR] xlsx not found!
    echo Please run install_and_run.bat first.
    pause
    exit /b 1
)

start "" "%ELECTRON%" .
exit
