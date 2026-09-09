import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  
  // Optional services
  OPENAI_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  CRYPTOCOMPARE_KEY: z.string().optional(),
  COINMARKETCAP_KEY: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

export function validateEnvironment(): Env {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Development fallbacks - ONLY used in development
  const envWithFallbacks = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || (isProduction ? undefined : 'postgresql://localhost:5432/dev'),
    SESSION_SECRET: process.env.SESSION_SECRET || (isProduction ? undefined : 'dev-session-secret-change-in-production'),
  };

  try {
    return envSchema.parse(envWithFallbacks);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      
      const missingRequired: string[] = [];
      error.errors.forEach(err => {
        const field = err.path.join('.');
        if (err.code === 'invalid_type' || err.code === 'too_small') {
          missingRequired.push(field);
        }
      });

      if (missingRequired.length > 0) {
        console.error('\n🚫 Missing required environment variables:');
        missingRequired.forEach(field => {
          console.error(`   - ${field}`);
        });
        
        if (isProduction) {
          console.error('\n💡 In production, these MUST be set in your deployment secrets.');
          console.error('   Go to: Deployments → Configuration → Secrets\n');
          process.exit(1);
        } else {
          console.error('\n⚠️  Development mode: Using fallback values');
          console.error('   Set real values in .env or Replit Secrets for production\n');
        }
      }
    }
    
    // Re-throw if we didn't exit
    throw error;
  }
}

export function logEnvironmentStatus(env: Env): void {
  const optionalServices = {
    'OPENAI_API_KEY': 'AI features (briefings, chat, learn, document analysis)',
    'TAVILY_API_KEY': 'Web search functionality',
    'ALPHA_VANTAGE_API_KEY': 'Stock price data',
    'CRYPTOCOMPARE_KEY': 'Enhanced crypto data (optional - CoinPaprika used by default)',
    'COINMARKETCAP_KEY': 'CoinMarketCap API (optional - multi-source fallback)',
    'CSRF_SECRET': 'CSRF protection',
    'STRIPE_SECRET_KEY': 'Stripe payment processing',
    'STRIPE_WEBHOOK_SECRET': 'Stripe webhook verification',
    'DISCORD_BOT_TOKEN': 'Discord bot integration',
    'DISCORD_CLIENT_ID': 'Discord application ID',
  };

  const configured = Object.entries(optionalServices)
    .filter(([key]) => env[key as keyof Env])
    .map(([key]) => key);

  const missing = Object.entries(optionalServices)
    .filter(([key]) => !env[key as keyof Env])
    .map(([key]) => key);

  const quietStartup = process.env.QUIET_STARTUP === '1' || process.env.LOCAL_DEV_AUTH === '1';

  if (missing.length > 0 && !quietStartup) {
    console.log(`⚠️  Optional services disabled (${missing.length} missing)`);
  }

  if (configured.length > 0) {
    console.log(`✓ Optional services configured: ${configured.join(', ')}`);
  }
}
