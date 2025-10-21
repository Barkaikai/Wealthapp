# WealthForge - Elite Automation Platform

## Overview
WealthForge is an AI-powered platform designed for high-net-worth individuals, offering automated financial tracking, email management, daily routine optimization, and AI-driven decision support. Its purpose is to provide comprehensive wealth and life management, including asset aggregation, AI-powered email categorization, personalized daily briefings with portfolio insights, and optimized routine generation. The platform features a futuristic sci-fi aesthetic, integrates a double-entry Digital Accountant, CRM, health monitoring, and real-money Stripe payments to deliver a holistic life automation and financial management experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18, TypeScript, Vite, Wouter, and TanStack Query, with UI components built using Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3. It sports a futuristic sci-fi aesthetic characterized by an elite purple (#6C1FFF) and yellow (#FFC43D) color palette, deep space black backgrounds, and luxury villa mansion images layered with futuristic overlays. Typography includes Orbitron for headers and Rajdhani for body text, featuring gradient and neon glow effects. Animated backgrounds with radial gradients and subtle mansion imagery are used. A "Maximum Glassmorphism System" provides advanced transparent effects with specialized utilities, cyber-glow borders, and continuous animations like floating, pulsing, and holographic shimmers. All components use a glass-card base. Accessibility is maintained with `prefers-reduced-motion` safeguards. It includes an elite loading screen and purple neon shadows, is deployed on wealthforge.app with proper CORS and CSP, and ensures mobile responsiveness.

### Technical Implementations
The backend is an Express.js with TypeScript REST API. Authentication is handled via Replit Auth (OpenID Connect) and Passport.js, using PostgreSQL-backed sessions with Neon serverless PostgreSQL and Drizzle ORM. The system supports continuous background health monitoring, robust error handling for AI briefing generation, and PWA functionality for offline use. Key features include a Digital Calendar and Terminal Interface. Performance is optimized with AI response caching (LRU, 60-min TTL), an AI request queue manager, WebSocket streaming for real-time AI responses, canonical user ID caching, structured JSON logging, AI data forwarding, and Gzip compression with lazy-loaded components. Client-side caching uses IndexedDB for offline resilience. Startup optimizations ensure quick server readiness with delayed background services and graceful shutdown. Deployment is optimized with `.dockerignore` for small image sizes, efficient `.replit` configuration, and real-time connection monitoring. A multi-source crypto price aggregator provides real-time data with failover, rate limiting, caching, and circuit breaker patterns.

### Feature Specifications
The platform provides a Daily Briefing & Wealth Dashboard with AI-powered reports and portfolio overview. It includes a Digital Accountant for double-entry bookkeeping, a Personal Wallet (Fiat and Web3), and an NFT Vault for multi-chain management. A Discord AI Manager offers AI-powered bot functionalities. The Productivity Hub consolidates Notes (with AI analysis), a Receipt Manager (OCR, CRM, AI reports), Email Manager (AI categorization, drafts), Routine Builder (AI daily reports), Calendar, Tasks, AI Task Generation, and AI Calendar Recommendations. AI Intelligence offers Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, Anomaly Detection, Terminal access, personalized AI Videos, and Multi-Agent AI orchestration. Health Monitoring tracks various metrics with AI Sync. A CRM manages organizations, contacts, leads, and activities. Microsoft Integration uses OAuth for Office 365, Outlook, OneDrive, and Calendar via Graph API. Header Tools include live time/date, online/offline status, calculator, web search, and ChatGPT assistant. A subscription system offers freemium/premium tiers with Stripe integration. A Wealth Forge Token Economy uses a Solana-based mining coin system.

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