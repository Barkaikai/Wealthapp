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
- **Productivity Hub:** Consolidated Notes (with AI analysis), Receipt Manager (OCR), Email Manager (AI categorization and drafts), Routine Builder (with success leader templates and AI daily reports), Calendar Events, and Tasks.
- **AI Intelligence:** Unified hub for Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, Anomaly Detection, Terminal access, and personalized AI Videos.
- **Health Monitoring:** Comprehensive tracking for Steps, Exercise, Vitals, Mindfulness, Sleep, Food, and AI Sync with insights and recommendations.
- **CRM:** Manages organizations, contacts, leads, deals, and activities with full CRUD operations and accounting integration.
- **Header Tools:** Live time/date, online/offline status, advanced calculator (64-digit precision, Basic, Scientific, Expression modes), web search, and ChatGPT assistant.

### System Design Choices
The system is built for scalability and security, employing Helmet.js for HTTP headers, rate limiting, secure cookie parsing, and CSRF protection. Database schemas are designed for user-centric data with appropriate indexing and `createdAt`/`updatedAt` timestamps. AI integration is central, providing personalized insights, recommendations, and automation across financial, lifestyle, and health domains. The Routine Builder integrates AI to generate personalized daily reports based on success leader templates. The Digital Accountant enforces double-entry validation and auto-posts journal entries for invoices and payments. The CRM integrates with the Digital Accountant for deal tracking.

## External Dependencies

### AI Services
- **OpenAI GPT-5:** Daily briefing generation, email automation, lifestyle recommendations, educational content.
- **OpenAI GPT-4o:** AI Intelligence Hub, ChatGPT assistant, AI Health Sync, Routine Builder AI integration, AI Videos.
- **OpenAI GPT-4o-mini:** Cost-optimized AI analysis for text documents and notes.
- **OpenAI GPT-4o Vision:** OCR and analysis of images in Notepad and Receipt Manager.

### Search Services
- **Tavily API:** Real-time web search.

### Email Integration
- **Google Mail API via OAuth2:** Email synchronization (using Replit Connectors).

### Financial Data Integration
- **Alpha Vantage API:** Real-time stock prices.
- **CoinGecko API:** Cryptocurrency prices.
- **Stripe:** Payment processing for wallet deposits and withdrawals.
- **Plaid:** (Planned) Bank account aggregation.

### Third-Party Services
- **Replit Auth (OIDC):** User authentication.
- **Replit Connectors:** Secure credential management.
- **Google Fonts:** Typography (Inter, JetBrains Mono).
- **Recharts:** Financial data visualization.