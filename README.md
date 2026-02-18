# SpendLens

A local-first Electron desktop app for analyzing Chase credit card CSV exports. Track spending, detect trends, and connect daily purchases to long-term financial goals (FIRE). Runs entirely on your machine — no cloud, no accounts, no telemetry.

## Status

**Phase 4 — Multi-User & Sharing** ✅ complete

**Phase 3 — FIRE Integration** ✅ complete

**Phase 2 — Subscriptions** ✅ complete

**Phase 1 — MVP Core** ✅ complete

<details>
<summary>Phase 1 checklist</summary>

- [x] Project scaffold, config, and tooling
- [x] SQLite schema with migrations and FTS5 full-text search
- [x] Chase CSV parser with deduplication
- [x] IPC architecture (Main ↔ Renderer via contextBridge)
- [x] Shared TypeScript types
- [x] Zustand stores, custom hooks, API layer
- [x] Transaction table with search, filter, side panel
- [x] Category override and notes per transaction
- [x] Insights dashboard (category breakdown, 6-month trend)
- [x] Import modal with drag & drop
- [x] Sidebar navigation + keyboard shortcuts
- [x] Dark/light/system theme toggle
- [x] Settings page with card management and backup

</details>

<details>
<summary>Phase 4 checklist</summary>

- [x] `User`, `UserCreate`, `ReportFilter`, `ReportSummary`, `ReportCategory`, `ReportMonth`, `ReportPeriod` shared types
- [x] `user.service.ts` — list users, create user, `seedUsersFromCards` (auto-populates `users` table from card owners), `listCardOwners`
- [x] `report.service.ts` — `generateReport` (totals, monthly breakdown, category top-10, subscription monthly cost, avg savings rate) + `listOwners`
- [x] `user.ipc.ts` + `report.ipc.ts` — IPC handlers for all channels; registered in `ipc/index.ts`
- [x] `window.api.users.*` and `window.api.reports.*` exposed via contextBridge
- [x] `usersApi` + `reportsApi` renderer API layer; `useUsers` + `useReport` hooks
- [x] `ReportsDashboard` — period selector (3/6/12 months, YTD), owner tabs (Household / Connor / Heather), stat cards, category breakdown with progress bars, monthly trend bar chart + table, savings rate banner, household drill-down links, Print/Share button

</details>

<details>
<summary>Phase 3 checklist</summary>

- [x] `Goal`, `GoalCreate`, `GoalUpdate` shared types; `SnapshotIncomeUpdate`, `SnapshotSummary` added to snapshot types
- [x] `goal.service.ts` — CRUD + pure FIRE math: `futureValueCents`, `monthsToTarget`, `requiredMonthlySavingsCents`, `impactOfSpendCutCents`
- [x] `snapshot.service.ts` extended — `updateSnapshotIncome` (income/savings entry, auto savings-rate), `getSnapshotSummary` (12-month rolling averages)
- [x] `goal.ipc.ts` + `snapshot.ipc.ts` — IPC handlers for all channels; registered in `ipc/index.ts`
- [x] `window.api.goals.*` and `window.api.snapshots.*` exposed via contextBridge
- [x] `goalsApi` + `snapshotsApi` renderer API layer; `useGoals` + `useSnapshots` hooks
- [x] `renderer/lib/fire.ts` — client-side math utilities for instant recalculation
- [x] `GoalsView` — FIRE target form, avg-spend and savings-rate stat cards, time-to-FIRE projection, progress bar, impact-of-spend-cut calculator, monthly history table with inline income entry

</details>

<details>
<summary>Phase 2 checklist</summary>

- [x] `Subscription`, `SubscriptionWithCost`, `SubscriptionUpdate` shared types
- [x] `subscription.service.ts` — recurring charge detection algorithm
- [x] Detection groups transactions by normalised description, computes inter-charge intervals, classifies weekly / monthly / quarterly / annual cadence, requires ≥ 60% amount consistency
- [x] `subscription.ipc.ts` — list, detect, update, archive IPC handlers
- [x] `window.api.subscriptions.*` exposed via contextBridge
- [x] `subscriptionsApi` renderer API layer + `useSubscriptions` hook
- [x] `RecurringView` — summary stat cards, subscription list with cadence badges and cost columns, review-date modal, archive action, inactive toggle

</details>

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
```

## Running

```bash
# Start the Vite dev server + Electron together
npm run dev

# Or start them separately:
npm run dev:renderer    # Vite on http://localhost:5173
npm run dev:electron    # Electron (run after renderer is up)
```

## Tests

```bash
npm test               # Run all tests (watch mode)
npx vitest run         # Single run
npx vitest run --reporter=verbose   # Verbose output
```

Current coverage (123 tests across 7 files):

| File | Tests |
|------|-------|
| `tests/parsers/chase.parser.test.ts` | 8 — format detection, amount parsing, returns, dates, payments, same-day duplicates |
| `tests/lib/format.test.ts` | 10 — formatCents, formatDate, formatMonth, monthStartEnd, currentMonth |
| `tests/services/subscription.service.test.ts` | 26 — all four cadences, amount consistency threshold, payment exclusion, store-ID normalisation, transaction linking, upsert idempotency, CRUD, archive |
| `tests/services/goal.service.test.ts` | 23 — CRUD, futureValueCents, monthsToTarget, requiredMonthlySavingsCents, impactOfSpendCutCents |
| `tests/services/snapshot.service.test.ts` | 18 — income update, savings-rate computation, null income, card isolation, summary averages, camelCase mapping |
| `tests/services/user.service.test.ts` | 13 — createUser, listUsers (order), seedUsersFromCards (idempotency, primary selection, blank-owner skip), listCardOwners |
| `tests/services/report.service.test.ts` | 25 — totals, owner filter, monthly breakdown, category grouping + percentages, subscription cost (monthly/annual/quarterly), savings rate, listOwners |

## Build

```bash
npm run build          # Compile TS (main) + Vite (renderer) + electron-builder
```

## Project Structure

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── database/            # SQLite connection, migrations, backup
│   ├── parsers/             # CSV parsers (Chase + registry for future banks)
│   ├── services/            # Business logic — transaction, card, category, rule, import, search, snapshot, settings, subscription, goal, user, report
│   ├── ipc/                 # IPC handlers (one file per domain)
│   ├── index.ts             # Main entry point
│   └── preload.ts           # contextBridge: window.api.*
│
├── renderer/                # React app (browser context)
│   ├── api/                 # Typed wrappers over window.api.*
│   ├── stores/              # Zustand stores (app, filter, ui)
│   ├── hooks/               # Data-fetching hooks (useTransactions, useSearch, etc.)
│   ├── lib/                 # format.ts (cents→$), analytics.ts, fire.ts (FIRE math), constants.ts
│   ├── components/
│   │   ├── layout/          # Sidebar, Toolbar
│   │   ├── transactions/    # TransactionsView, TransactionTable, TransactionRow, TransactionDetail, SummaryBar
│   │   ├── insights/        # InsightsDashboard, CategoryBreakdown, SpendingTrend
│   │   ├── recurring/       # RecurringView (Phase 2)
│   │   ├── goals/           # GoalsView (Phase 3)
│   │   ├── reports/         # ReportsDashboard (Phase 4)
│   │   ├── import/          # ImportModal, DropZone, ImportSummary
│   │   ├── settings/        # SettingsPage
│   │   └── shared/          # AmountDisplay, CategoryBadge, KbdHint, StatCard, Modal, EmptyState, ShortcutsOverlay
│   ├── styles/globals.css   # CSS variables (design tokens), base styles, animations
│   ├── App.tsx              # Root component + view routing
│   └── main.tsx             # React entry point
│
└── shared/                  # Imported by both main and renderer
    ├── ipc-channels.ts      # All IPC channel name constants
    └── types/               # TypeScript interfaces (Transaction, Card, Category, Rule, Import, Settings, ...)

sql/
├── migrations/001_initial.sql   # Full schema (all phases)
└── seed.sql                     # Chase categories + default settings

tests/
├── fixtures/chase-sample.csv          # Test CSV with normal, return, payment, and duplicate rows
├── parsers/chase.parser.test.ts
├── lib/format.test.ts
├── services/subscription.service.test.ts  # 26 tests covering detection, CRUD, archive (in-memory SQLite)
├── services/goal.service.test.ts          # 23 tests — CRUD + FIRE math accuracy (in-memory SQLite)
├── services/snapshot.service.test.ts      # 18 tests — income update, savings rate, summary (in-memory SQLite)
├── services/user.service.test.ts          # 13 tests — createUser, listUsers, seedUsersFromCards, listCardOwners
└── services/report.service.test.ts        # 25 tests — totals, owner filter, monthly breakdown, categories, subs, savings rate
```

## Architecture

```
Renderer (React)
  └─ Component
       └─ Hook (useTransactions)
            └─ API layer (transactionsApi.list)
                 └─ window.api.transactions.list()   ← contextBridge
                      └─ IPC channel
                           └─ Main process handler
                                └─ Service (transaction.service.ts)
                                     └─ SQLite (better-sqlite3)
```

**Rules:**
- Renderer never imports from `src/main/`
- Main never imports from `src/renderer/`
- Both can import from `src/shared/`
- All IPC channel names are constants in `src/shared/ipc-channels.ts`
- All money is stored and computed as **integer cents** (`$42.99` → `4299`)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` – `5` | Switch sidebar views |
| `/` | Focus search |
| `Escape` | Close side panel |
| `⌘ I` | Open import dialog |
| `⌘ F` | Focus search |
| `?` | Keyboard shortcuts overlay |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 29 |
| Build | Vite 5 |
| Frontend | React 18 + TypeScript 5 (strict) |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 |
| Charts | Recharts 2 |
| Database | better-sqlite3 9 (synchronous, WAL mode) |
| CSV Parsing | PapaParse 5 |
| Testing | Vitest 1 + @testing-library/react |

## Design Reference

- `ui-design-spec.md` — design tokens, colors, typography
- `wireframe.jsx` — interactive React prototype (visual source of truth)
- `requirements.md` — full feature requirements and phase plan
- `database-schema.sql` — complete SQLite schema
- `project-structure-spec.md` — directory layout and data flow

## Adding a Second Bank

1. Create `src/main/parsers/yourbank.parser.ts` implementing `ParserInterface`
2. Register it in `src/main/parsers/parser.registry.ts`
3. Add a test fixture to `tests/fixtures/`

No other code needs to change.
