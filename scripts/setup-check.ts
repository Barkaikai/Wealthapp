import { config } from 'dotenv';
import { Client } from 'pg';

config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, message: string, severity: 'required' | 'optional' = 'required') {
  results.push({
    name,
    status: condition ? 'pass' : (severity === 'optional' ? 'warn' : 'fail'),
    message: condition ? '✓ ' + message : (severity === 'optional' ? '⚠ ' : '✗ ') + message
  });
}

async function runChecks() {
  console.log('\n🔍 Running setup validation...\n');

  // Database checks
  check(
    'DATABASE_URL',
    !!process.env.DATABASE_URL,
    process.env.DATABASE_URL ? 'Database URL configured' : 'DATABASE_URL not set'
  );

  if (process.env.DATABASE_URL) {
    try {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      check('Database Connection', true, 'Successfully connected to database');
    } catch (error) {
      check('Database Connection', false, `Failed to connect: ${(error as Error).message}`);
    }
  }

  // Security checks
  check(
    'SESSION_SECRET',
    !!process.env.SESSION_SECRET,
    process.env.SESSION_SECRET ? 'Session secret configured' : 'SESSION_SECRET not set - generate with: openssl rand -hex 32'
  );

  check(
    'CSRF_SECRET',
    !!process.env.CSRF_SECRET,
    process.env.CSRF_SECRET ? 'CSRF protection enabled' : 'CSRF protection disabled (optional but recommended)',
    'optional'
  );

  // AI service checks
  check(
    'OPENAI_API_KEY',
    !!process.env.OPENAI_API_KEY,
    process.env.OPENAI_API_KEY ? 'OpenAI API key configured' : 'OPENAI_API_KEY not set'
  );

  // Financial API checks
  check(
    'ALPHA_VANTAGE_API_KEY',
    !!process.env.ALPHA_VANTAGE_API_KEY,
    process.env.ALPHA_VANTAGE_API_KEY ? 'Alpha Vantage API configured' : 'ALPHA_VANTAGE_API_KEY not set'
  );

  check(
    'COINGECKO_API_KEY',
    true,
    process.env.COINGECKO_API_KEY ? 'CoinGecko premium API configured' : 'Using free CoinGecko API',
    'optional'
  );

  // Optional services
  check(
    'PLAID',
    true,
    (process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET) ? 'Plaid configured' : 'Plaid not configured (optional)',
    'optional'
  );

  // Print results
  console.log('━'.repeat(60));
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m ${result.name}: ${result.message}`);
  });
  console.log('━'.repeat(60));

  const failures = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;

  if (failures > 0) {
    console.log(`\n❌ ${failures} required check(s) failed. Please fix before deploying.\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n✓ All required checks passed (${warnings} optional warning(s))\n`);
  } else {
    console.log('\n✓ All checks passed! Ready to deploy.\n');
  }
}

runChecks().catch(error => {
  console.error('Setup check failed:', error);
  process.exit(1);
});
