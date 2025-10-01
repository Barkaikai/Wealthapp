# Wealth Automation Platform

## Overview

This AI-powered platform is designed for billionaire-level wealth management and lifestyle optimization. It automates financial tracking, email management, daily routines, and decision-making with minimal human input. Key capabilities include aggregating assets across various platforms (stocks, crypto, bonds, real estate), AI-driven email categorization and reply drafting, generating daily briefings with portfolio insights, and building optimized daily routines based on successful lifestyle patterns. The platform aims to provide an ultra-premium experience with a luxury aesthetic and advanced AI functionalities for comprehensive life automation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:** React 18 with TypeScript, Vite, Wouter for routing, and TanStack Query for server state management.

**UI Component System:** Shadcn/ui components built on Radix UI, Tailwind CSS with custom design tokens adhering to Material Design 3 principles. It features a dark-first design with light mode support, a custom color palette for financial data visualization, and Inter and JetBrains Mono fonts. Mobile responsiveness and WCAG AA compliance are prioritized.

**State Management:** React Query for server state, React Hook Form with Zod for form validation, and Context API for theme management.

**Key Design Patterns:** Component composition, custom hooks for authentication, toasts, and responsive design, and clear separation of concerns.

### Backend Architecture

**Server Framework:** Express.js with TypeScript for the REST API, integrated with Vite middleware for development.

**Authentication & Authorization:** Replit Auth using OpenID Connect (OIDC), Passport.js, and session management with connect-pg-simple for PostgreSQL-backed sessions.

**API Structure:** RESTful endpoints organized by domain, including authentication, asset management, AI briefings, email automation, routines, events, wealth monitoring (transactions/alerts/goals/liabilities), productivity (calendar/tasks), health metrics, Web3 wallets, voice commands, and AI-generated educational content.

**Request/Response Flow:** Middleware for logging, JSON parsing, error handling, CORS, and security headers.

### Data Storage

**Database:** PostgreSQL (Neon serverless) as the primary database, utilizing Drizzle ORM for type-safe queries and migrations.

**Schema Design:** Includes `users`, `sessions`, `assets`, `events`, `routines`, `emails`, `briefings`, `aiContent`, `transactions`, `wealthAlerts`, `financialGoals`, `liabilities`, `calendarEvents`, `tasks`, `healthMetrics`, `walletConnections`, and `voiceCommands`.

**Data Relationships:** All user-centric tables link to `users.id` with cascade delete, and all records include `createdAt`/`updatedAt` timestamps.

### System Design Choices

The platform features continuous background health monitoring with diagnostic history tracking and safe auto-fix capabilities. It includes a comprehensive diagnostic system with parallelized checks for various integrations. AI briefing generation has robust error handling and fallback mechanisms (GPT-5 to GPT-4o). A luxury theme is implemented globally with a dark luxury palette, gold accents, and premium visual effects. An AI-powered "Learn" system generates and persists educational content from highlighted text. Real financial API integrations provide real-time stock and crypto data with intelligent fallback mechanisms. Email automation includes AI categorization and automatic draft replies. 

**Recent Expansions (Oct 2025):** Added comprehensive wealth monitoring with transaction tracking (cost basis), wealth alerts (price/portfolio thresholds), financial goal management, and liability tracking for net worth calculation. Implemented Productivity Hub with calendar events and task management (AI-ready). Added health metrics tracking system. Created Web3 wallet integration layer supporting Coinbase, Hedera HBAR, MetaMask, and WalletConnect. Voice command logging infrastructure in place.

**Known Issues:** Productivity Hub, Health Monitoring, and Web3 Wallets pages have a critical form bug where shadcn Select components don't emit values to FormData, causing creation requests to fail with 400 errors. Forms need refactoring to use controlled state or react-hook-form for Select values.

## External Dependencies

**AI Services:**
- **OpenAI GPT-5:** Used for daily briefing generation, email categorization, email reply drafting, lifestyle recommendations, and educational article generation (Learn system). All AI interactions are in JSON mode.

**Email Integration:**
- **Google Mail API via OAuth2:** For email synchronization. Utilizes Replit Connectors for credential management and handles access token refresh.
- **Note:** Current Gmail sync functionality is limited by Replit Gmail connector scopes.

**Financial Data Integration:**
- **Alpha Vantage API:** For real-time stock prices.
- **CoinGecko API:** For cryptocurrency prices, with toggle support for paid vs. public APIs and automatic fallback.
- **Plaid:** Planned for bank account aggregation.

**Third-Party Services:**
- **Replit Auth (OIDC):** For user authentication.
- **Replit Connectors:** For secure credential management.
- **Google Fonts:** For typography (Inter, JetBrains Mono).
- **Recharts:** For financial data visualization.

**Development Tools:**
- **Replit-specific plugins:** For development enhancements.
- **esbuild:** For production server bundling.
- **Drizzle Kit:** For database schema management and migrations.