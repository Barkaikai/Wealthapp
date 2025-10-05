#!/usr/bin/env node

/**
 * Production Build Script
 * Bundles all dependencies for deployment (no external packages)
 */

import { execSync } from 'child_process';

console.log('📦 Building frontend with Vite...');
execSync('vite build', { stdio: 'inherit' });

console.log('📦 Building backend with esbuild (bundling all dependencies)...');
execSync(
  'esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist',
  { stdio: 'inherit' }
);

console.log('✅ Production build complete!');
