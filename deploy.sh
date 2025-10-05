#!/bin/bash
set -e

echo "Installing production dependencies..."
npm install --production

echo "Building application..."
npm run build

echo "Deployment build complete!"
