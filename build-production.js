#!/usr/bin/env node

/**
 * Production Build Script
 * Bundles backend with external packages (to avoid native dependency issues)
 */

import { execSync } from 'child_process';

console.log('📦 Building frontend with Vite...');
execSync('vite build', { stdio: 'inherit' });

console.log('📦 Building backend with esbuild...');
execSync(
  'esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist',
  { stdio: 'inherit' }
);

console.log('✅ Production build complete!');
