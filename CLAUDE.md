# CLAUDE.md — SpendLens Project Instructions

## What Is This Project?
SpendLens is a local-first Electron desktop app that analyzes Chase credit card CSV exports to help track spending, detect trends, and connect daily purchases to long-term financial goals (FIRE). It runs entirely on the user's machine with zero cloud dependencies.

## Reference Documents
Before making any architectural or design decisions, consult these docs in `docs/`:
- `requirements.md` — Full feature requirements and phased build plan
- `database-schema.sql` — Complete SQLite schema with all tables, views, triggers
- `schema-design-decisions.md` — Explains *why* the schema is designed the way it is
- `project-structure-spec.md` — Directory layout, module boundaries, data flow
- `ui-design-spec.md` — Design tokens, colors, typography, component patterns
- `wireframe.jsx` — Interactive React prototype (visual reference for all views)

When in doubt, the requirements doc is the source of truth.

## Current Phase
**Phase 1 — MVP Core.** Only build Phase 1 features unless explicitly asked otherwise. Phase 2/3/4 files are listed in the project structure but should NOT be created yet. The schema includes all tables for all phases — that's intentional and correct.

Phase 1 scope:
- CSV import (drag & drop + file picker) with Chase parser
- SQLite storage with deduplication
- Transaction table (sort, filter, full-text search)
- Multi-card support with card selector
- Category breakdown charts (bar, pie/donut)
- Spending over time line chart
- Category override per transaction
- Dark/light mode toggle
- Sidebar navigation
- Keyboard shortcuts

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Shell | Electron |
| Build | Vite |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Charts | Recharts |
| Database | better-sqlite3 (synchronous) |
| CSV Parsing | PapaParse |
| Testing | Vitest + @testing-library/react |

## Architecture Rules — READ CAREFULLY

### Process Separation (CRITICAL)
The Electron main process and React renderer are **strictly isolated**. This is non-negotiable.

```
Renderer (React)  →  window.api.*  →  preload.ts (contextBridge)  →  IPC  →  Main (services)  →  SQLite
```

- **Renderer NEVER imports from `src/main/`**
- **Main NEVER imports from `src/renderer/`**
- Both CAN import from `src/shared/`
- All IPC channel names live in `src/shared/ipc-channels.ts` — single source of truth
- All database access goes through services in the main process
- The renderer calls main exclusively via `window.api.*` which is typed and async

### Component → Hook → API → IPC → Service → Database
This is the call chain. Never skip layers:
- Components call hooks (`useTransactions`)
- Hooks call API layer (`api.transactions.list(filters)`)
- API layer calls `window.api.transactions.list(filters)` (IPC invoke)
- IPC handler in main process calls the service
- Service executes SQL and returns typed objects

### No Raw SQL in Services
Use parameterized queries exclusively. Never interpolate user input into SQL strings.

```typescript
// CORRECT
db.prepare('SELECT * FROM transactions WHERE card_id = ?').all(cardId);

// WRONG — never do this
db.exec(`SELECT * FROM transactions WHERE card_id = ${cardId}`);
```

## Coding Conventions

### TypeScript
- Strict mode enabled. No `any` types unless absolutely unavoidable (and add a comment explaining why).
- All function parameters and return types explicitly typed.
- Use `interface` for object shapes, `type` for unions/intersections.
- Shared types live in `src/shared/types/` and are the contract between main and renderer.

### React Components
- Functional components only. No class components.
- One component per file. File name matches component name (PascalCase).
- Props interface defined above the component in the same file, named `{ComponentName}Props`.
- Use Zustand stores for global state; React state (`useState`) for local UI state only.
- Never use `useEffect` for data fetching — use the custom hooks which handle loading/error states.

### Styling
- **Tailwind CSS only.** No inline styles, no CSS modules, no styled-components.
- Use the design tokens from `ui-design-spec.md` — they're mapped in `tailwind.config.js`.
- Dark mode via Tailwind's `dark:` variant. Theme toggle sets a class on `<html>`.
- Category colors are constants in `src/renderer/lib/constants.ts`, referenced by Tailwind arbitrary values when needed (`bg-[#16A34A]`).

### File Naming
| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase.tsx | `TransactionTable.tsx` |
| Hooks | camelCase, `use` prefix | `useTransactions.ts` |
| Services | dot notation | `transaction.service.ts` |
| IPC handlers | dot notation | `transaction.ipc.ts` |
| Types | kebab-case | `transaction.ts` |
| Utils/lib | camelCase | `format.ts` |
| Tests | source + `.test` | `chase.parser.test.ts` |

### Imports
- Use path aliases: `@main/`, `@renderer/`, `@shared/` (configured in tsconfig).
- Group imports: (1) external packages, (2) shared types, (3) local modules. Blank line between groups.
- No circular imports. If two modules need each other, extract the shared dependency.

## Money Handling
**All monetary values are stored and computed as integers in cents.** `$42.99` = `4299`. This avoids floating point issues.

- Database columns: `amount_cents INTEGER`
- TypeScript: `amountCents: number`
- Display conversion happens exclusively in `src/renderer/lib/format.ts`
- Never do math on formatted dollar strings

## Deduplication
Each transaction gets a dedup hash: `SHA-256(card_id + transaction_date + description + amount + type)`.

**Edge case:** Two identical transactions on the same day (e.g. two $5.43 Starbucks charges) will collide. When the parser detects duplicate raw rows within the same CSV, it appends a sequence counter to the hash input:
```
SHA-256(card_id + transaction_date + description + amount + type + ":1")
SHA-256(card_id + transaction_date + description + amount + type + ":2")
```

## Category Resolution
A transaction's display category is resolved in priority order:
1. **Transaction splits** — if splits exist, they define allocation (ignore single category)
2. **User override** — `transactions.category_id` (set via UI)
3. **Auto-categorize rule** — applied during import by `rule.service.ts`
4. **Chase original** — `transactions.original_category` (fallback)

The database view `v_transactions_enriched` handles priorities 2-4. Split logic is in app code.

## Parser Architecture
Parsers implement the `ParserInterface` from `src/main/parsers/parser.interface.ts`:
```typescript
interface ParserInterface {
  issuer: string;
  parse(csvContent: string): ParsedRow[];
  detectFormat(headers: string[]): boolean;
}
```
The `parser.registry.ts` maps issuer names to parser instances. For Phase 1, only `chase.parser.ts` is needed. When adding a new bank, create a new parser file and register it — no other code should need to change.

## Smart Rules Engine
Rules are evaluated during import in priority order (lower number = higher priority). Two types:
- `categorize` — sets `category_id` on matching transactions
- `merchant_cleanup` — sets `display_name` on matching transactions

A single transaction can be affected by one rule of each type. Rules do NOT retroactively apply to existing transactions unless the user explicitly triggers "re-apply rules."

Match modes: `contains`, `starts_with`, `exact`, `regex`.

## Keyboard Shortcuts
Shortcuts are registered in `useKeyboardShortcuts.ts` using a declarative map. They must be suppressed when an input/textarea/select has focus.

| Key | Action |
|-----|--------|
| `1-5` | Switch sidebar views |
| `/` | Focus search |
| `Escape` | Close side panel / deselect |
| `j` / `k` | Navigate table rows down / up |
| `Enter` | Open side panel for selected row |
| `⌘+I` | Open import dialog |
| `⌘+F` | Focus search (alias for `/`) |
| `?` | Toggle shortcut reference overlay |

## Testing Strategy
- **Parsers:** Unit test against sample CSV fixtures in `tests/fixtures/`. Cover normal data, returns, payments, empty fields, duplicates, malformed rows.
- **Services:** Unit test business logic. Mock the database connection.
- **Lib utilities:** Pure function tests for formatting, analytics, FIRE math, streak detection.
- **Components:** Render tests for key interactions (table sorting, filter application, side panel open/close). Use @testing-library/react.
- **Integration:** Test the full import flow: CSV → parser → rules → dedup → database → query → verify.

Run tests with: `npx vitest`

## Error Handling
- Services throw typed errors. IPC handlers catch and return `{ success: false, error: string }`.
- API layer in renderer checks for errors and surfaces them to hooks.
- Hooks expose `error` state. Components display inline error messages (no alert dialogs).
- Import errors should be granular: show which rows failed and why, not just "import failed."
- Database errors during startup (corrupt DB, migration failure) should show a recovery screen with the option to restore from backup.

## Performance Guidelines
- **Transaction table:** Paginate queries. Fetch 100 rows at a time with infinite scroll. Don't load all transactions into memory.
- **Monthly snapshots:** Use the `monthly_snapshots` table for trend/insight queries instead of scanning all transactions.
- **FTS search:** Use the `transactions_fts` virtual table for keyword search. Never `LIKE '%term%'` on the transactions table.
- **better-sqlite3 is synchronous** — that's fine and intentional (it's faster than async alternatives for SQLite). But wrap long operations in IPC so the renderer doesn't block.

## Design Reference
The UI follows a Linear/Notion-inspired aesthetic. Key principles:
- Generous whitespace, subtle 1px borders, restrained color palette
- Typography drives hierarchy — not color or decoration
- Font: Geist (with Inter and system-ui fallbacks)
- All design tokens, colors, and spacing are documented in `ui-design-spec.md`
- The interactive wireframe (`wireframe.jsx`) is the visual source of truth — match it

## What NOT To Build
- No cloud sync, no API server, no user accounts (local-only)
- No push/desktop notifications
- No anomaly detection or AI-powered categorization
- No encryption (user trusts local machine)
- No auto-update mechanism (keep it simple for now)
- No Phase 2/3/4 features until explicitly requested
- No separate CSS files — Tailwind only
- No class components — functional only
- No `any` types without a comment

## Git Practices
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- One feature per commit. Keep commits small and reviewable.
- Branch naming: `phase-1/feature-name` (e.g. `phase-1/csv-import`, `phase-1/transaction-table`)
