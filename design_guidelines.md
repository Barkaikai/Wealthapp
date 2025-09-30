# Design Guidelines: Billionaire Life Automation Platform

## Design Approach

**Selected Approach:** Hybrid - Design System (Material Design 3) + Financial Platform References

**Key References:**
- Bloomberg Terminal: Professional data density and information hierarchy
- Robinhood: Clean financial data presentation
- Linear: Modern dashboard aesthetics and typography
- Stripe Dashboard: Sophisticated data visualization

**Core Principles:**
1. Information density without clutter - every pixel serves a purpose
2. Instant comprehension - critical data visible at a glance
3. Professional sophistication - conveys trust and precision
4. Dark-first design - reduces eye strain for extended use

## Color Palette

**Dark Mode (Primary):**
- Background Primary: 222 20% 8% (deep charcoal)
- Background Secondary: 222 18% 12% (elevated surfaces)
- Background Tertiary: 222 16% 16% (cards, panels)
- Text Primary: 0 0% 98% (crisp white)
- Text Secondary: 0 0% 70% (muted labels)
- Text Tertiary: 0 0% 50% (metadata)

**Brand & Accent:**
- Primary: 210 100% 60% (professional blue - trust, stability)
- Success: 142 76% 45% (financial green - positive movements)
- Warning: 38 95% 58% (gold - alerts, opportunities)
- Danger: 0 84% 60% (red - risks, losses)
- Chart Colors: Use distinct hues (210°, 280°, 160°, 30°, 340°) at 65% saturation, 55% lightness

**Light Mode (Secondary):**
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Text: 222 20% 15%

## Typography

**Font Families:**
- Primary: 'Inter' (Google Fonts) - UI, body text, data labels
- Monospace: 'JetBrains Mono' - financial figures, code, precise data
- Display: 'Inter' at heavier weights (600-700) for headings

**Scale:**
- Display: 2.5rem (40px) / font-bold / tracking-tight
- H1: 2rem (32px) / font-semibold
- H2: 1.5rem (24px) / font-semibold  
- H3: 1.25rem (20px) / font-medium
- Body: 0.875rem (14px) / font-normal
- Small: 0.75rem (12px) / font-normal
- Financial Data: 1.125rem (18px) / font-mono / font-medium

## Layout System

**Spacing Primitives:**
- Core units: 2, 4, 6, 8, 12, 16, 24 (tailwind scale)
- Micro spacing: p-2, gap-2 (dense data)
- Standard spacing: p-4, gap-4 (default components)
- Section spacing: py-8, py-12 (content separation)
- Page margins: px-6 md:px-8 lg:px-12

**Grid System:**
- Dashboard: 12-column grid with 4-unit gaps
- Sidebar: Fixed 280px (collapsed: 64px icon-only)
- Main content: max-w-7xl with responsive padding
- Cards: min-w-80, flexible growth in grid

## Component Library

**Navigation:**
- Top bar: Fixed header with breadcrumbs, search, notifications, profile (h-16)
- Sidebar: Collapsible navigation with icons + labels, section grouping
- Tab navigation: Underline style with subtle hover states

**Data Display:**
- Stat Cards: Rounded-lg, p-6, subtle border, hover elevation
  - Large number (text-3xl font-mono)
  - Label (text-sm text-secondary)
  - Trend indicator (%, arrow icon, colored)
  
- Tables: Striped rows, sticky headers, sortable columns, hover highlights
  - Compact row height (h-12)
  - Monospace for numbers
  - Right-align numeric data

- Charts: Chart.js or Recharts
  - Area charts for portfolio growth
  - Bar charts for asset allocation
  - Line charts for trends
  - Donut charts for distribution

**Forms & Inputs:**
- Input fields: h-10, rounded-md, border-2, focus:border-primary
- Dark backgrounds with lighter borders (border-gray-700)
- Labels: text-sm font-medium mb-2
- Buttons: h-10, px-4, rounded-md, font-medium

**Cards & Panels:**
- Default card: bg-secondary, rounded-lg, border border-tertiary, p-6
- Elevated card: shadow-lg for emphasis
- Compact card: p-4 for dense layouts

**Buttons:**
- Primary: bg-primary text-white h-10 px-6 rounded-md
- Secondary: variant="outline" with bg-blur on images
- Danger: bg-danger text-white
- Icon buttons: w-10 h-10 rounded-md

**Overlays:**
- Modals: max-w-2xl, rounded-lg, p-6, backdrop-blur
- Dropdowns: rounded-md, shadow-xl, border
- Tooltips: text-xs, rounded, px-2 py-1, bg-gray-900

## Dashboard-Specific Patterns

**Daily Briefing:**
- Hero stat: Centered, extra-large total wealth figure
- 4-column grid: Stocks, Crypto, Bonds, Cash (each as stat card)
- Highlights list: Bullet points with icons, color-coded by type
- Risks section: Warning-colored border-l-4 accent

**Wealth Dashboard:**
- Left: Asset allocation donut chart
- Right: Portfolio timeline (area chart)
- Below: Asset table with sparkline trends per row

**Email Interface:**
- Three-pane layout: Categories sidebar (20%), email list (35%), preview (45%)
- AI-drafted replies in collapsed expandable section
- Category badges with distinct colors

**Routine Builder:**
- Timeline view with hourly blocks
- Drag-drop time allocation
- Template selector with preview cards

## Images

**Hero Section (Dashboard Landing):**
- NO large hero image - immediately show dashboard data
- Optional: Subtle abstract financial pattern as background texture

**Routine Templates:**
- Portrait photos of successful individuals (placeholder service: UI Faces)
- 300x300px rounded-lg cards with overlay gradient

**Empty States:**
- Use simple illustrations (unDraw style) for empty dashboards
- "No data yet" states with call-to-action

## Animations

**Minimal, Purposeful Only:**
- Number count-up on stat cards (initial load)
- Smooth chart data transitions (300ms ease)
- Sidebar collapse/expand (200ms ease-in-out)
- NO scroll animations, parallax, or decorative motion

## Accessibility

- All interactive elements: min 44x44px touch targets
- Color never sole indicator (use icons + text)
- Consistent dark mode across all inputs and text fields
- Focus visible states on all interactive elements
- ARIA labels on all icon buttons and data visualizations