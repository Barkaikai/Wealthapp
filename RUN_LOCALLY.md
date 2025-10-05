# Running Locally - Wealth Automation Platform

This guide provides comprehensive instructions for running the Wealth Automation Platform on your local computer.

---

## **1. SYSTEM REQUIREMENTS**

### **Software Prerequisites:**
- **Node.js**: v20.x (tested on v20.19.3)
- **npm**: v10.x or higher (tested on v10.8.2)
- **PostgreSQL**: v16.x database server running locally
- **Git**: For cloning the repository
- **OpenSSL**: For generating secret keys

### **Operating System:**
- macOS, Linux, or Windows (with WSL recommended for Windows)

---

## **2. INSTALLATION STEPS**

### **Step 1: Clone & Install**
```bash
git clone <repository-url>
cd <project-folder>
npm install
```

### **Step 2: PostgreSQL Database Setup**
```bash
# Start PostgreSQL service
# Create a new database
createdb wealth_automation

# Note your connection details:
# - Host: localhost (or 127.0.0.1)
# - Port: 5432 (default)
# - User: your_postgres_user
# - Password: your_postgres_password
# - Database: wealth_automation
```

### **Step 3: Environment Variables**
Create a `.env` file in the root directory with the following:

---

## **3. REQUIRED ENVIRONMENT VARIABLES**

### **Database Configuration (REQUIRED):**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/wealth_automation
PGHOST=localhost
PGPORT=5432
PGUSER=your_postgres_user
PGPASSWORD=your_postgres_password
PGDATABASE=wealth_automation
```

### **Security & Session (REQUIRED):**
```bash
# Generate with: openssl rand -hex 32
SESSION_SECRET=<generate-32-char-hex-string>

# For CSRF protection (highly recommended)
CSRF_SECRET=<generate-32-char-hex-string>
```

### **Application Configuration (REQUIRED):**
```bash
NODE_ENV=development
PORT=5000
APP_BASE_URL=http://localhost:5000

# For Replit Auth (if not using, you'll need to modify auth system)
REPLIT_DOMAINS=localhost:5000
ISSUER_URL=https://replit.com/oidc
```

---

## **4. OPTIONAL BUT RECOMMENDED SERVICES**

### **AI Services (Core Features):**
```bash
# OpenAI - Required for AI features
OPENAI_API_KEY=sk-...
# Get from: https://platform.openai.com

# Anthropic Claude - Optional (Multi-Agent AI)
ANTHROPIC_KEY=sk-ant-...
# Get from: https://www.anthropic.com

# Cohere - Optional (Multi-Agent AI)
COHERE_KEY=...
# Get from: https://cohere.com
```

### **Search & Financial Data:**
```bash
# Tavily Search API - For web search
TAVILY_API_KEY=tvly-...
# Get from: https://tavily.com

# Alpha Vantage - Stock prices
ALPHA_VANTAGE_API_KEY=...
# Get from: https://www.alphavantage.co

# CoinGecko - Cryptocurrency prices
COINGECKO_API_KEY=CG-...
# Get from: https://www.coingecko.com/en/api
```

### **Payment Processing:**
```bash
# Stripe - Payment processing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Get from: https://stripe.com
```

### **Microsoft Office 365 Integration:**
```bash
MS_CLIENT_ID=...
MS_TENANT_ID=...
MS_CLIENT_SECRET=...
MS_REDIRECT_URI=http://localhost:5000/auth/microsoft/callback
MS_GRAPH_SCOPES=user.read,mail.read,files.readwrite,calendars.readwrite,offline_access
# Get from: https://portal.azure.com
```

### **Discord Bot Integration:**
```bash
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
# Get from: https://discord.com/developers
```

### **Google Mail Integration:**
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# Get from: https://console.cloud.google.com
```

### **Multi-Agent AI Memory (Redis):**
```bash
REDIS_URL=redis://localhost:6379
# Or use Upstash: rediss://default:password@host.upstash.io:6379
# Get from: https://upstash.com (free tier available)
```

### **Web3 & NFT Services:**
```bash
# Alchemy (EVM NFT indexing)
ALCHEMY_API_KEY=...
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
# Get from: https://www.alchemy.com

# WalletConnect (Multi-chain wallet connection)
WALLETCONNECT_PROJECT_ID=...
# Get from: https://cloud.walletconnect.com

# Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Hedera Mirror Node
HEDERA_MIRROR_NODE=https://mainnet-public.mirrornode.hedera.com/api/v1
```

---

## **5. DATABASE INITIALIZATION**

```bash
# Push schema to database
npm run db:push

# If there are migration warnings, force push
npm run db:push -- --force
```

---

## **6. RUNNING THE APPLICATION**

### **Development Mode:**
```bash
npm run dev
```
- Frontend: `http://localhost:5000` (Vite dev server)
- Backend API: `http://localhost:5000/api`
- WebSocket: `ws://localhost:5000/ws/ai-chat`

### **Production Build:**
```bash
npm run build
npm run start
```

### **Type Checking:**
```bash
npm run check
```

---

## **7. IMPORTANT NOTES FOR LOCAL SETUP**

### **Authentication Limitation:**
- The app uses **Replit Auth (OIDC)** which requires Replit infrastructure
- For local development, you'll need to either:
  - Mock the auth endpoints, OR
  - Implement alternative auth (e.g., local username/password)
  - The auth system expects `REPLIT_DOMAINS` and `ISSUER_URL` to function

### **Replit-Specific Dependencies:**
- `@replit/object-storage` - May not work locally (uses Replit infrastructure)
- Replit Connectors for Google Mail - Requires Replit environment

### **Port Configuration:**
- Application runs on port **5000** by default
- Ensure no other services are using this port
- To change: set `PORT=<other-port>` in `.env`

### **CORS Configuration:**
- Configured for `http://localhost:5000` and `http://127.0.0.1:5000`
- Additional origins can be set via `ALLOWED_ORIGINS` env var (comma-separated)

---

## **8. MINIMUM VIABLE LOCAL SETUP**

To run the app with **minimal features** (no external services):

```bash
# .env file
DATABASE_URL=postgresql://user:password@localhost:5432/wealth_automation
SESSION_SECRET=<generate-32-char-hex>
NODE_ENV=development
PORT=5000
APP_BASE_URL=http://localhost:5000
REPLIT_DOMAINS=localhost:5000
```

Then:
```bash
npm install
npm run db:push
npm run dev
```

### **Features Available:**
- ✅ Basic app structure
- ✅ Database operations
- ✅ Session management
- ❌ AI features (needs OPENAI_API_KEY)
- ❌ Authentication (needs Replit Auth or alternative)
- ❌ Email management (needs Google integration)
- ❌ Payment processing (needs Stripe)

---

## **9. TROUBLESHOOTING**

### **Database Connection Issues:**
- Ensure PostgreSQL is running: `pg_isready`
- Verify connection string format
- Check firewall/port 5432 accessibility

### **Module Not Found Errors:**
- Run `npm install` again
- Clear node_modules: `rm -rf node_modules && npm install`

### **Port Already in Use:**
- Change PORT in `.env`
- Or kill process: `lsof -ti:5000 | xargs kill`

### **Build Errors:**
- Ensure you're using Node.js v20.x: `node -v`
- Update npm to latest: `npm install -g npm@latest`
- Clear build cache: `rm -rf dist && npm run build`

---

## **10. PACKAGE SCRIPTS**

- `npm run dev` - Start development server (hot reload enabled)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

---

This setup will get you running locally, though some features requiring Replit-specific infrastructure will need alternative implementations or mocking.
