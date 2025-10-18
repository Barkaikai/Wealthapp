#!/bin/bash
# Development server with garbage collection enabled
# This script starts the Node.js server with --expose-gc flag

echo "🚀 Starting development server with garbage collection enabled..."
NODE_ENV=development node --expose-gc --loader tsx server/index.ts
