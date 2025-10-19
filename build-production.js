#!/usr/bin/env node

/**
 * Production Build Script
 * Optimized deployment build - excludes dev dependencies and minimizes bundle size
 */

import { execSync } from 'child_process';

console.log('📦 Building frontend with Vite...');
try {
  execSync('vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

console.log('📦 Building backend with esbuild...');
try {
  execSync(
    'esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --minify',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.error('❌ Backend build failed:', error.message);
  process.exit(1);
}

console.log('✅ Production build complete!');
console.log('📊 Build info:');
try {
  execSync('du -sh dist/', { stdio: 'inherit' });
} catch (e) {
  // Ignore if du command fails
}
