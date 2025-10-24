# WealthForge - Elite Automation Platform

## Recent Changes
**October 24, 2025 - Admin Dashboard & Free Pass System Fully Operational:**
- **CRITICAL**: Fixed Free Pass Management system - fully operational for admin users
  - Created `access_passes` database table with proper schema (code, discount_percent, tier, created_by, redeemed_by, timestamps, max_redemptions, notes)
  - Added 4 proper indexes (code, tier, created_by, redeemed_by) for performance
  - Fixed `/admin` route 404 - now accessible at both `/admin` and `/admin/passes`
  - Fixed ESM compatibility: Converted all `require()` calls to ES6 imports in server/routes.ts:
    - `crypto.randomUUID()` for pass code generation
    - `qrcode` for QR code generation
    - `@microsoft/microsoft-graph-client` for MS Graph API
    - Dynamic imports for `msAuthClient` in MS OAuth routes
  - E2E verified: Admin can create passes, statistics update correctly, no server errors
- **VERIFIED WORKING**: All core features tested and confirmed operational:
  - ✅ Free Pass creation and management (POST /api/admin/passes/create)
  - ✅ AI Chat/Digital Assistant (WebSocket streaming, real-time responses)
  - ✅ Journal Entries (balanced double-entry creation, validation)
  - ✅ Payment recording (invoice selection, journal auto-posting)
  - ✅ Daily Briefing (real portfolio data, NO false examples removed)
- **Previous features maintained**: Live asset price chart, Coinbase Blue design, Inter font, mobile camera OCR, web search
- Architect review: **PASS** - No critical issues, no security concerns, production-ready

**October 24, 2025 - Live Asset Price Chart & Error Resolution:**
- **MAJOR**: Replaced asset allocation pie chart with live price chart visualization
  - Bar chart showing top 10 holdings by current value (color-coded by 24h performance)
  - Green bars = positive 24h change, Red bars = negative change
  - Scrollable list of ALL assets with live prices, allocation %, price-per-unit
  - Displays 24h change with trend icons (up/down/neutral)
  - Shows total portfolio value at top
- **Fixed**: AssetPriceChart null reference error - Added comprehensive null checks for changePercent before calling .toFixed()
- **Fixed**: AI briefing false data - Removed example prompts ($15,000 unpaid invoice, CRM lead examples) from server/openai.ts
- **Fixed**: Free Pass creation 403 error - Granted admin access to user (is_admin='true', has_unlimited_access='true')

**October 22, 2025 - System Reliability Enhancements:**
- Enhanced cryptocurrency data retrieval with exponential backoff retry logic (max 3 retries), timeout handling (8s per request), and comprehensive provider-specific error logging
- Improved AI data batching system with byte-based limits (1MB max), per-type event counters, and detailed flush metrics
- Created comprehensive validation framework (server/validation.ts) with Zod schemas, sanitization utilities, and AI logging hooks
- All improvements verified and approved by architect review with no security issues

## Overview
WealthForge is an AI-powered platform designed for high-net-worth individuals, offering automated financial tracking, email management, daily routine optimization, and AI-driven decision support. Its purpose is to provide comprehensive wealth and life management, including asset aggregation, AI-powered email categorization, personalized daily briefings with portfolio insights, and optimized routine generation. The platform features a futuristic sci-fi aesthetic, integrates a double-entry Digital Accountant, CRM, health monitoring, and real-money Stripe payments to deliver a holistic life automation and financial management experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, Vite, Wouter, and TanStack Query, with UI components built using Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3. It features a **professional business design** inspired by Coinbase and Metamask, with **Coinbase Blue (#0052FF)** as primary color, **Inter font** for clean typography, modern shadows, and a business-friendly palette (Green for positive, Red for negative, clean neutrals). The platform has been redesigned from its original sci-fi aesthetic to provide a more professional, trustworthy appearance suitable for wealth management. Accessibility is maintained with proper contrast ratios and mobile responsiveness. Deployed on wealthforge.app with proper CORS and CSP configuration.

### Technical Implementations
The backend is an Express.js with TypeScript REST API. Authentication is handled via Replit Auth (OpenID Connect) and Passport.js, using PostgreSQL-backed sessions with Neon serverless PostgreSQL and Drizzle ORM. The system supports continuous background health monitoring with **automatic garbage collection** (auto-respawn mechanism ensures `--expose-gc` flag is enabled), robust error handling for AI briefing generation, and PWA functionality for offline use. Key features include a Digital Calendar and Terminal Interface. Performance is optimized with AI response caching (LRU, 60-min TTL), an AI request queue manager, WebSocket streaming for real-time AI responses, canonical user ID caching, structured JSON logging, AI data forwarding, and Gzip compression with lazy-loaded components. Client-side caching uses IndexedDB for offline resilience. Startup optimizations ensure quick server readiness with delayed background services and graceful shutdown. **Auto-respawn system** detects if Node.js garbage collection is unavailable and automatically restarts the server with proper flags enabled. Deployment is optimized with `.dockerignore` for small image sizes, efficient `.replit` configuration, and real-time connection monitoring. A multi-source crypto price aggregator provides real-time data with failover, rate limiting, caching, and circuit breaker patterns.

### Feature Specifications
The platform provides a Daily Briefing & Wealth Dashboard with AI-powered reports and **live asset price visualization** (bar chart of holdings with 24h performance, scrollable list with price-per-unit and allocations). It includes a Digital Accountant for double-entry bookkeeping, a Personal Wallet (Fiat and Web3), and an NFT Vault for multi-chain management. A Discord AI Manager offers AI-powered bot functionalities. The Productivity Hub consolidates Notes (with AI analysis), a Receipt Manager (OCR, CRM, AI reports, **mobile camera capture**), Email Manager (AI categorization, drafts), Routine Builder (AI daily reports), Calendar, Tasks, AI Task Generation, and AI Calendar Recommendations. AI Intelligence offers Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, Anomaly Detection, Terminal access, personalized AI Videos, and Multi-Agent AI orchestration. Health Monitoring tracks various metrics with AI Sync. A CRM manages organizations, contacts, leads, and activities. Microsoft Integration uses OAuth for Office 365, Outlook, OneDrive, and Calendar via Graph API. Header Tools include live time/date, online/offline status, calculator, **web search (Tavily)**, and ChatGPT assistant. A subscription system offers freemium/premium tiers with Stripe integration and **Free Pass management** for admin users. A Wealth Forge Token Economy uses a Solana-based mining coin system.

### System Design Choices
The system prioritizes scalability and security, implementing Helmet.js, rate limiting, secure cookie parsing, and CSRF protection. Database schemas are optimized for user-centric data with appropriate indexing. AI integration is central for personalization, insights, recommendations, and automation across financial, lifestyle, and health domains. The Routine Builder and Digital Accountant leverage AI and validation for accurate and personalized functionalities. The CRM integrates with accounting and receipt management. Data integrity is maintained through canonical user ID resolution, comprehensive logging, AI data forwarding, and log rotation.

## External Dependencies

### AI Services
- **OpenAI GPT-5:** Daily briefing generation, email automation, lifestyle recommendations, educational content.
- **OpenAI GPT-4o:** AI Intelligence Hub, ChatGPT assistant, AI Health Sync, Routine Builder AI integration, AI Videos, AI Task Generation, AI Calendar Recommendations, Multi-Agent orchestrator primary provider, receipt report generation.
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
- **Multi-Source Crypto Aggregator:** Cryptocurrency prices with automatic failover (CoinPaprika primary, CoinCap/CryptoCompare/CoinMarketCap fallbacks).
- **Stripe:** Payment processing for subscriptions, wallet deposits, withdrawals, and webhook-based billing management.

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **Replit Connectors:** Secure credential management.
- **Microsoft Azure AD:** OAuth 2.0 authentication for Office 365 integration.
- **Microsoft Graph API:** Access to Outlook emails, OneDrive files, Calendar events.
- **Redis (Upstash or self-hosted):** Caching layer for Multi-Agent AI short-term memory.
- **Google Fonts:** Futuristic typography (Orbitron 700, Rajdhani 400/500/600).
- **Recharts:** Financial data visualization.