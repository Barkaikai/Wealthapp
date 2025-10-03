# Required Environment Variables & URLs

## ⚠️ CRITICAL: Fill in ALL these values in Replit Secrets

### Microsoft Graph / Office Integration
These are required for Microsoft OAuth and Office 365 integration:

```
MS_CLIENT_ID=             # Get from Azure App Registration
MS_TENANT_ID=             # Get from Azure App Registration  
MS_CLIENT_SECRET=         # Generate in Azure App Registration
MS_REDIRECT_URI=          # Set to: https://daily-brief-brinsonbarkai.replit.app/auth/microsoft/callback
```

**Azure Setup Steps:**
1. Go to https://portal.azure.com
2. Navigate to "Azure Active Directory" → "App registrations" → "New registration"
3. Name: "Wealth Automation Platform"
4. Redirect URI: Add the MS_REDIRECT_URI above
5. After creation, copy CLIENT_ID and TENANT_ID
6. Go to "Certificates & secrets" → Create new client secret → Copy the value
7. Go to "API permissions" → Add: User.Read, Mail.Read, Files.ReadWrite, Calendars.ReadWrite, offline_access

### Application URLs
```
APP_BASE_URL=https://daily-brief-brinsonbarkai.replit.app
BACKEND_BASE_URL=https://daily-brief-brinsonbarkai.replit.app
FRONTEND_BASE_URL=https://daily-brief-brinsonbarkai.replit.app
```

### Redis (Required for Multi-Agent AI Caching)
```
REDIS_URL=                # Get from Replit or use external Redis provider
                          # Example: redis://default:password@host:port
                          # Free option: Upstash Redis (https://upstash.com)
```

### Blockchain RPC URLs (For Web3 Features)
```
ETH_RPC_URL=              # Ethereum mainnet RPC
                          # Free options: Infura, Alchemy, or public https://eth.llamarpc.com
                          
POLYGON_RPC_URL=          # Polygon mainnet RPC
                          # Free: https://polygon-rpc.com
                          
SOLANA_RPC_URL=           # Solana mainnet RPC
                          # Free: https://api.mainnet-beta.solana.com
                          
BLOCKSTREAM_API_URL=      # Bitcoin blockchain API
                          # Free: https://blockstream.info/api
```

### Additional AI Providers (Optional - for Multi-Agent System)
```
ANTHROPIC_ENDPOINT=       # https://api.anthropic.com/v1/messages
ANTHROPIC_KEY=            # Get from https://console.anthropic.com
ANTHROPIC_MODEL=          # claude-3-5-sonnet-20241022

COHERE_ENDPOINT=          # https://api.cohere.ai/v1/generate
COHERE_KEY=               # Get from https://dashboard.cohere.com
```

### Currently Configured (✓ Already Set)
These are already in your secrets:
- ✓ OPENAI_API_KEY
- ✓ TAVILY_API_KEY  
- ✓ ALPHA_VANTAGE_API_KEY
- ✓ DATABASE_URL
- ✓ SESSION_SECRET
- ✓ PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

### Optional (For Future Features)
```
COINGECKO_API_KEY=        # Cryptocurrency price data (free tier available)
CSRF_SECRET=              # CSRF protection (generate random 32+ char string)
PLAID_CLIENT_ID=          # Bank account aggregation
PLAID_SECRET=             # From https://plaid.com
STRIPE_SECRET_KEY=        # Payment processing (wallet features)
```

## Quick Setup Checklist

1. **Azure App Registration** (5-10 minutes)
   - [ ] Create app in Azure Portal
   - [ ] Copy MS_CLIENT_ID, MS_TENANT_ID
   - [ ] Generate MS_CLIENT_SECRET
   - [ ] Add redirect URI
   - [ ] Add API permissions

2. **Redis Setup** (2-3 minutes)
   - [ ] Sign up at https://upstash.com (free tier)
   - [ ] Create Redis database
   - [ ] Copy REDIS_URL connection string

3. **Blockchain RPCs** (1 minute)
   - [ ] Use free public RPC URLs listed above
   - [ ] Or sign up for Infura/Alchemy for better rate limits

4. **Add to Replit Secrets** (2 minutes)
   - [ ] Go to Replit → Tools → Secrets
   - [ ] Add each variable listed above
   - [ ] Restart the application

## Testing After Setup

Run these commands to verify:
```bash
# Check secrets are loaded
npm run verify-secrets

# Test Microsoft OAuth
curl https://daily-brief-brinsonbarkai.replit.app/auth/microsoft

# Test Redis connection  
npm run test-redis

# Test blockchain RPCs
npm run test-rpc
```

## Support Links

- Azure Portal: https://portal.azure.com
- Upstash Redis: https://upstash.com
- Infura (Ethereum): https://infura.io
- Alchemy: https://alchemy.com
- Anthropic Console: https://console.anthropic.com
- Cohere Dashboard: https://dashboard.cohere.com
