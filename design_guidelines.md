# Design Guidelines: Exquisite Luxury Billionaire Platform

## Design Philosophy

**Core Identity:** Ultra-Premium Financial Command Center for High Net Worth Individuals

**Design Approach:** Sophisticated Luxury meets Professional Excellence
- Bloomberg Terminal precision + Private banking elegance
- Subtle opulence through premium materials (gold accents, rich textures)
- Executive-level sophistication without ostentation
- Dark-luxury aesthetic with refined gold/champagne highlights

**Guiding Principles:**
1. **Exquisite Restraint** - Luxury is shown through quality, not quantity
2. **Effortless Power** - Complex capabilities presented with elegant simplicity
3. **Timeless Sophistication** - Premium aesthetics that age gracefully
4. **Confident Authority** - Commands respect through refined visual language

## Color Palette

### Dark Luxury Mode (Primary)

**Base Surfaces:**
- Background Deep: 230 25% 6% (rich midnight blue-black)
- Background Primary: 230 20% 10% (elevated midnight)
- Background Secondary: 230 15% 14% (luxury panel)
- Background Tertiary: 230 12% 18% (premium card)

**Text Hierarchy:**
- Text Primary: 40 15% 98% (warm champagne white)
- Text Secondary: 40 10% 75% (refined silver)
- Text Tertiary: 40 8% 55% (subtle platinum)

**Luxury Accents:**
- Gold Primary: 42 88% 62% (24k gold)
- Gold Secondary: 45 75% 55% (champagne gold)
- Deep Blue: 230 60% 45% (royal sapphire)
- Success Green: 142 50% 48% (emerald wealth)
- Warning Amber: 38 95% 58% (amber alert)
- Danger Crimson: 0 72% 55% (refined red)

**Chart Palette (Sophisticated):**
- Chart 1: 42 88% 62% (gold)
- Chart 2: 230 60% 55% (royal blue)
- Chart 3: 142 50% 48% (emerald)
- Chart 4: 280 45% 60% (amethyst)
- Chart 5: 20 70% 50% (copper)

### Light Luxury Mode (Optional)

**Base Surfaces:**
- Background: 40 20% 98% (warm cream)
- Surface: 40 15% 100% (pearl white)
- Elevated: 40 12% 96% (champagne mist)

**Text:**
- Primary: 230 25% 12% (deep charcoal)
- Secondary: 230 15% 35% (slate gray)

## Typography

**Font Families:**
- Display: 'Playfair Display' (elegant serif for headlines) OR 'Cormorant Garamond'
- Primary: 'Inter' (refined sans-serif for UI/body)
- Monospace: 'JetBrains Mono' (financial data, precision)
- Accent: 'Cinzel' (luxury headers, optional)

**Hierarchy:**
- Hero Display: 3.5rem (56px) / font-bold / tracking-tight / serif
- Display: 2.75rem (44px) / font-semibold / serif
- H1: 2rem (32px) / font-semibold / sans-serif
- H2: 1.5rem (24px) / font-semibold / sans-serif
- H3: 1.25rem (20px) / font-medium / sans-serif
- Body Large: 1rem (16px) / font-normal
- Body: 0.9375rem (15px) / font-normal
- Small: 0.8125rem (13px) / font-normal
- Financial Data: 1.25rem (20px) / font-mono / font-semibold / tabular-nums

**Premium Typography Details:**
- Letter spacing: -0.02em for headlines (tighter, more sophisticated)
- Line height: 1.3 for display text, 1.6 for body
- Use tabular-nums for all financial figures (aligned columns)

## Layout System

**Luxury Spacing:**
- Micro: 2px, 4px (refined details)
- Small: 8px, 12px (component padding)
- Medium: 16px, 24px (section spacing)
- Large: 32px, 48px (major divisions)
- XL: 64px, 96px (hero sections)

**Premium Grid:**
- Dashboard: 12-column with 24px gaps
- Sidebar: 320px expanded (80px icon-only collapsed)
- Content max-width: 1400px (spacious, executive)
- Cards: Generous padding (p-8), min-width 320px

## Visual Elements

### Hero Sections & Backgrounds

**Landing/Login Page:**
- Full-screen hero with luxury lifestyle imagery
- Dark gradient overlay (from rgba(10,12,20,0.85) to rgba(10,12,20,0.65))
- Centered premium content with gold accents
- Subtle parallax on scroll (minimal, refined)

**Dashboard Pages:**
- Subtle textured backgrounds (fine grain, barely visible)
- Optional: Top hero strip with blurred luxury image + dark wash
- Frosted glass cards (backdrop-blur-xl, bg-opacity-30)

**Image Treatment:**
- All lifestyle images: Dark overlay (40-60% opacity)
- Subtle vignette effect on edges
- High contrast with overlaid text
- Use gold/champagne text on dark image backgrounds

### Premium Components

**Cards & Panels:**
- Frosted glass effect: backdrop-blur-xl + subtle border
- Gold micro-border (1px) on hover for premium cards
- Soft shadow: shadow-2xl with warm tint
- Border radius: 12px (refined, not too round)

**Buttons:**
- Primary: Gradient gold (from gold-400 to gold-500)
  - h-12, px-8, rounded-lg, font-semibold
  - Subtle shine effect on hover
- Secondary: Outlined with gold border, transparent bg
  - border-2 border-gold-400/50
  - Frosted glass effect on hover
- Tertiary: Ghost with subtle hover elevation

**Data Display:**
- Stat Cards with premium treatment:
  - Large financial figures in monospace
  - Gold accent on trend indicators
  - Subtle gradient backgrounds
  - Icon in gold/champagne for visual hierarchy

**Navigation:**
- Sidebar with dark luxury background
- Gold active state indicator (left border accent)
- Smooth transitions (300ms ease-in-out)
- Icons with gold tint on hover

### Luxury Details

**Accents & Ornaments:**
- Fine divider lines: 1px gold/30 opacity
- Corner flourishes on hero sections (optional, subtle)
- Gradient overlays: from deep blue to gold (5-10% opacity)
- Premium loading states: Gold shimmer effect

**Shadows & Depth:**
- Multi-layer shadows for depth:
  - Primary: 0 10px 40px rgba(0,0,0,0.3)
  - Accent: 0 0 60px rgba(251,191,36,0.1) (gold glow)
- Elevation hierarchy: 3 levels (card, elevated, floating)

**Borders & Frames:**
- Primary borders: 1px solid gold/20
- Elevated borders: 1px solid gold/40
- Premium frames: 2px gradient border (gold to transparent)

## Page-Specific Treatments

### Landing Page (New)
- Full-screen hero with luxury gala/mansion imagery
- Centered headline with serif typography
- Gold CTA button with premium hover state
- Subtle scroll indicator (gold chevron)

### Daily Briefing
- Hero stat with gold large number display
- Frosted glass stat cards in 4-column grid
- Premium highlights with gold bullet points
- Market overview with sophisticated charts

### Wealth Dashboard
- Top: Portfolio value hero with subtle image background
- Asset allocation: Premium donut chart with gold accents
- Asset table with hover row highlights (gold tint)
- Tabbed interface with gold active indicators

### Email Manager
- Three-pane with frosted dividers
- Category pills with gold active state
- Draft replies in expandable gold-bordered section
- Smooth transitions between emails

### Routines & Learn
- Timeline with gold milestone markers
- Educational cards with luxury imagery backgrounds
- Premium typography for content hierarchy

## Animations & Interactions

**Refined Motion:**
- Number count-up: Smooth with gold shimmer
- Card hover: Subtle lift + gold border glow (300ms)
- Page transitions: Elegant fade (400ms)
- Chart animations: Sequential reveal (stagger 100ms)
- Scroll reveals: Fade up with blur (minimal, tasteful)

**Interactive States:**
- Hover: Subtle elevation + gold accent
- Active: Gentle scale (0.98) + increased glow
- Focus: Gold ring outline (2px)
- Loading: Gold shimmer sweep effect

## Accessibility

- Maintain WCAG AAA contrast on text
- Gold accents never sole indicator (pair with icons)
- Keyboard navigation with visible gold focus states
- Screen reader labels on all luxury visual elements
- Touch targets: minimum 48x48px

## Implementation Notes

**Asset Usage:**
- Hero images: Use luxury gala/mansion scenes
- Card backgrounds: Subtle blurred versions (20% opacity)
- Profile sections: Executive/professional portraits
- Empty states: Minimalist luxury illustrations

**Performance:**
- Optimize images: WebP format, lazy loading
- Backdrop blur: CSS only, no canvas
- Animations: GPU-accelerated transforms only
- Gold gradients: CSS gradients, not images

**Consistency:**
- All gold: Use HSL 42 88% 62% as base
- All shadows: Include subtle gold tint (0.05 opacity)
- All transitions: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- All borders: 1-2px maximum, gold-based
