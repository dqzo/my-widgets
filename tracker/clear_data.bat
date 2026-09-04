@echo off
echo Clearing old data...

cd /d "%~dp0"
for /f "tokens=*" %%i in ('node-portable\node.exe -e "const path=require('path'); const os=require('os'); console.log(path.join(os.homedir(), 'AppData', 'Roaming', 'tracker-widget', 'tracker-data.json'))"') do set "DATA_FILE=%%i"

if exist "%DATA_FILE%" (
    del /q "%DATA_FILE%"
    echo Old data cleared successfully!
) else (
    echo No old data found.
)

echo.
echo Please restart the widget to start fresh.
pause