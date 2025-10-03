# Design Guidelines: Coinbase-Inspired Modern Financial Platform

## Design Philosophy

**Core Identity:** Trusted, Modern Financial Platform for Everyone

**Design Approach:** Clean, Professional, and Accessible
- Coinbase-inspired clarity and trustworthiness
- Modern blue-based color palette
- Professional yet approachable interface
- Clean typography and generous white space
- Focus on usability and clarity

**Guiding Principles:**
1. **Trust Through Clarity** - Every element serves a clear purpose
2. **Modern Simplicity** - Clean, uncluttered interface
3. **Professional Excellence** - Corporate-grade reliability
4. **Accessible Design** - Intuitive for all users

## Color Palette

### Primary Colors (Coinbase-Inspired Blue)

**Core Blue Palette:**
- Primary Blue: 221 83% 53% (Coinbase blue - vibrant, trustworthy)
- Primary Blue Hover: 221 83% 45% (darker on interaction)
- Primary Blue Light: 221 83% 60% (lighter variant)

**Base Surfaces (Dark Mode):**
- Background: 222 47% 11% (deep navy background)
- Surface: 217 33% 17% (elevated surface)
- Card: 215 28% 17% (card background)
- Border: 215 20% 25% (subtle borders)

**Base Surfaces (Light Mode):**
- Background: 0 0% 100% (pure white)
- Surface: 214 32% 91% (light blue-gray)
- Card: 0 0% 98% (off-white cards)
- Border: 214 20% 85% (light borders)

**Text Hierarchy (Dark Mode):**
- Text Primary: 210 40% 98% (bright white)
- Text Secondary: 215 20% 65% (muted gray-blue)
- Text Tertiary: 215 16% 47% (subtle gray)

**Text Hierarchy (Light Mode):**
- Text Primary: 222 47% 11% (dark navy)
- Text Secondary: 215 25% 27% (medium gray)
- Text Tertiary: 215 16% 47% (light gray)

**Accent Colors:**
- Success: 142 76% 36% (green - successful operations)
- Warning: 38 92% 50% (amber - caution)
- Danger: 0 84% 60% (red - errors/critical)
- Info: 199 89% 48% (cyan - information)

**Chart Colors (Professional):**
- Chart 1: 221 83% 53% (primary blue)
- Chart 2: 142 76% 36% (green)
- Chart 3: 38 92% 50% (amber)
- Chart 4: 271 81% 56% (purple)
- Chart 5: 199 89% 48% (cyan)

## Typography

**Font Families:**
- Primary: 'Inter' (all UI and body text)
- Monospace: 'JetBrains Mono' (numbers, code, data)
- Display: 'Inter' (consistent, clean headlines)

**Hierarchy:**
- Display: 2.5rem (40px) / font-bold / tracking-tight
- H1: 2rem (32px) / font-bold
- H2: 1.5rem (24px) / font-semibold
- H3: 1.25rem (20px) / font-semibold
- Body Large: 1rem (16px) / font-normal
- Body: 0.875rem (14px) / font-normal
- Small: 0.75rem (12px) / font-normal
- Financial Data: 1.5rem (24px) / font-mono / font-semibold / tabular-nums

**Typography Details:**
- Letter spacing: Normal (Coinbase uses clean, standard spacing)
- Line height: 1.5 for body text, 1.2 for headings
- Use tabular-nums for financial data
- Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

## Layout System

**Spacing (Consistent Grid):**
- 4px base unit system
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

**Grid & Structure:**
- Dashboard: 12-column grid with 24px gaps
- Sidebar: 280px expanded (64px collapsed)
- Content max-width: 1280px
- Cards: Medium padding (p-6), consistent spacing
- Mobile-first responsive design

## Visual Elements

### Components

**Cards:**
- Clean white/dark cards with subtle shadows
- Border radius: 12px (modern, friendly rounded corners)
- Border: 1px solid border color
- Hover: Subtle lift with shadow increase
- Padding: p-6 (24px) standard

**Buttons:**
- Primary: Solid Coinbase blue
  - h-11, px-6, rounded-lg, font-medium
  - Hover: Darker blue
- Secondary: Outlined blue border, transparent bg
  - border-2, hover: filled with blue/10
- Tertiary: Ghost with subtle hover bg

**Inputs:**
- Clean borders with blue focus ring
- Border radius: 8px
- Height: 44px (comfortable touch targets)
- Focus: 2px blue ring

**Navigation:**
- Sidebar with clean background
- Blue active state (left border + background tint)
- Icons with blue tint on hover
- Smooth transitions (200ms)

### Visual Polish

**Shadows:**
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.1)
- lg: 0 10px 15px rgba(0,0,0,0.1)
- xl: 0 20px 25px rgba(0,0,0,0.1)

**Borders:**
- Default: 1px solid border color
- Thick: 2px (for emphasis)
- Radius: 8px (inputs), 12px (cards), 16px (large components)

**States:**
- Hover: Subtle background change
- Active: Slight scale (0.98) or darker shade
- Focus: Blue ring (2px)
- Disabled: 50% opacity

## Animations & Interactions

**Motion:**
- Fast transitions: 150ms (micro-interactions)
- Standard: 200ms (buttons, hovers)
- Slow: 300ms (page transitions, modals)
- Easing: cubic-bezier(0.4, 0, 0.2, 1) (material design)

**Interactive Patterns:**
- Button hover: Background color shift + subtle lift
- Card hover: Shadow increase + subtle lift
- Page transitions: Smooth fade
- Loading: Blue spinner or skeleton screens

## Page Layouts

### Dashboard Pages
- Clean header with navigation
- Content in cards with consistent spacing
- Data visualization with blue accents
- Clear information hierarchy

### Forms & Settings
- Left-aligned labels
- Grouped related fields
- Clear section headings
- Primary action buttons (blue)
- Cancel/secondary actions (ghost)

### Data Tables
- Clean headers with sort indicators
- Alternating row backgrounds (subtle)
- Hover states on rows
- Pagination with blue active state

## Accessibility

- WCAG AA minimum (AAA preferred)
- Color never sole indicator
- Keyboard navigation with visible focus
- Screen reader friendly labels
- Touch targets: minimum 44x44px
- High contrast text

## Implementation Notes

**Consistency:**
- All blue: Use HSL 221 83% 53% as base
- All transitions: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- All borders: 1px, use semantic border colors
- All shadows: Use defined shadow scale

**Performance:**
- Optimize images: WebP, lazy loading
- Minimize animations: Transform and opacity only
- Use CSS for visual effects
- Efficient re-renders

**Dark/Light Mode:**
- Full support for both modes
- Smooth theme transitions
- Persistent user preference
- Semantic color tokens adapt automatically
