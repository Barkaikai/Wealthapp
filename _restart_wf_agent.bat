@echo off
cd /d "C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge"
taskkill /F /PID 1456
timeout /t 2 /nobreak >nul
set USE_PGLITE=1
set NODE_ENV=development
set NODE_OPTIONS=--expose-gc
set LOCAL_DEV_AUTH=1
set QUIET_STARTUP=1
set FAST_STARTUP=1
set PORT=5000
set PGLITE_DATA_DIR=%LOCALAPPDATA%\WealthForge\pglite-fast
set DATABASE_URL=
if exist "%PGLITE_DATA_DIR%\postmaster.pid" del /q "%PGLITE_DATA_DIR%\postmaster.pid"
start "" /B node dist\index.js >> wf_server.log 2>&1
set /a tries=0
:waitloop
timeout /t 5 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:5000/api/tasks > "%TEMP%\wf_status.txt"
set /a tries+=1
findstr "200" "%TEMP%\wf_status.txt" >nul && goto done
if %tries% lss 12 goto waitloop
:done
type "%TEMP%\wf_status.txt"
