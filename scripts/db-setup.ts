import { config } from 'dotenv';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from '@neondatabase/serverless';
import * as schema from '../shared/schema';

config();

async function setupDatabase() {
  console.log('\n🗄️  Setting up database...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  try {
    // Test connection
    console.log('Connecting to database...');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    // Check if database is accessible
    const result = await client.query('SELECT current_database(), current_user');
    console.log(`✓ Connected to database: ${result.rows[0].current_database}`);
    console.log(`✓ User: ${result.rows[0].current_user}`);
    
    await client.end();

    // Run Drizzle push
    console.log('\nRunning database migrations...');
    console.log('Execute: npm run db:push\n');
    
    console.log('✓ Database setup complete!\n');
    console.log('Next steps:');
    console.log('1. Run: npm run db:push (to apply schema)');
    console.log('2. Run: npm run dev (to start the application)\n');

  } catch (error) {
    console.error('❌ Database setup failed:', (error as Error).message);
    process.exit(1);
  }
}

setupDatabase();
