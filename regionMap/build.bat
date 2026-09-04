@echo off
cd /d "%~dp0"

REM 先检查 Excel 是否存在
if not exist "..\zcun.xlsx" (
    if not exist "data\regions.json" (
        echo [ERROR] 找不到 zcun.xlsx，且 data\regions.json 也不存在
        echo 请把 zcun.xlsx 放到上级目录
        pause
        exit /b 1
    )
    echo [INFO] data\regions.json 已存在，跳过构建
    exit /b 0
)

echo [BUILD] 解析 zcun.xlsx → data\regions.json ...
if not exist "node-portable\node.exe" (
    echo [ERROR] node-portable not found! 请先运行 install_and_run.bat
    pause
    exit /b 1
)

node build_regions.js
pause
