# Wealth Automation Platform

## Overview

This AI-powered platform is designed for billionaire-level wealth management and lifestyle optimization. It automates financial tracking, email management, daily routines, and decision-making with minimal human input. Key capabilities include aggregating assets across various platforms, AI-driven email categorization and reply drafting, generating daily briefings with portfolio insights, and building optimized daily routines. The platform aims to provide an ultra-premium experience with a luxury aesthetic and advanced AI functionalities for comprehensive life automation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18 with TypeScript, Vite, Wouter for routing, and TanStack Query for server state management. UI components are built with Shadcn/ui (Radix UI, Tailwind CSS) following Material Design 3 principles, featuring a dark-first luxury aesthetic with gold accents, Inter and JetBrains Mono fonts, mobile responsiveness, and WCAG AA compliance. State management utilizes React Query, React Hook Form with Zod, and Context API for themes.

### Backend

The backend is an Express.js with TypeScript REST API. Authentication uses Replit Auth (OpenID Connect) and Passport.js with PostgreSQL-backed sessions. API endpoints are organized by domain (e.g., authentication, asset management, AI briefings, email automation). Security measures include Helmet.js for HTTP headers, rate limiting, secure cookie parsing, CSRF protection (Double Submit Cookie), and robust session security. Health endpoints (`/livez`, `/readyz`, `/healthz`, `/admin/diagnostics`) are implemented for monitoring.

### Data Storage

PostgreSQL (Neon serverless) is the primary database, managed with Drizzle ORM. The schema includes tables for users, sessions, assets, events, routines, emails, briefings, transactions, wealth alerts, financial goals, liabilities, calendar events, tasks, health metrics, wallet connections, voice commands, notes, documents, and AI Intelligence tables for portfolio reports, trading recommendations, tax events, rebalancing, and anomaly detections. All user-centric tables link to `users.id` with cascade delete and include `createdAt`/`updatedAt` timestamps. Indices are added to all `userId` columns for performance.

### System Design Choices

The platform features continuous background health monitoring with diagnostic history and safe auto-fix capabilities. AI briefing generation includes robust error handling and fallback mechanisms (GPT-5 to GPT-4o). A luxury theme is globally implemented. An AI-powered "Learn" system generates educational content. Real financial API integrations provide real-time stock and crypto data with intelligent fallback mechanisms. Email automation supports AI categorization and automatic draft replies. The system includes comprehensive wealth monitoring (transactions, alerts, goals, liabilities), a Productivity Hub (calendar, tasks), health metrics tracking, and Web3 wallet integration (Coinbase, Hedera HBAR, MetaMask, WalletConnect).

**Header Tools:** Live time/date display, online/offline status indicator with toggle, advanced calculator (64-digit precision, 3 modes: Basic, Scientific, Expression), web search (Tavily API), and ChatGPT assistant (OpenAI GPT-4o) are accessible from the header.

**AI Intelligence Hub** offers five key capabilities: Portfolio Reports, Trading Recommendations, Tax Event Tracking, Portfolio Rebalancing, and Anomaly Detection, all powered by GPT-4o.

**AI Videos Page** generates personalized YouTube video recommendations based on Daily Briefing content using GPT-4o, providing educational content relevant to portfolio highlights, risks, and actions.

**Notepad system** supports CRUD operations and AI-powered analysis for text (GPT-4o-mini) and images (GPT-4o Vision), handling Replit Object Storage gracefully.

**Receipt Manager** uses GPT-4o Vision for OCR processing of receipt images, extracting merchant, amount, date, items, and category information.

**PWA Capabilities:** Service worker implementation enables offline functionality and automatic app updates with user notifications. Manifest configured for installable progressive web app experience.

**Calculator Features:** Three operational modes (Basic, Scientific, Expression) with mathjs BigNumber providing 64-digit precision. Scientific mode includes trigonometric functions, logarithms, constants (π, e), and advanced operations. Expression mode supports complex mathematical expressions with safe evaluation.

Production optimizations include database indexing, boot-time environment variable validation (critical and optional services), enhanced API security hardening for search/ChatGPT endpoints, and React Query optimizations (staleTime: Infinity, smart retries, disabled window refetching). API resilience ensures graceful handling of external API failures for stock/crypto additions, allowing manual input and subsequent synchronization.

## External Dependencies

### AI Services

- **OpenAI GPT-5:** Daily briefing generation, email automation, lifestyle recommendations, educational content.
- **OpenAI GPT-4o:** AI Intelligence Hub (portfolio reports, trading recommendations, tax analysis, rebalancing, anomaly detection), ChatGPT assistant.
- **OpenAI GPT-4o-mini:** Cost-optimized AI analysis for text documents and notes.
- **OpenAI GPT-4o Vision:** OCR and analysis of images in the Notepad system.

### Search Services

- **Tavily API:** Real-time web search for global search bar.

### Email Integration

- **Google Mail API via OAuth2:** For email synchronization, using Replit Connectors.

### Financial Data Integration

- **Alpha Vantage API:** Real-time stock prices.
- **CoinGecko API:** Cryptocurrency prices.
- **Plaid:** (Planned) Bank account aggregation.

### Third-Party Services

- **Replit Auth (OIDC):** User authentication.
- **Replit Connectors:** Secure credential management.
- **Google Fonts:** Typography (Inter, JetBrains Mono).
- **Recharts:** Financial data visualization.