# Garbage Collection Setup Guide

## Overview
This platform uses Node.js manual garbage collection to optimize memory usage. The GC manager automatically cleans up memory when usage exceeds 80%.

## 🚀 Quick Start

### Development Mode (Recommended)
Use the startup script that automatically enables garbage collection:
```bash
./start-dev.sh
```

### Production Mode
```bash
./start-prod.sh
```

## 📋 What Was Fixed

### 1. Safe Garbage Collection Manager
Created `server/gcManager.ts` with:
- **tryGarbageCollect()**: Safely runs GC with error handling
- **getMemoryStats()**: Returns current memory usage
- **autoMemoryCleanup()**: Automatically runs GC when memory > 80%
- **schedulePeriodicGC()**: Runs GC every N minutes

### 2. Updated Health Monitor
The health monitor (`server/healthMonitor.ts`) now uses the safe GC manager:
- Automatically detects high memory usage
- Runs garbage collection using safe wrapper
- Reports freed memory in diagnostic logs
- Provides clear error messages if GC not enabled

### 3. Startup Scripts
Two bash scripts make it easy to run with GC enabled:
- `start-dev.sh`: Development server with --expose-gc
- `start-prod.sh`: Production server with --expose-gc

## 🔧 Technical Details

### Node.js Flags
The server must run with `--expose-gc` flag:
```bash
node --expose-gc --loader tsx server/index.ts
```

### Manual Workflow Update
If you need to update the Replit workflow manually:

1. Click the gear icon next to the Run button
2. Change the run command to:
   ```bash
   ./start-dev.sh
   ```

## 📊 Memory Monitoring

The platform automatically monitors memory usage:
- **Health checks every 10 minutes**
- **Auto-cleanup at 80% memory usage**
- **Detailed logs showing freed memory**

Example log output:
```
[GC Manager] Memory usage: 450MB / 1024MB (43.95%)
[GC Manager] Running manual garbage collection...
[GC Manager] ✅ Garbage collection complete. Freed 45MB (450MB → 405MB)
```

## ⚠️ Troubleshooting

### "GC not exposed" Error
If you see this error:
```
⚠️ Garbage collection not exposed. Start Node with --expose-gc
```

**Solution**: Use `./start-dev.sh` instead of `npm run dev`

### High Memory Persists
If memory remains high after GC:
1. Check for memory leaks in custom code
2. Review database connection pooling
3. Clear cached data manually

## 🎯 Benefits

✅ **Automatic memory optimization**
✅ **Prevents out-of-memory crashes**
✅ **Detailed memory usage tracking**
✅ **Safe error handling**
✅ **Production-ready implementation**

## 📝 Notes

- GC runs automatically when memory > 80%
- Health monitor checks every 10 minutes
- All GC operations are logged for debugging
- Fallback behavior if --expose-gc not enabled
