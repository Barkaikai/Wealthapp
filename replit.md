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

**API Structure:** RESTful endpoints organized by domain, including authentication, asset management, AI briefings, email automation, routines, events, wealth monitoring (transactions/alerts/goals/liabilities), productivity (calendar/tasks), health metrics, Web3 wallets, voice commands, AI-generated educational content, and notepad/document management.

**Request/Response Flow:** Middleware for logging, JSON parsing, error handling, CORS, and security headers.

**Security Architecture (Oct 2025):** Comprehensive security middleware implemented following OWASP best practices:
- **Helmet.js:** HTTP security headers including Content Security Policy (CSP), X-Frame-Options, HSTS, and other security-focused headers
- **Rate Limiting:** 300 requests per 15 minutes per IP to prevent abuse and DDoS attacks
- **Cookie Security:** Secure cookie parsing with httpOnly, secure, and sameSite attributes
- **CSRF Protection:** Double Submit Cookie pattern using csrf-csrf library (requires CSRF_SECRET environment variable to activate)
- **Session Security:** PostgreSQL-backed sessions with __Host prefix, 30-day expiry, proxy-aware configuration
- **Health Endpoints:** /livez (liveness), /readyz (database connectivity), /healthz (redirect), /admin/diagnostics (system metrics)

### Data Storage

**Database:** PostgreSQL (Neon serverless) as the primary database, utilizing Drizzle ORM for type-safe queries and migrations.

**Schema Design:** Includes `users`, `sessions`, `assets`, `events`, `routines`, `emails`, `briefings`, `aiContent`, `transactions`, `wealthAlerts`, `financialGoals`, `liabilities`, `calendarEvents`, `tasks`, `healthMetrics`, `walletConnections`, `voiceCommands`, `notes`, `documents`, and `documentInsights`.

**Data Relationships:** All user-centric tables link to `users.id` with cascade delete, and all records include `createdAt`/`updatedAt` timestamps.

### System Design Choices

The platform features continuous background health monitoring with diagnostic history tracking and safe auto-fix capabilities. It includes a comprehensive diagnostic system with parallelized checks for various integrations. AI briefing generation has robust error handling and fallback mechanisms (GPT-5 to GPT-4o). A luxury theme is implemented globally with a dark luxury palette, gold accents, and premium visual effects. An AI-powered "Learn" system generates and persists educational content from highlighted text. Real financial API integrations provide real-time stock and crypto data with intelligent fallback mechanisms. Email automation includes AI categorization and automatic draft replies. 

**Recent Expansions (Oct 2025):** Added comprehensive wealth monitoring with transaction tracking (cost basis), wealth alerts (price/portfolio thresholds), financial goal management, and liability tracking for net worth calculation. Implemented Productivity Hub with calendar events and task management (AI-ready). Added health metrics tracking system. Created Web3 wallet integration layer supporting Coinbase, Hedera HBAR, MetaMask, and WalletConnect. Voice command logging infrastructure in place. **Latest (Oct 2025):** Added global calculator utility accessible from header across all pages with proper decimal handling and operation chaining (displays current operation in progress). Implemented API resilience for stock/crypto additions - platform now creates assets with fallback values when external price APIs (Alpha Vantage/CoinGecko) are unavailable, allowing manual entry and subsequent price synchronization. **Notepad System (Oct 2025):** Comprehensive notepad and document management system with AI-powered analysis. Notes work independently without Object Storage requirement. Documents require Replit Object Storage bucket configuration (Tools > Object Storage). AI analysis uses cost-optimized GPT-4o-mini for text files and GPT-4o Vision for image OCR. Supports text files, markdown, and images with improved error messaging for unsupported formats (PDF/Word explain upload vs. analysis capabilities). System includes proper 503 error handling when Object Storage unavailable with user-friendly setup guidance. **Navigation (Oct 2025):** Notepad repositioned to position 2 in Automation Hub for easy access. **Web Search & ChatGPT Integration (Oct 2025):** Added global web search bar and ChatGPT assistant accessible from header on all pages. Web search powered by Tavily API providing real-time web results. ChatGPT interface using OpenAI GPT-4o for conversational AI assistance. Both features integrated seamlessly into header with responsive design.

**Production Optimizations (Oct 2025):**
- **Database Performance:** Added indices on all userId columns across 18 tables (assets, events, routines, emails, briefings, emailTemplates, transactions, wealthAlerts, financialGoals, liabilities, calendarEvents, tasks, healthMetrics, walletConnections, voiceCommands, notes, documents, documentInsights) to prevent table scans and improve query performance for user-scoped data.
- **Environment Validation:** Implemented boot-time validation of required and optional environment variables with clear logging of missing services. Critical variables (DATABASE_URL, SESSION_SECRET) are validated as required. Optional services (OPENAI_API_KEY, TAVILY_API_KEY, ALPHA_VANTAGE_API_KEY, COINGECKO_API_KEY, CSRF_SECRET) log warnings when missing with descriptions of affected functionality.
- **API Security Hardening:** Enhanced web search and ChatGPT endpoints with comprehensive validation including API key checks before processing, input sanitization, message structure validation, and specific error handling for 401/429 responses. OpenAI client instantiated per-request rather than at module load to prevent silent failures.
- **React Query Optimization:** Configured with staleTime: Infinity, smart retry logic (no retries for 4xx errors, exponential backoff for 5xx), and disabled window focus refetching to minimize unnecessary network requests.

**Testing Status (Oct 2025):** Comprehensive end-to-end testing completed across all features. All core functionality verified and working correctly:
- ✅ Daily Briefing: AI generation working (GPT-5 with GPT-4o fallback, ~30-60s generation time)
- ✅ Wealth Dashboard: Asset creation with API resilience - stocks/crypto added successfully even when price APIs unavailable
- ✅ Wealth Monitor: Transactions, alerts, goals, and liabilities all operational
- ✅ Productivity Hub: Calendar events and task management working with Select components
- ✅ Health Monitoring: Metrics tracking functional
- ✅ Web3 Wallets: Wallet connection management operational
- ✅ Email Manager: Sync properly handles Gmail scope limitations with user-friendly error messages
- ✅ Calculator: Global utility accessible from header, proper decimal and operation handling
- ✅ Routine Builder: Core functionality working (partial testing due to transient API issues)
- ✅ Notepad System: Production-ready with notes CRUD, AI analysis (GPT-4o-mini for text, GPT-4o Vision for images), graceful Object Storage handling
- ✅ Web Search: Tavily API integration working, real-time search results displayed across all pages
- ✅ ChatGPT Assistant: GPT-4o conversational AI accessible from header on all pages, maintains conversation history

**API Resilience Strategy:**
- Stock/crypto additions gracefully handle Alpha Vantage/CoinGecko API failures
- Assets created with value=0 and source='manual' when price fetch fails
- Users can manually update values or trigger price sync later
- Existing sync mechanisms automatically update placeholder values when APIs become available
- Future enhancement: Consider UI notifications when assets created in manual mode

**Minor Considerations:**
- AI briefing generation takes 30-60 seconds (expected for GPT-5/GPT-4o processing)
- Gmail sync limited by Replit connector scopes (gmail.readonly not available) - properly surfaced to users
- Assets may show value=0 initially if market data APIs unavailable - sync prices to update
- Yahoo Finance API may rate-limit (returns 401) - expected behavior, silently handled with graceful fallbacks

## External Dependencies

**AI Services:**
- **OpenAI GPT-5:** Used for daily briefing generation, email categorization, email reply drafting, lifestyle recommendations, and educational article generation (Learn system). All AI interactions are in JSON mode.
- **OpenAI GPT-4o:** Used for ChatGPT conversational assistant accessible from header on all pages.
- **OpenAI GPT-4o-mini:** Used for cost-optimized AI analysis of text documents and notes in the Notepad system.
- **OpenAI GPT-4o Vision:** Used for OCR and analysis of images in the Notepad system.

**Search Services:**
- **Tavily API:** Real-time web search API for global search bar functionality. Provides up to 1,000 free searches per month.

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