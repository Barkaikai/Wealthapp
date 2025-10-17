# Wealth Automation Platform

## Overview
This AI-powered platform is designed for high-net-worth individuals, offering automated financial tracking, email management, daily routine optimization, and AI-driven decision support. It provides comprehensive wealth management, including asset aggregation, AI-powered email categorization and reply drafting, personalized daily briefings with portfolio insights, and optimized routine generation. The platform features an ultra-premium experience with a luxury aesthetic, integrating a double-entry Digital Accountant, CRM, health monitoring, and real-money Stripe payments for comprehensive life automation and financial management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, Vite, Wouter, and TanStack Query. UI components are built with Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3, featuring a dark-first luxury aesthetic with gold accents, Inter and JetBrains Mono fonts, mobile responsiveness, and WCAG AA compliance. A Coinbase-inspired blue theme, wealth-themed background images, and a mobile/desktop view switcher are incorporated.

### Technical Implementations
The backend is an Express.js with TypeScript REST API. Authentication uses Replit Auth (OpenID Connect) and Passport.js with PostgreSQL-backed sessions. PostgreSQL (Neon serverless) is the primary database, managed with Drizzle ORM. The platform supports continuous background health monitoring with diagnostic history and safe auto-fix capabilities. AI briefing generation includes robust error handling and fallback mechanisms. A PWA provides offline functionality and automatic updates. The system includes a Digital Calendar and a Terminal Interface. Performance optimizations include AI response caching (LRU, 60-min TTL), an AI request queue manager, WebSocket streaming for real-time AI responses, canonical user ID caching, structured JSON logging with rotation, AI data forwarding for learning, and Gzip compression with lazy-loaded components.

### Feature Specifications
The platform offers:
- **Daily Briefing & Wealth Dashboard:** AI-powered reports, portfolio overview, and visualization.
- **Digital Accountant:** Double-entry bookkeeping with Chart of Accounts, Journal Entries, Invoices, Payments, and Financial Reports.
- **Personal Wallet:** Integrated Fiat Wallet and Web3 Wallets (Coinbase, Hedera, MetaMask, WalletConnect).
- **NFT Vault:** Multi-chain NFT management (Ethereum, Polygon, Solana, Hedera) with MetaMask integration.
- **Discord AI Manager:** Discord bot with AI-powered message generation, editing, content moderation, and scheduling.
- **Productivity Hub:** Consolidated Notes (with AI analysis), Receipt Manager (OCR, CRM integration, AI reports), Email Manager (AI categorization and drafts), Routine Builder (with success leader templates and AI daily reports), Calendar Events, Tasks, AI Task Generation, and AI Calendar Recommendations.
- **AI Intelligence:** Unified hub for Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, Anomaly Detection, Terminal access, personalized AI Videos, and Multi-Agent AI orchestration.
- **Health Monitoring:** Comprehensive tracking for Steps, Exercise, Vitals, Mindfulness, Sleep, Food, and AI Sync with insights.
- **CRM:** Manages organizations, contacts, leads, deals, and activities with CRUD operations and accounting integration.
- **Microsoft Integration:** OAuth-based connection to Office 365, Outlook, OneDrive, and Calendar via Graph API.
- **Header Tools:** Live time/date, online/offline status, advanced calculator, web search, and ChatGPT assistant.
- **Subscription System:** Freemium/premium monetization with three tiers (Free, Premium, Enterprise), Stripe integration, multi-currency revenue tracking, comprehensive feature gating, and subscription management UI.
- **Wealth Forge Token Economy:** Solana-based mining coin system with bonding curve pricing, token redemption vault, global leaderboard, and Stripe payment integration.

### System Design Choices
The system is designed for scalability and security, employing Helmet.js, rate limiting, secure cookie parsing, and CSRF protection. Database schemas are optimized for user-centric data with appropriate indexing. AI integration is central, providing personalized insights, recommendations, and automation across financial, lifestyle, and health domains. The Routine Builder integrates AI for personalized daily reports. The Digital Accountant enforces double-entry validation. The CRM integrates with the Digital Accountant and Receipt Manager for comprehensive financial tracking. Receipt reports leverage GPT-4o for AI-powered insights into spending patterns. Data integrity is ensured through canonical user ID resolution, comprehensive logging, AI data forwarding, and log rotation.

## External Dependencies

### AI Services
- **OpenAI GPT-5:** Daily briefing generation, email automation, lifestyle recommendations, educational content.
- **OpenAI GPT-4o:** AI Intelligence Hub, ChatGPT assistant, AI Health Sync, Routine Builder AI integration, AI Videos, AI Task Generation, AI Calendar Recommendations, Multi-Agent orchestrator primary provider. Receipt report generation.
- **OpenAI GPT-4o-mini:** Cost-optimized AI analysis for text documents and notes, Multi-Agent responses and critiques.
- **OpenAI GPT-4o Vision:** OCR and analysis of images in Notepad and Receipt Manager.
- **Anthropic Claude 3.5 Sonnet:** (Optional) Secondary AI provider for Multi-Agent system.
- **Cohere:** (Optional) Tertiary AI provider for diverse response generation.

### Search Services
- **Tavily API:** Real-time web search.

### Email Integration
- **Google Mail API via OAuth2:** Email synchronization (using Replit Connectors).

### Financial Data Integration
- **Alpha Vantage API:** Real-time stock prices and currency exchange rates.
- **CoinGecko API:** Cryptocurrency prices.
- **Stripe:** Payment processing for subscriptions, wallet deposits, withdrawals, and webhook-based billing management.

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **Replit Connectors:** Secure credential management.
- **Microsoft Azure AD:** OAuth 2.0 authentication for Office 365 integration.
- **Microsoft Graph API:** Access to Outlook emails, OneDrive files, Calendar events.
- **Redis (Upstash or self-hosted):** Caching layer for Multi-Agent AI short-term memory.
- **Google Fonts:** Typography (Inter, JetBrains Mono).
- **Recharts:** Financial data visualization.

## Recent Updates (October 17, 2025)

### Cache Control & Performance
1. ✅ **Browser Caching Fixed** - Resolved aggressive browser caching requiring CTRL+SHIFT+R:
   - Moved cache-control middleware to execute BEFORE routes registration (server/index.ts lines 139-158)
   - Service worker check now executes first, ensuring `/service-worker.js` never caches
   - API routes receive `no-store, no-cache` headers for fresh data
   - Static assets cache for 5 minutes (max-age=300)
   - Service worker API cache TTL reduced from 5 minutes to 1 minute (public/service-worker.js)

2. ✅ **Notes Integration with Daily Briefing** - AI-analyzed notes now enhance daily briefings:
   - Daily briefing endpoint (`/api/briefings/daily`) now fetches user notes
   - `generateDailyBriefing` function accepts notes parameter with AI analysis
   - AI briefing considers note summaries, key points, action items, and categories
   - Personalized highlights and recommendations based on user's documented insights

### Digital Accountant
3. ✅ **Journal Entry System Verified** - Confirmed journal entry functionality working correctly:
   - Both `/api/accounting/journal` and `/api/accounting/journal-entries` endpoints active
   - Double-entry bookkeeping validation enforced (debits must equal credits)
   - Frontend properly transforms boolean `isDebit` to integer (0/1) for database
   - Account balance updates automatic on journal entry creation
   - Duplicate routes retained for backward compatibility

### Error Handling
4. ✅ **Server Startup Error Handling** - Added try-catch wrapper to async server initialization:
   - Fatal errors during startup now logged and trigger process.exit(1)
   - Prevents silent failures during registerRoutes(), setupVite(), or server.listen()

## Recent Updates (October 10, 2025)

### Critical Fixes
1. ✅ **Login Authentication Fixed** - Resolved critical login blocker with two fixes:
   - Fixed authentication middleware blocking /api/login, /api/callback, and /api/logout routes by adding route exclusion logic in server/routes.ts (lines 101-112)
   - Fixed hostname detection issue where localhost access failed with "Unknown authentication strategy" error. Updated server/replitAuth.ts (lines 140-153) to always use primary Replit domain for authentication regardless of access method (localhost, webview, etc.)

2. ✅ **AI Note Analysis Persistence** - Notes now save AI-generated insights to database. Added analysis fields (summary, keyPoints, actionItems, sentiment, categories, analysisModel, analyzedAt) to notes table. Analysis results persist across page refreshes, solving the "AI generator not linked" issue.

3. ✅ **CSRF Cookie Configuration** - Fixed CSRF protection for development by setting `secure: false` in dev mode (was requiring HTTPS). Cookie name adjusted: "x-csrf-token" in development, "__Host.x-csrf-token" in production.

### Automation Features
4. ✅ **Automated Email Sync** - Platform now automatically syncs Gmail emails hourly at :00 minutes using node-cron scheduler. Email processing runs for all users with defensive error handling to prevent cascade failures.

5. ✅ **Automated Routine Reports** - Daily routine reports generated automatically at 9 PM (21:00) for all users. AI-powered personalized reports include template matching, recommendations, and focus areas using GPT-4o-mini.

### Technical Details
- **Authentication Fix**: Modified global authentication middleware to exclude auth routes (/login, /callback, /logout, /csrf-token) from authentication checks. Routes now properly skip isAuthenticated for auth endpoints (server/routes.ts line 103).
- **Notes AI Analysis**: POST /api/notes/:id/analyze now updates note with AI insights using GPT-4o-mini
- **Database Schema**: Notes table extended with AI analysis fields (shared/schema.ts). Added routine_reports table with userId FK, generatedAt timestamp, and proper indexing.
- **CSRF Protection**: Environment-aware cookie configuration (server/index.ts line 101-105)
- **Storage Layer**: updateNote method handles Partial<InsertNote> including all new analysis fields. Added getAllUsers(), getRoutineReports(), getLatestRoutineReport(), and createRoutineReport() methods.
- **Automation Scheduler**: server/automationScheduler.ts implements cron-based scheduling (hourly email sync at :00, daily routine reports at 9 PM). Uses storage interface for user/routine/report access with per-user error isolation.