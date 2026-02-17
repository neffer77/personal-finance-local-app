# SpendLens

A local-first Electron desktop app for analyzing Chase credit card CSV exports. Track spending, detect trends, and connect daily purchases to long-term financial goals (FIRE). Runs entirely on your machine — no cloud, no accounts, no telemetry.

## Status

**Phase 1 — MVP Core** (in progress)

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
- [ ] `npm run dev` (Electron launch) — ready to wire up

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

Current coverage:

| File | Tests |
|------|-------|
| `tests/parsers/chase.parser.test.ts` | 8 — format detection, amount parsing, returns, dates, payments, same-day duplicates |
| `tests/lib/format.test.ts` | 10 — formatCents, formatDate, formatMonth, monthStartEnd, currentMonth |

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
│   ├── services/            # Business logic — transaction, card, category, rule, import, search, snapshot, settings
│   ├── ipc/                 # IPC handlers (one file per domain)
│   ├── index.ts             # Main entry point
│   └── preload.ts           # contextBridge: window.api.*
│
├── renderer/                # React app (browser context)
│   ├── api/                 # Typed wrappers over window.api.*
│   ├── stores/              # Zustand stores (app, filter, ui)
│   ├── hooks/               # Data-fetching hooks (useTransactions, useSearch, etc.)
│   ├── lib/                 # format.ts (cents→$), analytics.ts, constants.ts
│   ├── components/
│   │   ├── layout/          # Sidebar, Toolbar
│   │   ├── transactions/    # TransactionsView, TransactionTable, TransactionRow, TransactionDetail, SummaryBar
│   │   ├── insights/        # InsightsDashboard, CategoryBreakdown, SpendingTrend
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
├── fixtures/chase-sample.csv   # Test CSV with normal, return, payment, and duplicate rows
├── parsers/chase.parser.test.ts
└── lib/format.test.ts
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
