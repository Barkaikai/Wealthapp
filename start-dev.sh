#!/bin/bash
# Development server with garbage collection enabled
# This script starts the Node.js server with --expose-gc flag

echo "🚀 Starting development server with local PGlite database..."
export NODE_ENV=development
export NODE_OPTIONS="--expose-gc"
export USE_PGLITE=1
export LOCAL_DEV_AUTH=1
export PGLITE_DATA_DIR="${PGLITE_DATA_DIR:-$HOME/.local/share/WealthForge/pglite}"
export DATABASE_URL="$PGLITE_DATA_DIR"
mkdir -p "$PGLITE_DATA_DIR"
exec npm run dev
