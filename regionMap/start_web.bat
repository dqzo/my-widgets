@echo off
cd /d "%~dp0"

set "NODE_EXE=%~dp0node-portable\node.exe"
if not exist "%NODE_EXE%" (
    echo [ERROR] node-portable not found!
    echo Please run install_and_run.bat first.
    pause
    exit /b 1
)

for %%f in ("%NODE_EXE%") do set "PATH=%%~dpf;%PATH%"

echo.
echo ========================================
echo   手机端 / 浏览器版 HTTP 服务器
echo ========================================
echo.
echo 启动后请在手机浏览器访问:
echo   http://本电脑IP:8765
echo.
echo 关闭此窗口停止服务器
echo.

node server.js
pause
