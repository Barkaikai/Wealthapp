# Wealth Automation Platform

## Overview

This is an AI-powered life automation platform designed for billionaire-level wealth management and lifestyle optimization. The application automates financial tracking, email management, daily routines, and decision-making with minimal human input. It aggregates assets across multiple platforms (stocks, crypto, bonds, real estate), uses AI to categorize and draft email replies, generates daily briefings with portfolio insights, and helps users build optimized daily routines based on successful lifestyle patterns.

## Recent Changes

**October 1, 2025 - Real Financial API Integration**
- ✅ Added Alpha Vantage integration for real-time stock prices
- ✅ Added CoinGecko integration for cryptocurrency prices  
- ✅ Updated database schema to track quantity, source, and last_synced for assets
- ✅ Implemented financial sync services with automatic price updates
- ✅ Added API endpoints for syncing prices and adding positions with auto-fetch
- ✅ Updated Wealth Dashboard UI with:
  - "Sync Prices" button for one-click portfolio refresh
  - Tabbed "Add Asset" dialog (Stock/Crypto/Manual modes)
  - Auto-price fetching when adding stock/crypto positions
- 🔄 Waiting for API keys: ALPHA_VANTAGE_API_KEY, COINGECKO_API_KEY
- 📋 Next: Plaid integration for bank account aggregation (requires user credentials)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and data fetching

**UI Component System:**
- Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- Tailwind CSS with custom design tokens following Material Design 3 principles
- Dark-first design approach with support for light mode
- Custom color palette optimized for financial data visualization (chart colors, status indicators)
- Typography system using Inter for UI/body text and JetBrains Mono for financial figures
- Path aliases configured (@/, @shared/, @assets/) for clean imports

**State Management:**
- React Query for server state with infinite stale time and disabled refetching (manual refresh pattern)
- React Hook Form with Zod validation for form state and validation
- Context API for theme management (dark/light mode switching)

**Key Design Patterns:**
- Component composition with shadcn/ui's slot pattern for flexible component variants
- Custom hooks for authentication (useAuth), toasts (useToast), and responsive design (useIsMobile)
- Separation of concerns: UI components in `/components`, page-level components in `/pages`, shared utilities in `/lib`

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for the REST API
- Session-based authentication using express-session with PostgreSQL session store
- Vite middleware integration for development with HMR support

**Authentication & Authorization:**
- Replit Auth integration using OpenID Connect (OIDC)
- Passport.js strategy for authentication flow
- Session management with connect-pg-simple for PostgreSQL-backed sessions
- User profile stored in database with automatic upsert on login

**API Structure:**
- RESTful endpoints organized by domain:
  - `/api/auth/*` - Authentication and user management
  - `/api/assets/*` - Financial asset tracking and management
  - `/api/briefing/*` - AI-generated daily briefings
  - `/api/emails/*` - Email synchronization and AI drafting
  - `/api/routines/*` - Daily routine building and recommendations
  - `/api/events/*` - Financial event logging

**Request/Response Flow:**
- Middleware for request logging with timing and response capture
- JSON request body parsing
- Error handling middleware with status code and message extraction
- CORS and security headers configured for production deployment

### Data Storage

**Database:**
- PostgreSQL as primary database (via Neon serverless)
- Drizzle ORM for type-safe database queries and migrations
- WebSocket connection pooling for serverless compatibility

**Schema Design:**
- `users` - User profiles with email, names, profile image (linked to Replit Auth)
- `sessions` - Session storage for authentication (indexed on expiry)
- `assets` - Financial assets with type, value, quantity, allocation, 24h change tracking, source (manual/alpha_vantage/coingecko/plaid), last_synced timestamp
- `events` - Financial events log (dividends, trades, statements)
- `routines` - User's daily schedule with time blocks, categories, duration
- `emails` - Synced emails with AI categorization (personal/finance/investments)
- `briefings` - AI-generated daily briefings with highlights, risks, actions

**Data Relationships:**
- All user data tables reference `users.id` with cascade delete
- Timestamp tracking on all records (createdAt/updatedAt)
- Indexes on foreign keys and frequently queried fields

### External Dependencies

**AI Services:**
- OpenAI GPT-5 for:
  - Daily briefing generation from portfolio data
  - Email categorization (personal/finance/investments)
  - Email reply drafting
  - Lifestyle recommendations based on billionaire routines
- All AI interactions use JSON mode for structured responses

**Email Integration:**
- Google Mail API via OAuth2 for email synchronization
- Replit Connectors for managed OAuth credentials
- Access token refresh handling with automatic expiry detection
- Email fetching with metadata extraction (from, subject, preview)

**Financial Data Integration:**
- Alpha Vantage API for real-time stock prices (free tier: 500 calls/day)
- CoinGecko API for cryptocurrency prices (free tier: 30 calls/minute)
- Plaid for bank account aggregation (requires user credentials)
- Automatic price syncing with quantity-based position tracking
- Support for multiple asset sources (manual, API-fetched, bank-synced)

**Third-Party Services:**
- Replit Auth (OIDC) for user authentication
- Replit Connectors for secure credential management
- Google Fonts (Inter, JetBrains Mono) for typography
- Recharts for financial data visualization

**Development Tools:**
- Replit-specific plugins for runtime error overlay and development banners
- esbuild for production server bundling
- Drizzle Kit for database schema management and migrations

**Security & Privacy:**
- Environment variables for sensitive credentials (DATABASE_URL, OPENAI_API_KEY, SESSION_SECRET)
- HTTPS-only cookies with httpOnly flag
- Session TTL of 7 days with automatic cleanup
- Multi-factor authentication ready (infrastructure in place)
- Isolated sandboxed environment for AI agent execution (mentioned in requirements)