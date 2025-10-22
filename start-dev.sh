#!/bin/bash
# Development server with garbage collection enabled
# This script starts the Node.js server with --expose-gc flag

echo "🚀 Starting development server with garbage collection enabled..."
export NODE_ENV=development
export NODE_OPTIONS="--expose-gc"
exec tsx server/index.ts
