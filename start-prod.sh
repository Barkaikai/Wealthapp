#!/bin/bash
# Production server with garbage collection enabled
# This script starts the Node.js server with --expose-gc flag

echo "🚀 Starting production server with garbage collection enabled..."
NODE_ENV=production node --expose-gc dist/index.js
