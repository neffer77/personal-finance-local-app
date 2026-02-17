# Database Schema — Design Decisions

## Money as Integers (cents)
All monetary values are stored as `INTEGER` in cents (e.g. $42.99 = 4299). This avoids floating point precision issues that plague financial calculations. The app layer handles display formatting (cents → dollars).

## Deduplication Strategy
Each transaction gets a `dedup_hash` computed as:
```
SHA-256(card_id + transaction_date + description + amount + type)
```
This hash has a UNIQUE constraint, so re-importing the same CSV silently skips duplicates. The `imports` table tracks how many rows were imported vs. skipped for user feedback.

**Edge case:** Two identical transactions on the same day (e.g. two $5.00 Starbucks charges) will collide. The parser should append a sequence counter to the hash input when duplicate raw rows are detected within the same CSV.

## Category Resolution Order
A transaction's "effective category" is resolved as:
1. **Transaction splits** — if splits exist, they define category allocation (the single category is ignored)
2. **User override** — `transactions.category_id` (set via inline edit)
3. **Auto-categorize rule** — applied during import
4. **Chase original** — `transactions.original_category` (fallback)

The `v_transactions_enriched` view handles #2-4. Split logic is handled in app code.

## Rules Engine
Rules run during CSV import in priority order (lower number = first). Two types:
- **categorize**: Sets `category_id` on matching transactions
- **merchant_cleanup**: Sets `display_name` on matching transactions

Both can match on the same transaction. A single transaction can be affected by one rule of each type. Rules do NOT retroactively apply to already-imported transactions (but a "re-apply rules" action could be built).

## FTS (Full-Text Search)
The `transactions_fts` virtual table uses SQLite's FTS5 for fast keyword search across description, display_name, notes, original_category, and memo. Triggers keep it in sync automatically. Query with:
```sql
SELECT t.* FROM transactions t
JOIN transactions_fts fts ON t.id = fts.rowid
WHERE transactions_fts MATCH 'starbucks';
```

## Monthly Snapshots
`monthly_snapshots` is a **materialized cache** — not a source of truth. It's recomputed from transactions after each import. It exists for performance: trend queries, FIRE projections, and comparison views can read pre-aggregated data instead of scanning all transactions.

## Phase 4 Multi-User Migration Path
The `users` table exists from day one but is optional for Phases 1-3. When Phase 4 lands:
1. Create a default user for all existing data
2. Add `user_id` columns to `cards`, `settings`, `goals`, `rules`
3. Add foreign key constraints
4. The `cards.owner` field (text) serves as a lightweight bridge until then

## Amount Sign Convention
Following Chase's CSV convention:
- **Negative amounts** = charges/purchases (money spent)
- **Positive amounts** = credits/returns/payments

The `is_return` flag on transactions provides an additional explicit signal for UI rendering (color, icons).

## Extensibility for Other Banks
The schema is bank-agnostic. Bank-specific details live in:
- `cards.issuer` — identifies which parser to use
- `transactions.original_category` — stores whatever the bank calls it (text, not FK)
- Parser adapters in app code normalize different CSV formats into the same transaction shape
