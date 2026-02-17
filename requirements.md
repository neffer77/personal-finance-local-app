# Chase Credit Card Statement Analyzer — Requirements

## Data Source
- **Input format:** CSV export from Chase
- **CSV Headers:** Transaction Date, Transaction Posted, Description, Category, Type, Amount, Memo
- **Multi-card support:** Track multiple cards (e.g. Connor's + Heather's), view combined or individually
- **Storage:** SQLite database stored locally — persistent between sessions
- **Deduplication:** Must handle re-importing CSVs without creating duplicate transactions
- **Account types:** Credit cards first; design to support debit/checking CSVs in the future

## Platform & Deployment
- **Platform:** Desktop app (Electron + React)
- **Runs locally** — no cloud dependencies
- **Storage:** SQLite database stored locally

## Technical Design
- **Tech stack:** Electron + React + Tailwind CSS
- **Parser architecture:** Extensible — abstract CSV parser with bank-specific adapters
  - Build Chase adapter first
  - Design for future support of Amex, BofA, and other bank formats
- **Returns/credits handling:** 
  - Returns reduce the net total for their category in summaries/charts
  - Returns remain visible as individual line items in the transaction table
  - Clearly marked as credits (visual distinction from debits)

## Core Features
- Single CSV import (one month at a time)
- Multi-CSV import (combine multiple months for aggregate analysis)
- Track spending by category
- Spot trends over time
- Set and monitor budgets

## Analysis & Insights
- **Behavioral focus:** Designed to change spending habits through awareness, not guilt
- **Positive psychology approach:** Celebrate winning streaks, highlight improving trends, reinforce good habits — not just flag problems
- Month-over-month comparisons ("You spent X% more/less on dining vs. last month")
- Recurring charge detection with duration tracking ("This $Y/mo charge has been active for 6 months")
- Pace projections ("On track to exceed/stay under grocery target by $Z")
- Long-term trend analysis — surface gradual shifts that are easy to miss
- Winning behavior streaks (e.g. "3 months of declining dining spend", "Lowest grocery month this year")
- Category-level drill-down
- Top merchants / recurring charges detection
- **No anomaly detection** — user prefers to spot things manually in the table

## Budgeting
- **No hard budgets** — trend-driven awareness over rigid limits
- Show soft benchmarks based on user's own historical averages
- Let the user decide when to act based on the data

## Visualizations
- Bar charts (category breakdown)
- Line charts (spending over time)
- Pie/donut charts (proportional spending)
- Sortable/filterable transaction tables
- Rich, story-driven visualizations — dynamic, interactive tools that narrate spending patterns and surface "aha" moments
- Emphasis on long-term trajectory and momentum, not just snapshots

## Categories
- Start with Chase's built-in categories
- Allow user-defined custom categories
- Ability to re-map/override transactions to different categories

## UI/UX
- Desktop app (Electron)
- Dark mode and light mode with toggle
- **Design language:** Clean and minimal — Linear/Notion inspired. Generous whitespace, subtle borders, restrained color palette, typography-driven hierarchy
- **Landing view:** Transaction table with sorting & filtering as the primary view
- **Summary bar:** Collapsible stats bar above the transaction table (total spend, top category, vs last month, etc.) — show/hide toggle
- **Navigation:** Sidebar (always visible) with sections:
  - Transactions
  - Insights
  - Recurring
  - Goals / FIRE
  - Reports (Heather's shareable view)
  - Settings
- **Card selector:** Switch between individual cards or combined view
- Insights/dashboards accessible on demand (not forced on launch)

## Build Approach
- **Built entirely with Claude Code**
- Working title: TBD (placeholder for now)
- Requirements doc serves as the primary spec for Claude Code to execute against

## Import
- Drag & drop CSV onto the app
- File picker dialog ("Import" button)
- Assign card identity on import (whose card is this?)
- Deduplication on re-import

## Transaction Enrichment
- Tag individual transactions with custom notes/labels
- Split a single transaction across multiple categories
- Full-text keyword search across all transactions
- Override Chase's category assignment per transaction
- **Editing UX:** Inline editing for quick fields (category, amount override); side panel for enrichment (tags, notes, splits)

## Transaction Table
- **Time filtering:** All modes available:
  - By month (tabs or dropdown)
  - Infinite scroll with all transactions
  - Custom date range picker (start/end)
- Sortable columns
- Filterable by category, card, type, keyword
- Credits/returns visually distinct from debits

## Charting
- Library: Claude Code's recommendation (likely Recharts or D3 depending on complexity needs)
- Must support interactive tooltips, responsive sizing, and theme-aware colors (dark/light)

## Keyboard Shortcuts
- Power user keyboard navigation (j/k for row nav, / to search)
- Cmd+I for import, Cmd+F for search
- Shortcut hints visible in UI (like Linear's tooltip hints)
- Keyboard shortcut reference overlay (e.g. ? to open)

## Data Backup
- Back up SQLite database to a user-chosen location
- Restore from a backup file
- Manual trigger (no auto-backup needed for now)

## Smart Rules & Automation
- **Auto-categorize rules:** User-defined rules (e.g. "if description contains 'Starbucks', set category to Coffee")
- **Merchant name cleanup:** Normalize messy merchant strings (e.g. "STARBUCKS #12345 SAN DIEG" → "Starbucks")
- Rules persist in the database and apply on import
- Ability to view, edit, and delete rules in Settings
- All processing local — no cloud dependencies
- No encryption needed — trusts local machine security
- No telemetry or analytics sent externally

## Notifications
- No push/desktop notifications
- All alerts and reminders surface in-app only when the user opens it

## Positive Reinforcement & Gamification
- Streaks tracking (e.g. "12 days without eating out", "5 months of declining subscription spend")
- Progress bars toward user-defined goals (e.g. "$200 under average this month")
- Monthly "wins" summary highlighting categories where spending improved
- Tone: celebratory and motivating, not punitive

## Financial Goals Integration
- Tie spending insights to early retirement goal ($6M by age 45)
- Show how spending reductions compound toward the target (e.g. "Cutting $100/mo in dining = $X toward FIRE over 10 years")
- Track high-level savings rate or discretionary burn rate if data supports it
- Scope: awareness tool, not a full net worth tracker — but connect the dots between spending and long-term goals

## Multi-User Access (Heather)
- Heather can have her own view with her card data
- Shareable summary view (read-only, sendable)
- Shared screen mode for joint review sessions
- Flexible — all three modes available

## Subscriptions & Recurring Charges
- Dedicated "Recurring" sidebar view
- Auto-detect recurring charges from transaction patterns
- Track duration active, monthly cost, and annual cost
- Cancel reminders — ability to set a "review by" date for subscriptions
- Surface total recurring spend prominently

## Time Comparisons
- Side-by-side comparison of any two specific months
- Rolling 3 / 6 / 12 month trend lines
- Year-over-year same-month comparison (e.g. Jan 2025 vs Jan 2026)
- All comparison modes available within the Insights view

## Build Phases

### Phase 1 — MVP Core
- CSV import (drag & drop + file picker)
- Chase CSV parser
- SQLite storage with deduplication
- Transaction table (sort, filter, search)
- Card selector (multi-card support)
- Basic category breakdown charts (bar, pie/donut)
- Spending over time (line chart)
- Category override per transaction
- Dark/light mode toggle
- Sidebar navigation

### Phase 2 — Subscriptions
- Auto-detect recurring charges
- Dedicated Recurring sidebar view
- Duration, monthly cost, annual cost tracking
- Cancel review reminders (in-app)
- Total recurring spend summary

### Phase 3 — FIRE Integration
- Connect spending trends to $6M early retirement goal
- Compounding impact calculator ("saving $X/mo = $Y over 10 years")
- Savings rate / discretionary burn rate tracking
- Progress bars and milestone celebrations

### Phase 4 — Multi-User & Sharing
- Heather's own view with her card data
- Shareable read-only summary view
- Joint review mode (combined household view)

### Ongoing / Cross-Phase
- Positive reinforcement: streaks, wins, progress bars
- Transaction enrichment: tags, notes, splits
- Month-over-month, rolling trends, YoY comparisons
- Rich story-driven visualizations
- Extensible parser for future bank support
