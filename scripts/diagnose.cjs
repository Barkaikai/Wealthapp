#!/usr/bin/env node
/**
 * WealthForge Diagnostics Script
 * Checks environment, dependencies, and endpoint health
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

const CONFIG = {
  baseUrl: process.env.APP_BASE_URL || 'http://localhost:5000',
  endpoints: [
    '/healthz',
    '/livez',
    '/readyz',
    '/api/admin/status',
    '/api/auth/user',
    '/api/briefing/latest',
    '/api/assets',
    '/api/routines',
    '/api/emails',
    '/api/transactions',
    '/api/market/overview',
    '/api/health-monitor/status'
  ],
  requiredEnv: [
    'DATABASE_URL',
    'SESSION_SECRET',
    'ISSUER_URL',
    'OPENAI_API_KEY'
  ],
  optionalEnv: [
    'TAVILY_API_KEY',
    'ALPHA_VANTAGE_API_KEY',
    'STRIPE_SECRET_KEY',
    'DISCORD_BOT_TOKEN',
    'COINGECKO_API_KEY',
    'CRYPTOCOMPARE_KEY'
  ]
};

async function checkUrl(path) {
  const url = new URL(path, CONFIG.baseUrl).toString();
  try {
    const res = await fetch(url, { 
      method: 'GET', 
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    const ok = res.ok;
    let jsonParsed = null;
    
    try {
      jsonParsed = JSON.parse(text);
    } catch (e) {
      // not JSON
    }
    
    return { 
      url, 
      status: res.status, 
      ok, 
      contentType: ct, 
      jsonParsed, 
      textSnippet: text.slice(0, 500) 
    };
  } catch (err) {
    return { url, error: String(err) };
  }
}

function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.split('.')[0].substring(1));
  console.log(`  Node.js version: ${version} ${majorVersion >= 18 ? '✓' : '⚠️  (recommend v18+)'}`);
}

function checkMemory() {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  console.log(`  Memory: ${heapUsedMB}MB / ${heapTotalMB}MB heap, ${rssMB}MB RSS`);
  if (heapUsedMB > 500) {
    console.log('    ⚠️  High memory usage detected');
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║    WealthForge Platform Diagnostics v1.0          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  console.log('📍 Base URL:', CONFIG.baseUrl);
  console.log('\n🔍 System Information:');
  checkNodeVersion();
  checkMemory();
  
  console.log('\n🔑 Required Environment Variables:');
  let missingRequired = 0;
  CONFIG.requiredEnv.forEach(k => {
    const exists = Boolean(process.env[k]);
    const status = exists ? '✓' : '✗';
    const value = exists ? (k.includes('KEY') || k.includes('SECRET') ? '[HIDDEN]' : 'SET') : 'MISSING';
    console.log(`  ${status} ${k.padEnd(25)} ${value}`);
    if (!exists) missingRequired++;
  });
  
  console.log('\n🔓 Optional Environment Variables:');
  CONFIG.optionalEnv.forEach(k => {
    const exists = Boolean(process.env[k]);
    const status = exists ? '✓' : '-';
    console.log(`  ${status} ${k.padEnd(25)} ${exists ? 'SET' : 'not set'}`);
  });
  
  console.log('\n📦 Package Audit:');
  try {
    const audit = execSync('npm audit --json', { 
      stdio: ['pipe', 'pipe', 'pipe'], 
      timeout: 60000 
    }).toString();
    const a = JSON.parse(audit);
    const metadata = a.metadata?.vulnerabilities || {};
    const total = Object.values(metadata).reduce((s, n) => s + n, 0);
    
    console.log(`  Total vulnerabilities: ${total}`);
    if (metadata.critical) console.log(`    🔴 Critical: ${metadata.critical}`);
    if (metadata.high) console.log(`    🟠 High: ${metadata.high}`);
    if (metadata.moderate) console.log(`    🟡 Moderate: ${metadata.moderate}`);
    if (metadata.low) console.log(`    ⚪ Low: ${metadata.low}`);
    
    if (total === 0) {
      console.log('  ✓ No vulnerabilities found');
    }
  } catch (e) {
    console.log('  ⚠️  npm audit not available or failed');
  }
  
  console.log('\n🌐 Endpoint Health Checks:');
  let failedEndpoints = 0;
  
  for (const ep of CONFIG.endpoints) {
    const r = await checkUrl(ep);
    const statusIcon = r.error ? '✗' : (r.ok ? '✓' : '⚠️');
    
    console.log(`\n  ${statusIcon} ${ep}`);
    
    if (r.error) {
      console.log(`     ERROR: ${r.error}`);
      failedEndpoints++;
      continue;
    }
    
    console.log(`     Status: ${r.status} | Type: ${r.contentType}`);
    
    if (r.jsonParsed) {
      const jsonLength = JSON.stringify(r.jsonParsed).length;
      console.log(`     ✓ Valid JSON (${jsonLength} bytes)`);
      
      // Show relevant data
      if (r.jsonParsed.status) console.log(`     Status: ${r.jsonParsed.status}`);
      if (r.jsonParsed.message) console.log(`     Message: ${r.jsonParsed.message}`);
    } else {
      const prefix = r.textSnippet.replace(/\n/g, ' ').slice(0, 100);
      console.log(`     ⚠️  NOT JSON — snippet: ${prefix}...`);
      
      if (prefix.match(/<!doctype|<html|<script|<\?xml/i)) {
        console.log(`     🔴 Endpoint returned HTML. Server likely returned error page.`);
        console.log(`     → Check server logs and route configuration`);
        failedEndpoints++;
      }
    }
  }
  
  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║                Summary Report                      ║');
  console.log('╚════════════════════════════════════════════════════╝');
  
  if (missingRequired > 0) {
    console.log(`\n🔴 ${missingRequired} required environment variable(s) missing`);
  } else {
    console.log('\n✓ All required environment variables present');
  }
  
  if (failedEndpoints > 0) {
    console.log(`🔴 ${failedEndpoints} endpoint(s) failed health check`);
  } else {
    console.log('✓ All endpoints responding correctly');
  }
  
  const overallStatus = (missingRequired === 0 && failedEndpoints === 0) ? 'HEALTHY' : 'ISSUES DETECTED';
  const statusIcon = overallStatus === 'HEALTHY' ? '✅' : '⚠️';
  
  console.log(`\n${statusIcon} Overall Status: ${overallStatus}\n`);
  
  if (overallStatus !== 'HEALTHY') {
    console.log('💡 Recommendations:');
    if (missingRequired > 0) {
      console.log('   - Add missing environment variables to .env file');
    }
    if (failedEndpoints > 0) {
      console.log('   - Check server logs for errors');
      console.log('   - Verify database connection');
      console.log('   - Ensure all routes are properly configured');
    }
    console.log('');
  }
  
  process.exit(overallStatus === 'HEALTHY' ? 0 : 1);
}

main().catch(err => {
  console.error('\n❌ Diagnostic script failed:', err);
  process.exit(1);
});
