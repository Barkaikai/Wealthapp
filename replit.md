# Wealth Automation Platform

## Overview
This AI-powered platform provides automated financial tracking, email management, daily routine optimization, and AI-driven decision support for high-net-worth individuals. It offers comprehensive wealth management, including asset aggregation, AI-powered email categorization and reply drafting, personalized daily briefings with portfolio insights, and optimized routine generation. The platform delivers an ultra-premium experience with a luxury aesthetic, integrating a double-entry Digital Accountant, CRM, health monitoring, and real-money Stripe payments for holistic life automation and financial management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18, TypeScript, Vite, Wouter, and TanStack Query. UI components are built with Shadcn/ui (Radix UI, Tailwind CSS), adhering to Material Design 3. It features a dark-first luxury aesthetic with gold accents, Inter and JetBrains Mono fonts, mobile responsiveness, WCAG AA compliance, a Coinbase-inspired blue theme, wealth-themed background images, and a mobile/desktop view switcher.

### Technical Implementations
The backend is an Express.js with TypeScript REST API. Authentication uses Replit Auth (OpenID Connect) and Passport.js with PostgreSQL-backed sessions. PostgreSQL (Neon serverless) is the primary database, managed with Drizzle ORM. The platform supports continuous background health monitoring with diagnostic history and safe auto-fix capabilities. AI briefing generation includes robust error handling and fallback mechanisms. A PWA provides offline functionality and automatic updates. The system includes a Digital Calendar and a Terminal Interface. Performance optimizations include AI response caching (LRU, 60-min TTL), an AI request queue manager, WebSocket streaming for real-time AI responses, canonical user ID caching, structured JSON logging with rotation, AI data forwarding for learning, and Gzip compression with lazy-loaded components. Client-side caching uses IndexedDB with a DeviceStorageManager for offline resilience and performance.

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