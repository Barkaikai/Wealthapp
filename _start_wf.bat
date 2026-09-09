@echo off
cd /d "C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge"
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
node dist\index.js
