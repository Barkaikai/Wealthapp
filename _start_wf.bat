@echo off
cd /d "C:\Users\Barkai Brinson\OneDrive\Desktop\WealthForge"
set NODE_ENV=development
set NODE_OPTIONS=--expose-gc
set LOCAL_DEV_AUTH=1
set QUIET_STARTUP=1
set FAST_STARTUP=1
set PORT=5000
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wealth_automation
node dist\index.js
