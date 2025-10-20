# WealthForge - Elite Automation Platform

## Overview
WealthForge is a futuristic AI-powered platform providing automated financial tracking, email management, daily routine optimization, and AI-driven decision support for high-net-worth individuals. Launched at **wealthforge.app**, it offers comprehensive wealth management including asset aggregation, AI-powered email categorization and reply drafting, personalized daily briefings with portfolio insights, and optimized routine generation. The platform delivers an ultra-premium experience with a **futuristic sci-fi aesthetic** featuring elite purple (#6C1FFF) and yellow (#FFC43D) colors, glassmorphism effects, animated backgrounds, and cutting-edge typography. It integrates a double-entry Digital Accountant, CRM, health monitoring, and real-money Stripe payments for holistic life automation and financial management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, Vite, Wouter, and TanStack Query. UI components are built with Shadcn/ui (Radix UI, Tailwind CSS), adhering to Material Design 3. It features a **futuristic sci-fi aesthetic** with:

**WealthForge Design System (Oct 2025 - Elite Futuristic Update):**
- **Elite Color Palette:** Primary purple (#6C1FFF), accent yellow (#FFC43D), deep space black backgrounds
- **Luxury Background Blend:** High-end villa mansion images layered beneath purple/yellow futuristic overlays with animated glow effects
- **Futuristic Typography:** 
  - Orbitron (headers, 800-900 weight, massive sizes: 3-5rem h1, 2.25-3.5rem h2)
  - Rajdhani (body text, 500 weight, 1.125rem base)
  - Purple-to-yellow gradient text on main headers
  - Purple neon glow text shadows on all headings
- **Animated Backgrounds:** Elite purple/yellow radial gradients with 10s smooth animation (eliteGlow), luxury mansion image at 15% opacity as base layer
- **Maximum Glassmorphism System (Oct 2025):**
  - 10+ specialized glass utilities: glass-card, glass-ultra, glass-light, animated-gradient, pulse-glow, holographic, cyber-glow, float, data-stream, scan-lines, fade-in
  - Enhanced dark mode transparency (rgba 0.05-0.15) for deeper glass effects
  - Cyber-glow borders (2px purple/yellow with 0-20px glow spread)
  - Continuous animations: floating (8-15s), pulsing (2-4s), holographic shimmer (3s), data-stream particles (20s)
  - All components (StatCard, HighlightCard, Quick Access cards) use glass-card base
  - Landing page features cyber-grid, scan-lines, and neon-text effects
  - **Accessibility:** Comprehensive prefers-reduced-motion safeguards disable all animations gracefully
- **Elite Loading Screen:** Instant branded splash with Orbitron font, purple-yellow gradient, pulse animation
- **Purple Neon Shadows:** Multi-layer shadows with purple glow (0-80px spread)
- **Production Domain:** wealthforge.app with CORS, CSP headers, and manifest configuration
- **Mobile Responsiveness:** Mobile/desktop view switcher, WCAG AA compliance maintained

### Technical Implementations
The backend is an Express.js with TypeScript REST API. Authentication uses Replit Auth (OpenID Connect) and Passport.js with PostgreSQL-backed sessions. PostgreSQL (Neon serverless) is the primary database, managed with Drizzle ORM. The platform supports continuous background health monitoring with diagnostic history and safe auto-fix capabilities. AI briefing generation includes robust error handling and fallback mechanisms. A PWA provides offline functionality and automatic updates. The system includes a Digital Calendar and a Terminal Interface. Performance optimizations include AI response caching (LRU, 60-min TTL), an AI request queue manager, WebSocket streaming for real-time AI responses, canonical user ID caching, structured JSON logging with rotation, AI data forwarding for learning, and Gzip compression with lazy-loaded components. Client-side caching uses IndexedDB with a DeviceStorageManager for offline resilience and performance.

**Startup & Reliability Optimizations (Oct 2025):**
- Server starts in ~1 second with instant port availability
- Background services (health monitor, automation scheduler) delayed by 2 seconds to ensure immediate server readiness
- Graceful shutdown system with proper resource cleanup (HTTP server, database connections, schedulers)
- Database connection pool with singleton initialization pattern (no duplicate connections)
- Safe garbage collection with fallback behavior when --expose-gc not available
- SIGINT/SIGTERM handlers for clean process termination

**Deployment Optimizations (Oct 2025):**
- `.dockerignore` configured to exclude node_modules (9.6GB) from Docker images
- Production build optimized to ~6MB total (4MB dist + 2MB assets) - well under 8GB limit
- Removed 12MB unnecessary images, replaced with gradient backgrounds
- Configured `.replit` with correct port mapping: localPort 5000 → externalPort 80
- Real-time connection monitoring with `/api/admin/status` endpoint (30-second polling)
- Production build system with minification and error handling

**Crypto Price Aggregator (Oct 2025):**
- Multi-source cryptocurrency pricing with automatic failover (CoinPaprika, CoinCap, CryptoCompare, CoinMarketCap)
- Provider-specific identifier normalization for ~30 top cryptocurrencies
- Rate limiting (20 req/s) and caching (60s TTL) for performance
- Circuit breaker pattern for provider health monitoring
- Backward-compatible with CoinGecko API contract (ID/symbol mappings preserved)
- No API key required (CoinPaprika free tier primary source)

### Feature Specifications
The platform offers:
- **Daily Briefing & Wealth Dashboard:** AI-powered reports, portfolio overview, and visualization.
- **Digital Accountant:** Double-entry bookkeeping with Chart of Accounts, Journal Entries, Invoices, Payments, and Financial Reports.
- **Personal Wallet:** Integrated Fiat Wallet and Web3 Wallets (Coinbase, Hedera, MetaMask, WalletConnect).
- **NFT Vault:** Multi-chain NFT management (Ethereum, Polygon, Solana, Hedera).
- **Discord AI Manager:** AI-powered Discord bot for message generation, editing, content moderation, and scheduling.
- **Productivity Hub:** Consolidated Notes (with AI analysis), Receipt Manager (OCR, CRM integration, AI reports), Email Manager (AI categorization and drafts), Routine Builder (with AI daily reports), Calendar Events, Tasks, AI Task Generation, and AI Calendar Recommendations.
- **AI Intelligence:** Unified hub for Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, Anomaly Detection, Terminal access, personalized AI Videos, and Multi-Agent AI orchestration.
- **Health Monitoring:** Tracking for Steps, Exercise, Vitals, Mindfulness, Sleep, Food, and AI Sync with insights.
- **CRM:** Manages organizations, contacts, leads, deals, and activities with accounting integration.
- **Microsoft Integration:** OAuth-based connection to Office 365, Outlook, OneDrive, and Calendar via Graph API.
- **Header Tools:** Live time/date, online/offline status, advanced calculator, web search, and ChatGPT assistant.
- **Subscription System:** Freemium/premium monetization with three tiers, Stripe integration, multi-currency revenue tracking, and feature gating.
- **Wealth Forge Token Economy:** Solana-based mining coin system with bonding curve pricing and Stripe payment integration.

### System Design Choices
The system is designed for scalability and security, employing Helmet.js, rate limiting, secure cookie parsing, and CSRF protection. Database schemas are optimized for user-centric data with appropriate indexing. AI integration is central, providing personalized insights, recommendations, and automation across financial, lifestyle, and health domains. The Routine Builder integrates AI for personalized daily reports. The Digital Accountant enforces double-entry validation. The CRM integrates with the Digital Accountant and Receipt Manager. Receipt reports leverage GPT-4o for AI-powered insights. Data integrity is ensured through canonical user ID resolution, comprehensive logging, AI data forwarding, and log rotation.

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
- **Multi-Source Crypto Aggregator:** Cryptocurrency prices with automatic failover (CoinPaprika primary, CoinCap/CryptoCompare/CoinMarketCap fallbacks). No API key required for basic functionality. Backward-compatible with CoinGecko API contract.
- **Stripe:** Payment processing for subscriptions, wallet deposits, withdrawals, and webhook-based billing management.

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **Replit Connectors:** Secure credential management.
- **Microsoft Azure AD:** OAuth 2.0 authentication for Office 365 integration.
- **Microsoft Graph API:** Access to Outlook emails, OneDrive files, Calendar events.
- **Redis (Upstash or self-hosted):** Caching layer for Multi-Agent AI short-term memory.
- **Google Fonts:** Futuristic typography (Orbitron 700, Rajdhani 400/500/600).
- **Recharts:** Financial data visualization.