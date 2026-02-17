# SpendLens — Project Structure Specification

## Overview
Electron desktop app with a React frontend and SQLite backend. The architecture enforces strict separation between Electron's main process (database, file system, OS integration) and the renderer process (React UI). All communication crosses the IPC bridge via well-defined channels.

```
spendlens/
├── package.json
├── electron-builder.yml          # Electron packaging config
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts                # Vite for React bundling
├── tsconfig.json
├── tsconfig.node.json            # Separate TS config for main process
├── .eslintrc.cjs
├── .prettierrc
├── CLAUDE.md                     # Claude Code project instructions
├── README.md
│
├── resources/                    # App icons, bundled assets
│   ├── icon.icns
│   ├── icon.ico
│   └── icon.png
│
├── sql/
│   ├── schema.sql                # Full database schema (CREATE TABLE statements)
│   ├── seed.sql                  # Default categories, settings
│   └── migrations/               # Incremental schema changes
│       ├── 001_initial.sql
│       └── 002_add_subscriptions.sql
│
├── src/
│   ├── main/                     # ── ELECTRON MAIN PROCESS ──
│   │   ├── index.ts              # App entry point, window creation, lifecycle
│   │   ├── preload.ts            # Context bridge exposing IPC API to renderer
│   │   │
│   │   ├── database/
│   │   │   ├── connection.ts     # SQLite connection manager (better-sqlite3)
│   │   │   ├── migrate.ts        # Schema migration runner
│   │   │   └── backup.ts         # Database backup & restore logic
│   │   │
│   │   ├── services/             # Business logic (main process)
│   │   │   ├── import.service.ts       # CSV file reading, parsing orchestration
│   │   │   ├── transaction.service.ts  # CRUD operations on transactions table
│   │   │   ├── card.service.ts         # Card management
│   │   │   ├── category.service.ts     # Category CRUD + custom categories
│   │   │   ├── tag.service.ts          # Tag management
│   │   │   ├── rule.service.ts         # Smart rules CRUD + execution engine
│   │   │   ├── subscription.service.ts # Recurring charge detection & management [Phase 2]
│   │   │   ├── snapshot.service.ts     # Monthly snapshot computation
│   │   │   ├── goal.service.ts         # FIRE goals CRUD + projections [Phase 3]
│   │   │   ├── search.service.ts       # FTS5 search across transactions
│   │   │   └── settings.service.ts     # Key-value settings store
│   │   │
│   │   ├── parsers/              # Bank CSV parser adapters
│   │   │   ├── parser.interface.ts     # Abstract parser contract
│   │   │   ├── chase.parser.ts         # Chase CSV → normalized transaction
│   │   │   ├── amex.parser.ts          # [Future] Amex adapter
│   │   │   ├── bofa.parser.ts          # [Future] BofA adapter
│   │   │   └── parser.registry.ts      # Maps issuer → parser instance
│   │   │
│   │   └── ipc/                  # IPC handler registration
│   │       ├── index.ts          # Register all IPC handlers
│   │       ├── transaction.ipc.ts      # Transaction-related IPC handlers
│   │       ├── import.ipc.ts           # Import-related IPC handlers
│   │       ├── card.ipc.ts             # Card-related IPC handlers
│   │       ├── category.ipc.ts         # Category-related IPC handlers
│   │       ├── tag.ipc.ts              # Tag-related IPC handlers
│   │       ├── rule.ipc.ts             # Rule-related IPC handlers
│   │       ├── subscription.ipc.ts     # Subscription IPC [Phase 2]
│   │       ├── goal.ipc.ts             # Goal IPC [Phase 3]
│   │       ├── search.ipc.ts           # Search IPC
│   │       ├── settings.ipc.ts         # Settings IPC
│   │       └── backup.ipc.ts           # Backup/restore IPC
│   │
│   ├── renderer/                 # ── REACT RENDERER PROCESS ──
│   │   ├── index.html            # HTML shell
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Root component, layout shell, routing
│   │   │
│   │   ├── api/                  # IPC client layer (renderer → main)
│   │   │   ├── index.ts          # Re-exports all API modules
│   │   │   ├── transactions.ts   # window.api.transactions.*
│   │   │   ├── imports.ts        # window.api.imports.*
│   │   │   ├── cards.ts          # window.api.cards.*
│   │   │   ├── categories.ts     # window.api.categories.*
│   │   │   ├── tags.ts           # window.api.tags.*
│   │   │   ├── rules.ts          # window.api.rules.*
│   │   │   ├── subscriptions.ts  # window.api.subscriptions.* [Phase 2]
│   │   │   ├── goals.ts          # window.api.goals.* [Phase 3]
│   │   │   ├── search.ts         # window.api.search.*
│   │   │   ├── settings.ts       # window.api.settings.*
│   │   │   └── backup.ts         # window.api.backup.*
│   │   │
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useTransactions.ts      # Fetch, filter, paginate transactions
│   │   │   ├── useCategories.ts        # Category list + overrides
│   │   │   ├── useCards.ts             # Card list + active selection
│   │   │   ├── useTags.ts             # Tag management
│   │   │   ├── useSearch.ts            # Debounced FTS search
│   │   │   ├── useKeyboardShortcuts.ts # Global keyboard shortcut registry
│   │   │   ├── useTheme.ts             # Dark/light theme state
│   │   │   ├── useSubscriptions.ts     # [Phase 2]
│   │   │   ├── useGoals.ts             # [Phase 3]
│   │   │   └── useSettings.ts          # App settings read/write
│   │   │
│   │   ├── stores/               # Client-side state (Zustand or Context)
│   │   │   ├── app.store.ts      # Global app state (active view, selected card, theme)
│   │   │   ├── filter.store.ts   # Transaction filter state (date range, category, search)
│   │   │   └── ui.store.ts       # UI state (summary bar expanded, side panel open, etc.)
│   │   │
│   │   ├── components/           # Reusable UI components
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx           # Main navigation sidebar
│   │   │   │   ├── SidebarItem.tsx       # Individual nav item
│   │   │   │   ├── SidePanel.tsx         # Right-side transaction detail panel
│   │   │   │   ├── Toolbar.tsx           # Search, filters, import button bar
│   │   │   │   └── PageHeader.tsx        # View title + subtitle
│   │   │   │
│   │   │   ├── transactions/
│   │   │   │   ├── TransactionTable.tsx  # Main sortable/filterable table
│   │   │   │   ├── TransactionRow.tsx    # Individual table row
│   │   │   │   ├── TransactionDetail.tsx # Side panel content for a transaction
│   │   │   │   ├── SplitEditor.tsx       # Split transaction across categories
│   │   │   │   └── SummaryBar.tsx        # Collapsible stat cards above table
│   │   │   │
│   │   │   ├── insights/
│   │   │   │   ├── InsightsDashboard.tsx # Main insights grid layout
│   │   │   │   ├── CategoryBreakdown.tsx # Bar chart + progress bars by category
│   │   │   │   ├── SpendingTrend.tsx     # Line/bar chart over time
│   │   │   │   ├── MonthComparison.tsx   # Side-by-side month comparison
│   │   │   │   ├── WinsBanner.tsx        # Positive reinforcement callouts
│   │   │   │   └── FireImpact.tsx        # FIRE compounding impact card
│   │   │   │
│   │   │   ├── recurring/
│   │   │   │   ├── RecurringDashboard.tsx # Subscription list + totals
│   │   │   │   ├── SubscriptionRow.tsx    # Individual subscription item
│   │   │   │   └── ReviewReminder.tsx     # Cancel review badge/alert
│   │   │   │
│   │   │   ├── goals/
│   │   │   │   ├── GoalsDashboard.tsx    # FIRE progress + impact calculator
│   │   │   │   ├── FireProgress.tsx      # Target progress bar + stats
│   │   │   │   ├── ImpactCalculator.tsx  # Spending reduction → FIRE impact
│   │   │   │   └── SavingsRateTrend.tsx  # Monthly savings rate chart
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   └── ReportsDashboard.tsx  # Shareable summary [Phase 4]
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── SettingsPage.tsx      # Settings layout
│   │   │   │   ├── ThemeToggle.tsx       # Dark/light mode switch
│   │   │   │   ├── CardManager.tsx       # Add/edit/archive cards
│   │   │   │   ├── RuleManager.tsx       # View/add/edit/delete smart rules
│   │   │   │   ├── CategoryManager.tsx   # Custom category management
│   │   │   │   └── BackupRestore.tsx     # Backup/restore buttons + status
│   │   │   │
│   │   │   ├── import/
│   │   │   │   ├── ImportModal.tsx       # Import dialog (file picker + card assignment)
│   │   │   │   ├── DropZone.tsx          # Drag-and-drop CSV area
│   │   │   │   └── ImportSummary.tsx     # Post-import results (imported/skipped counts)
│   │   │   │
│   │   │   └── shared/               # Shared primitive components
│   │   │       ├── CategoryBadge.tsx     # Colored category pill
│   │   │       ├── TagChip.tsx           # Small tag label
│   │   │       ├── StatCard.tsx          # Metric card (label, value, sub-stat)
│   │   │       ├── MiniBar.tsx           # Thin progress bar
│   │   │       ├── KbdHint.tsx           # Keyboard shortcut hint
│   │   │       ├── AmountDisplay.tsx     # Formatted currency with color logic
│   │   │       ├── DateRangePicker.tsx   # Custom date range selector
│   │   │       ├── EmptyState.tsx        # Empty/placeholder state for views
│   │   │       ├── Modal.tsx             # Generic modal shell
│   │   │       └── Tooltip.tsx           # Hover tooltip
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css       # Tailwind directives, base styles, scrollbar, animations
│   │   │   └── tokens.ts         # Design token constants (mirrors tailwind.config)
│   │   │
│   │   └── lib/                  # Pure utility functions (no side effects)
│   │       ├── format.ts         # cents → display currency, date formatting
│   │       ├── filters.ts        # Transaction filter/sort logic
│   │       ├── analytics.ts      # Compute category totals, trends, comparisons
│   │       ├── fire.ts           # FIRE projection math (compound interest, etc.)
│   │       ├── streaks.ts        # Winning streak detection algorithms
│   │       └── constants.ts      # Category colors, keyboard shortcut map, defaults
│   │
│   └── shared/                   # ── SHARED BETWEEN MAIN & RENDERER ──
│       ├── types/
│       │   ├── transaction.ts    # Transaction, TransactionCreate, TransactionFilter
│       │   ├── card.ts           # Card, CardCreate
│       │   ├── category.ts       # Category, CategoryCreate
│       │   ├── tag.ts            # Tag
│       │   ├── rule.ts           # Rule, RuleCreate, RuleType, MatchMode
│       │   ├── subscription.ts   # Subscription [Phase 2]
│       │   ├── goal.ts           # Goal, GoalType [Phase 3]
│       │   ├── snapshot.ts       # MonthlySnapshot
│       │   ├── import.ts         # ImportResult, ImportSummary
│       │   ├── settings.ts       # Settings keys and value types
│       │   └── index.ts          # Re-exports all types
│       │
│       └── ipc-channels.ts       # IPC channel name constants (single source of truth)
│
├── tests/
│   ├── main/
│   │   ├── parsers/
│   │   │   └── chase.parser.test.ts    # Parser unit tests against sample CSV
│   │   ├── services/
│   │   │   ├── import.service.test.ts  # Import + dedup logic
│   │   │   ├── rule.service.test.ts    # Rule matching engine
│   │   │   └── transaction.service.test.ts
│   │   └── database/
│   │       └── migrate.test.ts         # Schema migration tests
│   │
│   ├── renderer/
│   │   ├── components/
│   │   │   └── TransactionTable.test.tsx
│   │   └── lib/
│   │       ├── format.test.ts
│   │       ├── analytics.test.ts
│   │       └── fire.test.ts
│   │
│   └── fixtures/
│       ├── sample-chase-statement.csv  # Test CSV data
│       ├── sample-chase-dupes.csv      # CSV with intentional duplicates
│       ├── sample-chase-edge-cases.csv # Empty rows, malformed data, etc.
│       └── sample-amex-statement.csv   # [Future] For parser extensibility tests
│
└── docs/
    ├── requirements.md
    ├── database-schema.sql
    ├── schema-design-decisions.md
    ├── ui-design-spec.md
    └── wireframe.jsx             # Interactive UI reference
```

---

## Architecture Rules

### Process Boundary
The Electron main process and React renderer process are strictly separated. They communicate **only** through IPC channels defined in `shared/ipc-channels.ts`.

```
┌─────────────────────────────────────────────────┐
│  Renderer (React)                               │
│                                                 │
│  Components → Hooks → API Layer                 │
│                          │                      │
│                    window.api.*                  │
│                          │                      │
├────────── preload.ts (context bridge) ──────────┤
│                          │                      │
│  Main (Electron)         │                      │
│                    IPC Handlers                  │
│                          │                      │
│                    Services                      │
│                          │                      │
│                    Database (SQLite)             │
└─────────────────────────────────────────────────┘
```

**Rules:**
- Renderer **never** imports from `src/main/`
- Main **never** imports from `src/renderer/`
- Both can import from `src/shared/`
- All database access happens through services in main process
- Renderer calls main via `window.api.*` (typed, async)

### Data Flow: Import Example
```
1. User drops CSV on DropZone
2. DropZone calls window.api.imports.importCSV(filePath, cardId)
3. preload.ts forwards via ipcRenderer.invoke('import:csv', filePath, cardId)
4. import.ipc.ts receives, calls import.service.ts
5. import.service.ts:
   a. Reads file from disk (fs)
   b. Resolves parser via parser.registry.ts (based on card's issuer)
   c. chase.parser.ts normalizes rows → Transaction[]
   d. rule.service.ts applies matching rules (categorize + cleanup)
   e. transaction.service.ts inserts with dedup hash check
   f. snapshot.service.ts recomputes affected monthly snapshots
6. Returns ImportSummary { imported: 42, skipped: 3, total: 45 }
7. React hook refreshes transaction list
```

### Data Flow: Transaction Query Example
```
1. TransactionTable mounts
2. useTransactions hook calls window.api.transactions.list(filters)
3. transaction.service.ts builds SQL query from filters
4. Returns Transaction[] with resolved categories (using v_transactions_enriched view)
5. Hook returns data to component for rendering
```

---

## Module Boundaries

### Parsers (`src/main/parsers/`)
Each parser implements `ParserInterface`:
```typescript
interface ParserInterface {
  issuer: string;                           // e.g. "chase"
  parse(csvContent: string): ParsedRow[];   // raw CSV → normalized rows
  detectFormat(headers: string[]): boolean; // can this parser handle this CSV?
}

interface ParsedRow {
  transactionDate: string;   // YYYY-MM-DD
  postedDate: string;        // YYYY-MM-DD
  description: string;       // raw description
  originalCategory: string;  // bank's category (may be empty)
  type: string;              // "Sale", "Payment", "Return", etc.
  amountCents: number;       // integer cents (negative = charge)
  memo: string;              // may be empty
  isReturn: boolean;         // derived from type or amount sign
}
```
The registry auto-detects which parser to use based on CSV headers if the user doesn't specify.

### Services (`src/main/services/`)
Each service owns one domain. Services can call other services (e.g. `import.service` calls `rule.service` and `transaction.service`). Services return plain objects matching shared types — never raw SQL rows.

### API Layer (`src/renderer/api/`)
Thin wrappers around `window.api.*` calls. Each module mirrors a service. These exist to:
- Provide TypeScript types for all IPC calls
- Abstract the IPC mechanism (could swap to HTTP later)
- Keep components clean — they call `api.transactions.list()`, not `ipcRenderer.invoke()`

### Hooks (`src/renderer/hooks/`)
Each hook manages fetching, caching, and state for one domain. Hooks call the API layer and return `{ data, loading, error, refetch }` patterns. Components never call the API layer directly — always through hooks.

### Stores (`src/renderer/stores/`)
Global client-side state using Zustand (lightweight, no boilerplate). Three stores:
- `app.store` — which view is active, which card is selected, theme
- `filter.store` — current date range, category filter, search query
- `ui.store` — summary bar expanded, side panel open/closed, selected transaction ID

### Components (`src/renderer/components/`)
Organized by feature/view. Each view folder contains the dashboard/page component and its child components. The `shared/` folder contains primitives used across views.

**Naming:** PascalCase files matching component name. One component per file (except tiny helpers).

### Lib (`src/renderer/lib/`)
Pure functions with zero side effects. No React, no IPC, no DOM. These are testable computation modules:
- `format.ts` — cents to dollars, date display
- `analytics.ts` — category aggregation, trend computation
- `fire.ts` — compound interest, FIRE projections
- `streaks.ts` — consecutive period detection for winning streaks

---

## Key Dependencies

| Package | Purpose | Process |
|---------|---------|---------|
| electron | Desktop shell | Main |
| electron-builder | Packaging & distribution | Build |
| better-sqlite3 | SQLite driver (synchronous, fast) | Main |
| vite | Build tool for React | Build |
| react + react-dom | UI framework | Renderer |
| tailwindcss | Styling | Renderer |
| zustand | State management | Renderer |
| recharts | Charting library | Renderer |
| papaparse | CSV parsing | Main |
| crypto (Node built-in) | SHA-256 for dedup hashes | Main |
| vitest | Test runner | Test |
| @testing-library/react | Component testing | Test |

---

## Phase Build Mapping

### Phase 1 — MVP Core
Build these modules first:
```
src/main/database/*
src/main/parsers/parser.interface.ts, chase.parser.ts, parser.registry.ts
src/main/services/import, transaction, card, category, settings, search, snapshot
src/main/ipc/* (matching services above)
src/renderer/api/*
src/renderer/hooks/useTransactions, useCategories, useCards, useSearch, useTheme, useKeyboardShortcuts, useSettings
src/renderer/stores/*
src/renderer/components/layout/*
src/renderer/components/transactions/*
src/renderer/components/insights/InsightsDashboard, CategoryBreakdown, SpendingTrend
src/renderer/components/import/*
src/renderer/components/settings/SettingsPage, ThemeToggle, CardManager
src/renderer/components/shared/*
src/shared/*
sql/schema.sql, seed.sql, migrations/001_initial.sql
```

### Phase 2 — Subscriptions
Add:
```
src/main/services/subscription.service.ts
src/main/ipc/subscription.ipc.ts
src/renderer/api/subscriptions.ts
src/renderer/hooks/useSubscriptions.ts
src/renderer/components/recurring/*
sql/migrations/002_add_subscriptions.sql
```

### Phase 3 — FIRE Integration
Add:
```
src/main/services/goal.service.ts
src/main/ipc/goal.ipc.ts
src/renderer/api/goals.ts
src/renderer/hooks/useGoals.ts
src/renderer/components/goals/*
src/renderer/components/insights/FireImpact.tsx, WinsBanner.tsx
src/renderer/lib/fire.ts, streaks.ts
sql/migrations/003_add_goals.sql
```

### Phase 4 — Multi-User & Sharing
Add:
```
src/renderer/components/reports/*
User model + user_id FK migration
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase.tsx | `TransactionTable.tsx` |
| Hooks | camelCase with `use` prefix | `useTransactions.ts` |
| Services | kebab-dot notation | `transaction.service.ts` |
| IPC handlers | kebab-dot notation | `transaction.ipc.ts` |
| Types | kebab-case | `transaction.ts` |
| Utilities | camelCase | `format.ts` |
| Tests | mirror source + `.test` | `chase.parser.test.ts` |
| SQL migrations | numbered prefix | `001_initial.sql` |
