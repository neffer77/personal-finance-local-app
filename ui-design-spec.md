# SpendLens — UI Design Specification

Reference this alongside the interactive wireframe (.jsx) when building the Electron app.

## Design Philosophy
Linear/Notion inspired. Every pixel should feel intentional. Prefer restraint — if in doubt, remove decoration. Let typography, spacing, and alignment do the heavy lifting.

## Typography
- **Primary font:** Geist (fallback: Inter, system-ui, sans-serif)
- **Monospace:** SF Mono, Fira Code, monospace (used for raw descriptions, keyboard hints, rule patterns)
- **Scale:**
  - Page titles: 20px / weight 650 / tracking -0.02em
  - Section headers: 12px / weight 600 / tracking 0.03em / uppercase
  - Body text: 13px / weight 440-520
  - Secondary text: 12px / weight 500
  - Labels & captions: 10-11px / weight 500-600 / tracking 0.04-0.06em / uppercase
  - Financial figures: tabular-nums variant for alignment

## Color Tokens

### Light Theme
| Token | Hex | Usage |
|-------|-----|-------|
| bg | #FFFFFF | Main background |
| bgSubtle | #F7F7F8 | Input backgrounds, subtle areas |
| bgHover | #F0F0F2 | Row/button hover states |
| bgActive | #E8E8EC | Active states, empty bar tracks |
| bgPanel | #FBFBFC | Sidebar, side panel backgrounds |
| bgCard | #FFFFFF | Card surfaces |
| border | #E4E4E7 | Primary borders |
| borderSubtle | #F0F0F2 | Table row dividers, light separators |
| text | #18181B | Primary text |
| textSecondary | #71717A | Secondary text, labels |
| textTertiary | #A1A1AA | Tertiary text, placeholders |
| accent | #2563EB | Primary accent (buttons, links, highlights) |
| accentSubtle | #EFF6FF | Accent backgrounds |
| green | #16A34A | Positive changes, credits, wins |
| red | #DC2626 | Negative changes, overspend |
| orange | #EA580C | Warnings, review reminders |
| purple | #7C3AED | Secondary accent (cleanup rules, tags) |

### Dark Theme
| Token | Hex | Usage |
|-------|-----|-------|
| bg | #09090B | Main background |
| bgSubtle | #18181B | Input backgrounds |
| bgHover | #27272A | Hover states |
| bgActive | #3F3F46 | Active states |
| bgPanel | #111113 | Sidebar, panels |
| bgCard | #18181B | Card surfaces |
| border | #27272A | Primary borders |
| borderSubtle | #1E1E22 | Subtle dividers |
| text | #FAFAFA | Primary text |
| textSecondary | #A1A1AA | Secondary text |
| textTertiary | #52525B | Tertiary text |
| accent | #3B82F6 | Primary accent |
| green | #22C55E | Positive |
| red | #EF4444 | Negative |

## Category Colors
Fixed colors per category for visual consistency across all charts and badges:
| Category | Color |
|----------|-------|
| Groceries | #16A34A |
| Food & Drink | #EA580C |
| Shopping | #7C3AED |
| Gas | #0891B2 |
| Entertainment | #DB2777 |
| Bills & Utilities | #2563EB |
| Travel | #CA8A04 |
| Health & Wellness | #059669 |
| Personal | #6366F1 |

## Spacing Scale
Use multiples of 4px: 4, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40

## Border Radius
- Buttons, inputs, badges: 4-6px
- Cards, panels: 8-10px
- Pill shapes (rare): full radius

## Shadows
- Default: `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)`
- Elevated (dark): `0 4px 12px rgba(0,0,0,0.4)`
- Use sparingly — prefer borders over shadows for separation

## Layout

### Sidebar (232px fixed width)
- Always visible
- App logo + title at top
- Card selector dropdown below title
- Navigation items with icon + label + keyboard hint
- Settings + Shortcuts at bottom, separated by border

### Main Content Area
- Full remaining width
- View-specific content renders here
- Toolbar at top for Transactions view

### Side Panel (340px, conditional)
- Slides in from right when transaction selected
- Only appears in Transactions view
- Dismissed with × button or Escape key

## Component Patterns

### Transaction Table Row
- Hover: bgHover background
- Selected: accentSubtle background
- Columns: Date | Description (name + raw) | Category badge | Card | Tags | Amount
- Amount: right-aligned, tabular-nums, green for credits

### Category Badge
- Dot + label in category color
- Background: category color at 7% opacity
- Font: 11px / weight 520

### Stat Card
- Label (uppercase, tertiary) → Value (large, bold) → Sub-stat (small, colored)
- Used in summary bar and recurring totals

### Keyboard Hints
- Monospace, 10px, subtle border, bgSubtle background
- Shown next to sidebar items and toolbar actions

## Interactions
- **Row click** → opens side panel
- **Inline edit** → category dropdown directly in side panel
- **Hover** → subtle background change (0.1s ease)
- **Animations:** slideIn (panel), slideDown (summary bar) — 0.15-0.2s ease
- **Focus:** visible focus rings using accent color for accessibility

## Responsive Notes
Since this is an Electron desktop app with a minimum viable window size:
- Minimum width: ~1024px
- Side panel may compress or overlay at smaller widths
- Sidebar does not collapse in MVP (could be a future enhancement)
