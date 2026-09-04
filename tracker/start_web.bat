@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

set "NODE_EXE="
for /d %%d in ("%~dp0..\*") do (
    if exist "%%d\node-portable\node.exe" set "NODE_EXE=%%d\node-portable\node.exe"
)
if "%NODE_EXE%"=="" (
    if exist "node-portable\node.exe" set "NODE_EXE=%~dp0node-portable\node.exe"
)
if "%NODE_EXE%"=="" (
    echo [ERROR] 找不到 node.exe！
    pause
    exit /b 1
)
for %%f in ("%NODE_EXE%") do set "PATH=%%~dpf;%PATH%"

echo.
echo ========================================
echo   记账 Tracker - 手机端/浏览器版
echo ========================================
echo.

node server.js
pause
