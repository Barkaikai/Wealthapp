# Wealth Automation Platform

## Overview

This is an AI-powered life automation platform designed for billionaire-level wealth management and lifestyle optimization. The application automates financial tracking, email management, daily routines, and decision-making with minimal human input. It aggregates assets across multiple platforms (stocks, crypto, bonds, real estate), uses AI to categorize and draft email replies, generates daily briefings with portfolio insights, and helps users build optimized daily routines based on successful lifestyle patterns.

## Recent Changes

**October 1, 2025 - AI Briefing Generation Fixed**
- ✅ Fixed GPT-5 timeout issue with automatic fallback to GPT-4o
- ✅ Added 45-second timeout for AI generation requests
- ✅ Improved error handling with user-friendly messages
- ✅ Fixed empty response issue when no briefing exists (returns null instead of undefined)
- ✅ Enhanced logging: Shows which AI model was used (GPT-5 or GPT-4o fallback)
- ✅ Fallback strategy: Tries GPT-5 first, automatically falls back to GPT-4o if timeout/error
- ✅ Test result: Briefing generation working successfully with 2 highlights, 1 risk, 3 actions

**October 1, 2025 - Login UX Improvement**
- ✅ Fixed confusing login button labels on landing page
- ✅ Changed "Begin Your Journey" → "Sign In" for clarity
- ✅ Changed "Access Your Platform" → "Sign In" for consistency
- ✅ Both buttons now clearly indicate authentication action
- ✅ Verified authentication flow works correctly (login/logout tested)

**October 1, 2025 - Mobile Responsiveness & WCAG AA Compliance**
- ✅ Fixed Learn system topic extraction for long briefing highlights:
  - Extracts first 4 meaningful words from slugs
  - Filters out digits, percentages, and filler words using `/[\d%]/` regex
  - Fallback to sanitized slug (max 60 chars) if no meaningful words found
  - Prevents empty/garbage topics from reaching AI generation
- ✅ Implemented WCAG AA touch target compliance (all interactive elements ≥36×36px):
  - Sidebar toggle: 36×36px on all viewports (forced with !important override)
  - Logout button: 36px height (removed size="sm", uses default)
  - LearnPage Back buttons: 36px height across all states (loading/error/success)
  - Tab triggers: 36px minimum height (updated TabsTrigger with py-2.5 + min-h-9)
- ✅ Fixed mobile responsive layout on Wealth Dashboard:
  - Header stacks vertically on mobile (`flex-col sm:flex-row`)
  - Action buttons wrap with `flex-wrap` and shortened text on mobile
  - Buttons use `flex-1 sm:flex-none` for full-width on mobile, auto on desktop
  - Eliminated horizontal scrolling on all mobile viewports (390px-412px tested)
- ✅ Verified cross-platform mobile compatibility:
  - Tested on iPhone (390×844) and Android (412×915) viewports
  - All touch targets meet accessibility standards
  - Sidebar drawer works smoothly on mobile devices

**October 1, 2025 - Luxury Theme Implementation**
- ✅ Redesigned with exquisite luxury aesthetic for ultra-premium experience
- ✅ Updated design guidelines with sophisticated luxury principles
  - Dark luxury palette: Rich midnight blue-black (230 25% 6%) backgrounds
  - Gold primary accent (42 88% 62%) - 24k gold luxe
  - Warm champagne text (40 15% 98%) for refined elegance
  - Premium chart colors: Gold, Royal Blue, Emerald, Amethyst, Copper
- ✅ Enhanced CSS theme system:
  - Gold-tinted hover/active states with subtle glow
  - Luxury shadows with ambient gold glow effect
  - Refined elevation system for premium depth
  - Light mode: Warm cream & pearl backgrounds
- ✅ Premium landing page with luxury imagery:
  - Full-screen hero with gradient overlay
  - Professional luxury gala/lifestyle backgrounds
  - Gold accent CTAs with premium hover states
  - Sophisticated scroll animations and visual hierarchy
- ✅ Global luxury styling applied via CSS custom properties
  - All components inherit gold primary color
  - Buttons, badges, borders use luxury gold accents
  - Premium shadows on cards and elevated elements

**October 1, 2025 - AI-Powered Learn System**
- ✅ Implemented comprehensive Learn system for AI-generated educational content
- ✅ Added `aiContent` database table with unique slug constraint for storing articles
- ✅ Created API endpoints (authenticated):
  - GET /api/learn/:slug - Fetch existing content
  - POST /api/learn/generate - Generate new AI content
- ✅ Built LearnPage component with auto-generation flow:
  - Click highlighted text → Navigate to /learn/:slug
  - Fetch content (or auto-generate if missing)
  - Display formatted markdown with title and summary
- ✅ Integrated LearnLink wrapper in Daily Briefing highlights
- ✅ Security features:
  - Authentication guards on all Learn endpoints
  - Zod validation for request/response data
  - Error handling (404/400/409/502/500 status codes)
  - Unique slug constraint prevents duplicates
- ✅ AI content generation via GPT-5 (500-800 word educational articles)
- ✅ Content persistence and reuse from database

**October 1, 2025 - Real Financial API Integration**
- ✅ Added Alpha Vantage integration for real-time stock prices (active with API key)
- ✅ Added CoinGecko integration with toggle support:
  - **Paid API**: Uses COINGECKO_API_KEY when available
  - **Public API**: Falls back to free public endpoints (no key required)
  - Toggle via `CRYPTO_DATA_SOURCE` env var: "public" or "paid"
  - Auto-detects: uses public API if no COINGECKO_API_KEY is set
- ✅ Updated database schema to track quantity, source, and last_synced for assets
- ✅ Implemented financial sync services with automatic price updates
- ✅ Added API endpoints for syncing prices and adding positions with auto-fetch
- ✅ Updated Wealth Dashboard UI with:
  - "Sync Prices" button for one-click portfolio refresh
  - Tabbed "Add Asset" dialog (Stock/Crypto/Manual modes)
  - Auto-price fetching when adding stock/crypto positions
- ✅ Crypto data sources: CoinGecko public API, CryptoCompare fallback
- 📋 Next: Plaid integration for bank account aggregation (requires user credentials)

**Email Automation MVP**
- ✅ Created automated email sorter with AI categorization
- ✅ Added `draftReply` field to emails database table
- ✅ Implemented email sync service that:
  - Fetches emails from Gmail
  - Categorizes into Personal/Finance/Investments using GPT-5
  - **Auto-generates and stores AI drafts for Finance/Investments emails**
  - Stores in database with metadata including draftReply
  - Tracks sync statistics (emails synced per category + drafts created)
- ✅ Email Manager UI:
  - Category tabs (All/Finance/Investments/Personal)  
  - **Displays stored AI drafts automatically** (Finance/Investments only)
  - Regenerate button to update stored drafts
  - Sync statistics showing drafts created
- ✅ API endpoints:
  - POST /api/emails/sync - Syncs and stores drafts
  - GET /api/emails - Returns emails with draftReply field
  - POST /api/emails/:id/draft - Regenerates and saves draft
- ✅ Data flow: Sync → Generate Draft → Store in DB → Display in UI
- ⚠️ **Known Limitation**: Gmail sync currently unavailable - Replit Gmail connector provides limited add-on scopes, not the `gmail.readonly` scope required to read full inbox. Error messages updated to clearly explain this platform limitation.

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
  - `/api/learn/*` - AI-generated educational content (clickable highlights)

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
- `aiContent` - AI-generated educational articles with unique slug, topic, content (markdown), summary

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
  - Educational article generation (Learn system, 500-800 word markdown articles)
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