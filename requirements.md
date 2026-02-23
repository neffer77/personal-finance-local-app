# SpendLens — Full Product Requirements

## Data Sources

### Credit Card Transactions
- **Input format:** CSV export from Chase
- **CSV Headers:** Transaction Date, Transaction Posted, Description, Category, Type, Amount, Memo
- **Multi-card support:** Track multiple cards (e.g. Connor's + Heather's), view combined or individually
- **Storage:** SQLite database stored locally — persistent between sessions
- **Deduplication:** Must handle re-importing CSVs without creating duplicate transactions
- **Account types:** Credit cards first; design to support debit/checking CSVs in the future
- **Historical data:** Must support importing 2+ years of past transaction history efficiently

### Income — ADP (Salary & Bonus)
- **Input format:** ADP payroll CSV export (one importer per institution)
- **Parser:** Dedicated `adp.parser.ts` implementing the shared `ParserInterface`
- **Data extracted:** Pay date, gross pay, net pay, deductions, pay type (regular / bonus / overtime)
- **Income forecasting:** User enters annual salary and bonus % target; app generates expected income entries for each pay period and bonus window (Aug / Feb); ADP imports resolve the forecast to actuals
- **Expected vs actual tracking:** Each forecast entry shows estimated amount; when the real import lands, it is matched and marked as fulfilled
- **Assignment:** Each ADP import is assigned to an "income account" (like card assignment on CSV import)

### Investments — Schwab & Fidelity
- **Input format:** PDF account statements (drag & drop into app)
- **PDF parsing built-in:** App auto-extracts structured data from PDFs; no manual CSV export required
- **Institutions supported Phase 1:** Schwab, Fidelity (each gets its own PDF parser)
- **Data extracted from each statement:**
  - Account balance (beginning and ending)
  - Contributions / deposits
  - Withdrawals
  - Dividends received
  - Interest received
  - Realized capital gains / losses
  - Individual transactions (buys, sells, dividend reinvestments)
  - Unrealized gains / losses (if present in statement)
  - Fees and expenses
- **Deduplication:** Statement-level dedup via SHA-256 of file contents; transaction-level dedup via date + symbol + amount + type hash

---

## Platform & Deployment
- **Platform:** Desktop app (Electron + React)
- **Runs locally** — no cloud dependencies except S&P 500 price fetching (see below)
- **Storage:** SQLite database stored locally

---

## Technical Design
- **Tech stack:** Electron + React + TypeScript + Tailwind CSS + Zustand + Recharts + better-sqlite3
- **Parser architecture:** Extensible — `ParserInterface` with institution-specific adapters
  - `chase.parser.ts` — credit card CSV
  - `adp.parser.ts` — payroll CSV
  - `schwab.parser.ts` — PDF statement (Phase 3)
  - `fidelity.parser.ts` — PDF statement (Phase 3)
- **Returns/credits handling:**
  - Returns reduce the net total for their category in summaries/charts
  - Returns remain visible as individual line items in the transaction table
  - Clearly marked as credits (visual distinction from debits)

---

## Core Features

### Transaction Management
- Single CSV import (one month at a time)
- Multi-CSV import (combine multiple months for aggregate analysis)
- Track spending by category
- Spot trends over time
- Set and monitor budgets

### Analysis & Insights
- **Behavioral focus:** Designed to change spending habits through awareness, not guilt
- **Positive psychology approach:** Celebrate winning streaks, highlight improving trends, reinforce good habits
- Month-over-month comparisons ("You spent X% more/less on dining vs. last month")
- Recurring charge detection with duration tracking ("This $Y/mo charge has been active for 6 months")
- Pace projections ("On track to exceed/stay under grocery target by $Z")
- Long-term trend analysis — surface gradual shifts that are easy to miss
- Winning behavior streaks (e.g. "3 months of declining dining spend")
- Category-level drill-down
- Top merchants / recurring charges detection
- **No anomaly detection** — user prefers to spot things manually in the table

---

## Budget System

### Budget Types
Two modes, both available and user-created:

**Project Budgets** — One-off or recurring campaigns with a total pool of money
- Examples: Vacation 2025, Home Renovation, New Car Fund
- Have a total target amount (e.g. $10,000)
- Funded by specific income events (bonus, one-time transfer)
- Track total spent vs total budgeted across all months and all cards

**Monthly Category Budgets** — Recurring per-category spending targets
- Examples: Groceries $500/mo, Dining $300/mo, Entertainment $150/mo
- Reset on the 1st of each calendar month
- Track spending in the linked category (or linked tags) during the current month
- Each card's transactions count toward the shared budget

### Funding Models
Each budget has its own funding model — configured at creation time:

| Model | Description | Example |
|-------|-------------|---------|
| `one_time` | Single lump sum, no refill | Home Renovation: $15,000 total |
| `monthly` | Auto-refills on the 1st | Groceries: $500/mo |
| `bi_annual` | Funded twice a year | Vacation: $5,000 each Aug + Feb |
| `custom` | User-defined funding events | Any combination of dates + amounts |

For bi_annual and custom budgets, the user creates "expected funding events" (estimated amount + expected date). When the real income import lands, they can mark the event as fulfilled with the actual amount.

### Budget Creation Flow
When creating a budget, user provides:
1. **Name** — e.g. "Vacation 2025"
2. **Type** — Project or Monthly Category
3. **Funding model** — one_time / monthly / bi_annual / custom
4. **Amount** — Total amount (project) or monthly limit (monthly category)
5. **Linked categories or tags** — What spending counts toward this budget

### Budget Alerts (Visual Only)
- Budget progress bars fill as spending accumulates
- **Yellow** when spending reaches 80% of the budget amount
- **Red** when spending reaches 100% (at or over limit)
- No pop-up notifications — all feedback is visual, visible when user opens the app

### Budget-Tag Linking
- Tags (e.g. "Portugal 2024", "Iceland 2025") can be linked to a project budget (e.g. "Vacation")
- When spending is tagged "Portugal 2024", it counts toward the Vacation budget AND shows in the Portugal trip breakdown
- Tags are free-form and can be created on the fly; the link to a budget is optional but recommended

### Budget Dashboard (Dedicated Sidebar View)
The Budget view contains three sub-views:

1. **Summary Cards** — Grid of all active budgets; each card shows:
   - Budget name + type
   - Progress bar (spent / total), colored yellow at 80%, red at 100%
   - Spent amount, remaining amount, total amount
   - For project budgets: linked trip tags and their individual spend totals

2. **Trend Over Time** — For any selected budget:
   - Line chart: monthly utilization over the past 12 months (e.g., "How much of Groceries budget did I use each month?")
   - Bar chart variant for monthly category budgets

3. **Trip Breakdown** — For project budgets only:
   - Table showing each linked tag (trip) with total spent, date range, and % of total budget
   - Example: Portugal $2,400 (24%) | Iceland $3,100 (31%) | Remaining $4,500 (45%)

---

## Tags

### Free-Form with Autocomplete
- Every transaction has a **Tags** field in the side panel
- User can type any tag name (free-form) or select from previously used tags via autocomplete dropdown
- Tags are created on first use; no pre-defined list
- Multiple tags per transaction supported
- Tag chips visible on transaction rows in the table

### Trip Date Ranges (Optional)
- Tags can optionally have a start date and end date (e.g., Portugal 2024: Aug 15–30, 2024)
- When a trip tag has a date range, the app auto-suggests that tag when editing transactions that fall within those dates
- Date range is not required — some tags are ongoing (e.g., "Work Travel", "Business Expense")

### Tag Management
- View all tags in Settings
- Rename, merge, or delete tags
- Set or edit the date range on a trip tag
- Link or unlink a tag from a budget

---

## Income Tracking

### ADP Import
- Drag & drop ADP CSV export onto the import screen (same UX as Chase CSV)
- Parser auto-detects ADP format via header detection in `parser.registry.ts`
- User assigns import to an "income account" (e.g. "Connor's ADP")
- Deduplication on re-import (same dedup hash pattern as transactions)

### Income Forecasting
- User enters their **annual salary** and **target bonus %** in Settings
- App generates expected income entries for each pay period (bi-weekly or semi-monthly, configurable)
- App generates two expected bonus entries per year (August and February, configurable months)
- When ADP CSV is imported, the app attempts to match each imported pay stub to an expected entry and marks it as fulfilled with the actual amount
- Unmatched imported amounts surface as "unexpected income" for review

### Income Views (within Income & Investments sidebar section)
All views below exist in a dedicated "Income & Investments" sidebar view:

1. **Income Timeline** — Line chart of total monthly income (all sources) over time
2. **Income Breakdown** — Stacked bar or pie chart: Salary | Bonus | Dividends | Interest | Capital Gains
3. **Income vs Expenses** — Side-by-side bar chart comparing total income vs total spending per month
4. **Year-over-Year** — Compare 2024 vs 2025 income side by side by month

---

## Investment Tracking

### PDF Statement Import
- Drag & drop Schwab or Fidelity PDF statements onto the import screen
- App auto-detects institution from PDF content
- Dedicated parser per institution extracts all structured data
- User assigns import to an "investment account" (e.g. "Schwab Brokerage")
- Statement-level dedup prevents re-importing the same statement

### Portfolio Performance
- Track account balance over time (beginning → ending balance per statement period)
- Calculate portfolio % gain per period: `(ending_balance - beginning_balance - contributions + withdrawals) / beginning_balance`
- Show cumulative gain since first statement

### S&P 500 Benchmark Comparison
- App automatically fetches historical S&P 500 closing prices from a public API (e.g. Yahoo Finance or similar free endpoint)
- S&P 500 data cached locally in `market_data` table; refreshed on app open if stale (>1 day old)
- Portfolio % gain plotted alongside S&P 500 % gain for the same period on a single chart
- User can select time range (1Y, 3Y, 5Y, All)
- Comparison is read-only and informational — no trading or advice features

### Investment Views
1. **Account Summary Cards** — One card per investment account: current balance, total gain/loss, gain %, time period
2. **Performance Chart** — Line chart: portfolio % return vs S&P 500 % return over selected period
3. **Transaction History** — Table of all investment transactions (buys, sells, dividends, contributions) per account
4. **Income from Investments** — Dividends + interest feeds into the Income views above

---

## Visualizations
- Bar charts (category breakdown)
- Line charts (spending over time, investment performance)
- Pie/donut charts (proportional spending, income breakdown)
- Stacked bar charts (income vs expenses)
- Sortable/filterable transaction tables
- Budget progress bars with color thresholds
- Rich, story-driven visualizations — dynamic, interactive tools that narrate spending patterns
- Emphasis on long-term trajectory and momentum, not just snapshots

---

## Categories
- Start with Chase's built-in categories
- Allow user-defined custom categories
- Ability to re-map/override transactions to different categories

---

## UI/UX
- Desktop app (Electron)
- Dark mode and light mode with toggle
- **Design language:** Clean and minimal — Linear/Notion inspired. Generous whitespace, subtle borders, restrained color palette, typography-driven hierarchy
- **Landing view:** Transaction table with sorting & filtering as the primary view
- **Summary bar:** Collapsible stats bar above the transaction table (total spend, top category, vs last month, etc.)
- **Navigation:** Sidebar (always visible) with sections:
  - Transactions
  - Budgets *(new)*
  - Income & Investments *(new)*
  - Insights
  - Recurring
  - Goals / FIRE
  - Settings
- **Card selector:** Switch between individual cards or combined view
- Insights/dashboards accessible on demand

---

## Import

### CSV Import (Chase, ADP)
- Drag & drop CSV onto the app
- File picker dialog ("Import" button)
- Assign card or income account identity on import
- Deduplication on re-import
- Granular error reporting: show which rows failed and why

### PDF Import (Schwab, Fidelity)
- Drag & drop PDF onto the import screen
- App auto-detects institution from PDF content
- Shows extraction preview before confirming import
- Deduplication via file hash

---

## Transaction Enrichment
- Tag individual transactions with custom labels (free-form, autocomplete)
- Split a single transaction across multiple categories
- Full-text keyword search across all transactions
- Override Chase's category assignment per transaction
- **Editing UX:** Inline editing for quick fields (category); side panel for enrichment (tags, notes, splits)

---

## Transaction Table
- **Time filtering:** All modes available:
  - By month (tabs or dropdown)
  - Infinite scroll with all transactions
  - Custom date range picker (start/end)
- Sortable columns
- Filterable by category, card, type, keyword, tag
- Credits/returns visually distinct from debits

---

## Keyboard Shortcuts
- Power user keyboard navigation (j/k for row nav, / to search)
- Cmd+I for import, Cmd+F for search
- Shortcut hints visible in UI
- Keyboard shortcut reference overlay (? to open)

---

## Data Backup
- Back up SQLite database to a user-chosen location
- Restore from a backup file
- Manual trigger (no auto-backup needed for now)

---

## Smart Rules & Automation
- **Auto-categorize rules:** User-defined rules (e.g. "if description contains 'Starbucks', set category to Coffee")
- **Merchant name cleanup:** Normalize messy merchant strings
- Rules persist in the database and apply on import
- Ability to view, edit, and delete rules in Settings

---

## Notifications
- No push/desktop notifications
- All alerts and reminders surface in-app only when the user opens it

---

## Positive Reinforcement & Gamification
- Streaks tracking (e.g. "3 months of declining dining spend")
- Progress bars toward user-defined goals
- Monthly "wins" summary
- Tone: celebratory and motivating, not punitive

---

## Financial Goals Integration (FIRE)
- Tie spending insights to early retirement goal ($6M by age 45)
- Show how spending reductions compound toward the target
- Track high-level savings rate or discretionary burn rate
- Scope: awareness tool — connect the dots between spending and long-term goals

---

## Multi-User Access (Heather)
- Heather can have her own view with her card data
- Shareable summary view (read-only, sendable)
- Shared screen mode for joint review sessions

---

## Subscriptions & Recurring Charges
- Dedicated "Recurring" sidebar view
- Auto-detect recurring charges from transaction patterns
- Track duration active, monthly cost, and annual cost
- Cancel reminders — ability to set a "review by" date for subscriptions
- Surface total recurring spend prominently

---

## Time Comparisons
- Side-by-side comparison of any two specific months
- Rolling 3 / 6 / 12 month trend lines
- Year-over-year same-month comparison

---

## What NOT To Build
- No cloud sync, no API server, no user accounts (local-only)
- No push/desktop notifications
- No anomaly detection or AI-powered categorization
- No encryption (user trusts local machine)
- No auto-update mechanism
- No export to CSV/PDF (all analysis stays in-app)
- No separate CSS files — Tailwind only
- No class components — functional only
- No `any` types without a comment

---

## Build Phases

### Phase 1 — MVP Core *(current)*
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
- Keyboard shortcuts

### Phase 2 — Budget System & Tags *(highest priority next)*
- **Tags:** Free-form tags with autocomplete, applied via transaction side panel; tag chips visible in table rows
- **Trip date ranges:** Optional start/end dates on tags; auto-suggest tags for transactions in range
- **Project budgets:** Name + amount + funding model (one_time / bi_annual / custom); multi-card spend tracking
- **Monthly category budgets:** Per-category monthly limits; reset on the 1st; yellow at 80%, red at 100%
- **Budget-tag linking:** Tags linked to parent budget; trip breakdown table inside budget view
- **Budget dashboard:** Summary cards, trend chart, trip breakdown table
- **Sidebar "Budgets" view** added to navigation

### Phase 3 — Income Tracking
- ADP CSV parser (`adp.parser.ts`)
- Income account setup (assign imports to a named account)
- Income forecasting: salary + bonus % → expected entries per pay period + bonus months
- Expected vs actual tracking (match imports to forecasts)
- Income sidebar section: timeline, breakdown, income vs expenses, year-over-year charts

### Phase 4 — Investment Tracking & PDF Import
- PDF parsing infrastructure (pdf-parse or pdfjs-dist)
- Schwab PDF parser (`schwab.parser.ts`)
- Fidelity PDF parser (`fidelity.parser.ts`)
- Investment account setup (assign PDFs to named accounts)
- Account balance history and portfolio % gain calculation
- S&P 500 benchmark: auto-fetch from public API, cache in `market_data` table
- Portfolio vs S&P 500 performance chart
- Investment transaction history table
- Investment income (dividends, interest) feeds into income views

### Phase 5 — Subscriptions *(previously Phase 2)*
- Auto-detect recurring charges
- Dedicated Recurring sidebar view
- Duration, monthly cost, annual cost tracking
- Cancel review reminders (in-app)
- Total recurring spend summary

### Phase 6 — FIRE Integration *(previously Phase 3)*
- Connect spending trends to $6M early retirement goal
- Compounding impact calculator
- Savings rate / discretionary burn rate tracking
- Progress bars and milestone celebrations

### Phase 7 — Multi-User & Sharing *(previously Phase 4)*
- Heather's own view with her card data
- Shareable read-only summary view
- Joint review mode

### Ongoing / Cross-Phase
- Positive reinforcement: streaks, wins, progress bars
- Transaction enrichment: tags, notes, splits
- Month-over-month, rolling trends, YoY comparisons
- Rich story-driven visualizations
- Extensible parser for future bank/institution support
