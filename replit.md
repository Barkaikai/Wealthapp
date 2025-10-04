# Wealth Automation Platform

## Overview
This AI-powered platform is designed for billionaire-level wealth management and lifestyle optimization. It automates financial tracking, email management, daily routines, and decision-making with minimal human input. Key capabilities include aggregating assets across various platforms, AI-driven email categorization and reply drafting, generating daily briefings with portfolio insights, and building optimized daily routines. The platform aims to provide an ultra-premium experience with a luxury aesthetic and advanced AI functionalities for comprehensive life automation. It includes a full double-entry Digital Accountant, comprehensive CRM, and robust health monitoring system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, Vite, Wouter for routing, and TanStack Query. UI components are built with Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3 principles, featuring a dark-first luxury aesthetic with gold accents, Inter and JetBrains Mono fonts, mobile responsiveness, and WCAG AA compliance. A Coinbase-inspired blue theme (hsl 221 83% 53%) is used throughout, with wealth-themed background images. A mobile/desktop view switcher is available.

### Technical Implementations
The backend is an Express.js with TypeScript REST API. Authentication uses Replit Auth (OpenID Connect) and Passport.js with PostgreSQL-backed sessions. PostgreSQL (Neon serverless) is the primary database, managed with Drizzle ORM. The platform supports continuous background health monitoring with diagnostic history and safe auto-fix capabilities. AI briefing generation includes robust error handling and fallback mechanisms. A PWA (Progressive Web App) implementation provides offline functionality and automatic updates.
The system features a comprehensive Digital Calendar with Month/Week/Day views.
A Terminal Interface provides advanced users with system information and direct data access.

### Feature Specifications
The platform offers:
- **Daily Briefing:** AI-powered reports and portfolio overview.
- **Wealth Dashboard:** Portfolio visualization and analytics.
- **Digital Accountant:** Double-entry bookkeeping with Chart of Accounts, Journal Entries, Invoices, Payments, and Financial Reports.
- **Personal Wallet:** Integrated Fiat Wallet (deposits, withdrawals, payment methods) and Web3 Wallets (Coinbase, Hedera, MetaMask, WalletConnect).
- **NFT Vault:** ✅ Complete - Multi-chain NFT management (Ethereum, Polygon, Solana, Hedera) with MetaMask wallet connection, blockchain sync via Alchemy/Hedera Mirror Node, idempotent database persistence, and multi-view UI (grid/list, chain filtering).
- **Discord AI Manager:** ✅ Functional - Discord bot integration with AI-powered message generation (GPT-4o), message editing, content moderation, and cron-based scheduling. Note: Scheduled jobs require reinitialization after server restart.
- **Productivity Hub:** Consolidated Notes (with AI analysis), Receipt Manager (OCR), Email Manager (AI categorization and drafts), Routine Builder (with success leader templates and AI daily reports), Calendar Events, Tasks, AI Task Generation (analyzes emails/calendar/notes to suggest actionable tasks), and AI Calendar Recommendations (suggests optimal calendar events based on routines and tasks).
- **AI Intelligence:** Unified hub for Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, Anomaly Detection, Terminal access, personalized AI Videos, and Multi-Agent AI orchestration with parallel provider querying and response scoring.
- **Health Monitoring:** Comprehensive tracking for Steps, Exercise, Vitals, Mindfulness, Sleep, Food, and AI Sync with insights and recommendations.
- **CRM:** Manages organizations, contacts, leads, deals, and activities with full CRUD operations and accounting integration.
- **Microsoft Integration:** OAuth-based connection to Microsoft Office 365, Outlook, OneDrive, and Calendar with Graph API access.
- **Header Tools:** Live time/date, online/offline status, advanced calculator (64-digit precision, Basic, Scientific, Expression modes), web search, and ChatGPT assistant.
- **Subscription System:** ✅ Complete - Freemium/premium monetization with three tiers (Free, Premium $149/mo, Enterprise $499/mo), Stripe integration for checkout and billing, multi-currency revenue tracking with real-time FX conversion, comprehensive feature gating middleware (18+ premium endpoints), Enterprise Revenue Dashboard with real-time charts, and full subscription management UI with upgrade/downgrade flows.

### System Design Choices
The system is built for scalability and security, employing Helmet.js for HTTP headers, rate limiting, secure cookie parsing, and CSRF protection. Database schemas are designed for user-centric data with appropriate indexing and `createdAt`/`updatedAt` timestamps. AI integration is central, providing personalized insights, recommendations, and automation across financial, lifestyle, and health domains. The Routine Builder integrates AI to generate personalized daily reports based on success leader templates. The Digital Accountant enforces double-entry validation and auto-posts journal entries for invoices and payments. The CRM integrates with the Digital Accountant for deal tracking.

### Production Readiness Status (Last Audit: October 2025)

**✅ Deployment Ready (Pre-Launch Checklist Complete):**
- **Environment Validation:** Zod-based validation with production guards (terminates on missing DATABASE_URL/SESSION_SECRET in prod, dev fallbacks available)
- **Build Pipeline:** Verified working (npm run build + esbuild generates 447KB dist/index.js, npm start uses NODE_ENV=production)
- **Error Handling:** Comprehensive audit passed - robust fallbacks, circuit breakers, retry logic, graceful degradation for optional services
- **Server Health:** Running on port 5000, all services configured (OpenAI, Tavily, Alpha Vantage, Stripe, Discord)
- **Monitoring:** Background health diagnostics active with auto-fix capabilities
- **Database:** PostgreSQL with 60+ indexes, optimized queries, referential integrity enforced
- **Security:** Helmet headers, rate limiting, session storage, CSRF-ready (requires CSRF_SECRET in prod)

**📋 Known Limitations (Documented in SECURITY_NOTES.md):**
- Microsoft OAuth tokens stored in session (lost on server restart, requires re-authentication)
- No automatic token refresh for Microsoft (users re-auth after ~1 hour)
- Gmail integration limited by Replit connector scopes (inbox sync unavailable)
- CSRF protection requires CSRF_SECRET environment variable
- Garbage collection auto-fix requires Node.js --expose-gc flag (cannot set in current environment)

**🔒 Security Measures:**
- Helmet.js HTTP security headers
- Rate limiting on all API endpoints
- Secure session management with PostgreSQL storage
- Foreign key constraints and referential integrity enforced
- Circuit breaker patterns for external service resilience

**🚀 Performance Optimizations:**
- 60+ database indexes on userId, foreign keys, and lookup fields
- Single-flight guards prevent concurrent operations
- Graceful degradation for optional services
- Service worker caching strategies for static assets and API responses
- Memory monitoring with automatic cleanup attempts

### Recent Security & Bug Fixes (October 4, 2025)

**🔒 Security Enhancements:**
- **Wealth Forge Input Validation:** Added comprehensive server-side validation
  - gameScore: type checking, range validation (0-100), finite number verification
  - gameData: structure validation (must be object, not array)
  - packName: whitelist enforcement for buy endpoint (starter/bronze/silver/gold)
  - amount: range validation (1-10,000) for purchase amounts
- **Daily Bonus Timezone Fix:** Eliminated timezone-dependent logic, now uses UTC date normalization to prevent exploitation across timezones
- **Race Condition Mitigation:** Enhanced anti-abuse checks in mining endpoint

**🐛 Critical Bug Fixes:**
- **Subscription Middleware:** Fixed critical bug where middleware accessed non-existent `tier` field
  - UserSubscription table has `planId`, not `tier`
  - Implemented proper resolution: `planId → plan → tier` via new `getSubscriptionPlanById()` storage method
  - Fixed `attachSubscription`, `hasFeatureAccess`, and `checkUsageLimit` functions
  - All subscription feature gating now working correctly
- **Wealth Forge Mining:** Fixed Mine Tokens button sending invalid type 'mine' instead of valid 'task' type
  - Server validates mining types: ['mini_game', 'daily_bonus', 'quiz', 'task']
  - Frontend now sends correct 'task' type

**✅ Testing Status:**
- Comprehensive E2E tests passed for all critical user flows:
  - Authentication & OIDC login
  - Subscription management (Premium tier)
  - Wealth Forge mining with validation
  - Dashboard asset creation and display
  - Personal Wallet balances
  - CRM organization management
- All security validations confirmed working
- No blocking issues detected

## External Dependencies

### AI Services
- **OpenAI GPT-5:** Daily briefing generation, email automation, lifestyle recommendations, educational content.
- **OpenAI GPT-4o:** AI Intelligence Hub, ChatGPT assistant, AI Health Sync, Routine Builder AI integration, AI Videos, AI Task Generation (analyzes user data to suggest actionable tasks), AI Calendar Recommendations (suggests optimal scheduling based on routines and tasks), Multi-Agent orchestrator primary provider.
- **OpenAI GPT-4o-mini:** Cost-optimized AI analysis for text documents and notes, Multi-Agent responses and critiques.
- **OpenAI GPT-4o Vision:** OCR and analysis of images in Notepad and Receipt Manager.
- **Anthropic Claude 3.5 Sonnet:** (Optional) Secondary AI provider for Multi-Agent system with debate and critique capabilities.
- **Cohere:** (Optional) Tertiary AI provider for diverse response generation.

### Search Services
- **Tavily API:** Real-time web search.

### Email Integration
- **Google Mail API via OAuth2:** Email synchronization (using Replit Connectors).

### Financial Data Integration
- **Alpha Vantage API:** Real-time stock prices and currency exchange rates.
- **CoinGecko API:** Cryptocurrency prices.
- **Stripe:** Payment processing for subscriptions, wallet deposits, withdrawals, and webhook-based billing management.
- **Plaid:** (Planned) Bank account aggregation.

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **Replit Connectors:** Secure credential management.
- **Microsoft Azure AD:** OAuth 2.0 authentication for Office 365 integration.
- **Microsoft Graph API:** Access to Outlook emails, OneDrive files, Calendar events.
- **Redis (Upstash or self-hosted):** Caching layer for Multi-Agent AI short-term memory and performance optimization.
- **Google Fonts:** Typography (Inter, JetBrains Mono).
- **Recharts:** Financial data visualization.