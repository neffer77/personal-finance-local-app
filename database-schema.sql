-- ============================================================================
-- SpendLens — Database Schema
-- SQLite 3.x
-- ============================================================================
--
-- PHASE MAP:
--   Phase 1 (MVP):        cards, categories, transactions, imports, settings
--   Phase 2 (Budgets):    budgets, budget_funding_events, tags, transaction_tags
--   Phase 3 (Income):     income_accounts, income_imports, income_transactions,
--                          income_forecasts
--   Phase 4 (Invest):     investment_accounts, investment_statements,
--                          investment_balances, investment_transactions,
--                          market_data
--   Phase 5 (Subs):       subscriptions, subscription_transactions
--   Phase 6 (FIRE):       goals, monthly_snapshots
--   Phase 7 (Multi-user): users, + user_id FKs on existing tables
--   Ongoing:              rules, transaction_splits
--
-- CONVENTIONS:
--   - All tables use INTEGER PRIMARY KEY (SQLite rowid alias)
--   - Timestamps stored as ISO 8601 text (SQLite has no native datetime)
--   - Money stored as INTEGER in cents (avoids floating point issues)
--   - Market index values stored as REAL (not money — no cent conversion)
--   - Soft deletes via is_deleted flag where appropriate
--   - created_at / updated_at on all mutable tables
-- ============================================================================

PRAGMA journal_mode = WAL;          -- better concurrent read performance
PRAGMA foreign_keys = ON;           -- enforce referential integrity

-- ============================================================================
-- PHASE 1: MVP CORE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CARDS
-- Represents a physical credit/debit card. Each CSV import is tied to a card.
-- ----------------------------------------------------------------------------
CREATE TABLE cards (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- e.g. "Connor's Chase Sapphire"
    owner           TEXT NOT NULL,               -- e.g. "Connor", "Heather"
    issuer          TEXT NOT NULL DEFAULT 'chase',-- e.g. "chase", "amex", "bofa"
    account_type    TEXT NOT NULL DEFAULT 'credit',-- "credit", "debit", "checking"
    last_four       TEXT,                        -- last 4 digits, optional identifier
    is_active       INTEGER NOT NULL DEFAULT 1,  -- 0 = archived/inactive
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- CATEGORIES
-- Unified category table. Chase's defaults are seeded; users can add custom.
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,        -- e.g. "Dining", "Groceries", "Gas"
    source          TEXT NOT NULL DEFAULT 'chase',-- "chase" = imported default, "user" = custom
    color           TEXT,                        -- hex color for charts, e.g. "#4F46E5"
    icon            TEXT,                        -- optional icon identifier
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed Chase's common categories
INSERT INTO categories (name, source) VALUES
    ('Automotive', 'chase'),
    ('Bills & Utilities', 'chase'),
    ('Education', 'chase'),
    ('Entertainment', 'chase'),
    ('Fees & Adjustments', 'chase'),
    ('Food & Drink', 'chase'),
    ('Gas', 'chase'),
    ('Gifts & Donations', 'chase'),
    ('Groceries', 'chase'),
    ('Health & Wellness', 'chase'),
    ('Home', 'chase'),
    ('Insurance', 'chase'),
    ('Kids', 'chase'),
    ('Miscellaneous', 'chase'),
    ('Personal', 'chase'),
    ('Pets', 'chase'),
    ('Professional Services', 'chase'),
    ('Shopping', 'chase'),
    ('Travel', 'chase');

-- ----------------------------------------------------------------------------
-- IMPORTS
-- Tracks each CSV file import for audit trail and deduplication context.
-- ----------------------------------------------------------------------------
CREATE TABLE imports (
    id              INTEGER PRIMARY KEY,
    card_id         INTEGER NOT NULL REFERENCES cards(id),
    filename        TEXT NOT NULL,               -- original filename
    file_hash       TEXT NOT NULL,               -- SHA-256 of file contents
    row_count       INTEGER NOT NULL DEFAULT 0,  -- total rows in CSV
    imported_count  INTEGER NOT NULL DEFAULT 0,  -- rows actually inserted (after dedup)
    skipped_count   INTEGER NOT NULL DEFAULT 0,  -- rows skipped (duplicates)
    imported_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- TRANSACTIONS
-- Core transaction table. One row per transaction from CSV import.
-- The dedup_hash prevents duplicate imports of the same transaction.
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id              INTEGER PRIMARY KEY,
    card_id         INTEGER NOT NULL REFERENCES cards(id),
    import_id       INTEGER NOT NULL REFERENCES imports(id),

    -- Raw CSV fields
    transaction_date TEXT NOT NULL,              -- date of transaction (YYYY-MM-DD)
    posted_date     TEXT NOT NULL,               -- date posted (YYYY-MM-DD)
    description     TEXT NOT NULL,               -- raw merchant description from Chase
    original_category TEXT NOT NULL,             -- category as provided by Chase
    type            TEXT NOT NULL,               -- "Sale", "Payment", "Return", etc.
    amount_cents    INTEGER NOT NULL,            -- amount in cents (negative = charge, positive = credit/return)
    memo            TEXT,                        -- memo field from CSV

    -- Enrichment fields
    display_name    TEXT,                        -- cleaned merchant name (from rules or manual edit)
    category_id     INTEGER REFERENCES categories(id), -- user-overridden category (NULL = use original_category)
    notes           TEXT,                        -- freeform user notes
    is_return       INTEGER NOT NULL DEFAULT 0,  -- 1 if this is a return/credit

    -- Deduplication
    dedup_hash      TEXT NOT NULL,               -- SHA-256(card_id + transaction_date + description + amount + type)

    -- Metadata
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(dedup_hash)
);

-- Performance indexes
CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_posted ON transactions(posted_date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_description ON transactions(description);

-- Full-text search virtual table for keyword search across transactions
CREATE VIRTUAL TABLE transactions_fts USING fts5(
    description,
    display_name,
    notes,
    original_category,
    memo,
    content='transactions',
    content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER transactions_ai AFTER INSERT ON transactions BEGIN
    INSERT INTO transactions_fts(rowid, description, display_name, notes, original_category, memo)
    VALUES (new.id, new.description, new.display_name, new.notes, new.original_category, new.memo);
END;

CREATE TRIGGER transactions_ad AFTER DELETE ON transactions BEGIN
    INSERT INTO transactions_fts(transactions_fts, rowid, description, display_name, notes, original_category, memo)
    VALUES ('delete', old.id, old.description, old.display_name, old.notes, old.original_category, old.memo);
END;

CREATE TRIGGER transactions_au AFTER UPDATE ON transactions BEGIN
    INSERT INTO transactions_fts(transactions_fts, rowid, description, display_name, notes, original_category, memo)
    VALUES ('delete', old.id, old.description, old.display_name, old.notes, old.original_category, old.memo);
    INSERT INTO transactions_fts(rowid, description, display_name, notes, original_category, memo)
    VALUES (new.id, new.description, new.display_name, new.notes, new.original_category, new.memo);
END;

-- ----------------------------------------------------------------------------
-- SETTINGS
-- Key-value store for app preferences.
-- ----------------------------------------------------------------------------
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed defaults
INSERT INTO settings (key, value) VALUES
    ('theme', 'system'),                        -- "light", "dark", "system"
    ('summary_bar_visible', 'true'),
    ('default_date_range', 'current_month'),    -- "current_month", "last_30", "all"
    ('sidebar_collapsed', 'false'),
    ('salary_cents', '0'),                      -- annual salary in cents (for income forecasting)
    ('bonus_target_pct', '0'),                  -- target bonus as decimal, e.g. 0.15 = 15%
    ('pay_frequency', 'biweekly'),              -- "biweekly" or "semimonthly"
    ('bonus_months', '2,8');                    -- comma-separated month numbers for bonus (2=Feb, 8=Aug)

-- ============================================================================
-- ONGOING / CROSS-PHASE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRANSACTION SPLITS
-- Allows splitting a single transaction's amount across multiple categories.
-- When splits exist, they override the transaction's single category assignment.
-- Split amounts must sum to the original transaction amount.
-- ----------------------------------------------------------------------------
CREATE TABLE transaction_splits (
    id              INTEGER PRIMARY KEY,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id),
    amount_cents    INTEGER NOT NULL,            -- portion allocated to this category (in cents)
    description     TEXT,                        -- optional label for this split
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_splits_transaction ON transaction_splits(transaction_id);

-- ----------------------------------------------------------------------------
-- RULES
-- Smart automation rules applied during import.
-- Two rule types: "categorize" and "merchant_cleanup"
-- Rules are evaluated in priority order (lower number = higher priority).
-- ----------------------------------------------------------------------------
CREATE TABLE rules (
    id              INTEGER PRIMARY KEY,
    rule_type       TEXT NOT NULL,               -- "categorize" or "merchant_cleanup"
    match_field     TEXT NOT NULL DEFAULT 'description', -- field to match against
    match_pattern   TEXT NOT NULL,               -- substring or regex pattern
    match_mode      TEXT NOT NULL DEFAULT 'contains', -- "contains", "starts_with", "exact", "regex"

    -- Action fields (which one is used depends on rule_type)
    target_category_id INTEGER REFERENCES categories(id), -- for "categorize" rules
    display_name    TEXT,                        -- for "merchant_cleanup" rules

    priority        INTEGER NOT NULL DEFAULT 100,-- lower = applied first
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rules_type ON rules(rule_type, priority);

-- ============================================================================
-- PHASE 2: BUDGET SYSTEM & TAGS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BUDGETS
-- Supports two modes:
--   "project"          — one-off or recurring pool of money (e.g. Vacation $10k)
--   "monthly_category" — per-category monthly limit (e.g. Groceries $500/mo)
--
-- Funding models:
--   "one_time"   — single lump sum, no auto-refill
--   "monthly"    — resets to full amount on the 1st of each calendar month
--   "bi_annual"  — funded twice per year (typically bonus months: Feb + Aug)
--   "custom"     — user defines explicit funding events in budget_funding_events
-- ----------------------------------------------------------------------------
CREATE TABLE budgets (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- e.g. "Vacation", "Groceries", "Home Renovation"
    budget_type     TEXT NOT NULL,               -- "project" or "monthly_category"
    funding_model   TEXT NOT NULL,               -- "one_time", "monthly", "bi_annual", "custom"

    -- Amount fields
    total_amount_cents    INTEGER NOT NULL,      -- total pool (project) or monthly limit (monthly_category)

    -- For monthly_category budgets: link to a spending category
    category_id     INTEGER REFERENCES categories(id),

    -- Visual alert thresholds (percentage as integer, e.g. 80 = 80%)
    warn_threshold  INTEGER NOT NULL DEFAULT 80, -- turn yellow at this % spent
    alert_threshold INTEGER NOT NULL DEFAULT 100,-- turn red at this % spent

    is_active       INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_budgets_type ON budgets(budget_type);
CREATE INDEX idx_budgets_category ON budgets(category_id);

-- ----------------------------------------------------------------------------
-- BUDGET FUNDING EVENTS
-- Tracks expected and actual funding for project/bi_annual/custom budgets.
-- For monthly budgets this table is unused (they auto-refill on the 1st).
-- Each row is an expected income event; actual_amount_cents is filled in
-- when the user confirms the real deposit arrived.
-- ----------------------------------------------------------------------------
CREATE TABLE budget_funding_events (
    id              INTEGER PRIMARY KEY,
    budget_id       INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    expected_date   TEXT NOT NULL,               -- YYYY-MM-DD when funding is expected
    expected_amount_cents INTEGER NOT NULL,      -- estimated amount
    actual_amount_cents   INTEGER,               -- NULL until confirmed/received
    fulfilled_at    TEXT,                        -- when the user marked it as fulfilled
    source          TEXT,                        -- e.g. "bonus", "salary", "manual", "income_import"
    income_transaction_id INTEGER REFERENCES income_transactions(id), -- linked import if auto-matched
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_budget_funding_budget ON budget_funding_events(budget_id);

-- ----------------------------------------------------------------------------
-- TAGS
-- User-defined labels applied to transactions (many-to-many).
-- Tags can optionally have a date range (for trip tracking) and be linked to
-- a parent budget (e.g. "Portugal 2024" → Vacation budget).
--
-- NOTE: budget_id references budgets, which is defined above.
-- ----------------------------------------------------------------------------
CREATE TABLE tags (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,        -- e.g. "Portugal 2024", "work-travel", "impulse"
    color           TEXT,                        -- hex color for UI chips
    budget_id       INTEGER REFERENCES budgets(id) ON DELETE SET NULL, -- optional parent budget
    date_start      TEXT,                        -- optional trip start date (YYYY-MM-DD)
    date_end        TEXT,                        -- optional trip end date (YYYY-MM-DD)
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tags_budget ON tags(budget_id);

CREATE TABLE transaction_tags (
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);

-- ============================================================================
-- PHASE 3: INCOME TRACKING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INCOME ACCOUNTS
-- Represents a payroll or income source. Each ADP import is assigned to one.
-- e.g. "Connor's ADP", "Side Project Income"
-- ----------------------------------------------------------------------------
CREATE TABLE income_accounts (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- e.g. "Connor's ADP"
    institution     TEXT NOT NULL DEFAULT 'adp', -- "adp", "manual", etc.
    owner           TEXT NOT NULL,               -- e.g. "Connor"
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- INCOME IMPORTS
-- Audit trail for each ADP CSV file import.
-- ----------------------------------------------------------------------------
CREATE TABLE income_imports (
    id              INTEGER PRIMARY KEY,
    income_account_id INTEGER NOT NULL REFERENCES income_accounts(id),
    filename        TEXT NOT NULL,
    file_hash       TEXT NOT NULL UNIQUE,        -- prevents re-importing same file
    row_count       INTEGER NOT NULL DEFAULT 0,
    imported_count  INTEGER NOT NULL DEFAULT 0,
    skipped_count   INTEGER NOT NULL DEFAULT 0,
    imported_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- INCOME TRANSACTIONS
-- One row per pay stub or income event imported from ADP or manually entered.
-- pay_type distinguishes regular pay from bonus, overtime, etc.
-- ----------------------------------------------------------------------------
CREATE TABLE income_transactions (
    id              INTEGER PRIMARY KEY,
    income_account_id INTEGER NOT NULL REFERENCES income_accounts(id),
    income_import_id  INTEGER REFERENCES income_imports(id), -- NULL for manual entries

    pay_date        TEXT NOT NULL,               -- YYYY-MM-DD (date paid)
    pay_period_start TEXT,                       -- YYYY-MM-DD
    pay_period_end   TEXT,                       -- YYYY-MM-DD
    pay_type        TEXT NOT NULL,               -- "regular", "bonus", "overtime", "commission", "other"
    gross_cents     INTEGER NOT NULL,            -- gross pay in cents
    net_cents       INTEGER NOT NULL,            -- net pay (take-home) in cents
    deductions_cents INTEGER NOT NULL DEFAULT 0, -- total deductions (taxes + benefits)
    description     TEXT,                        -- e.g. "Regular Pay", "Annual Bonus"

    -- Forecast matching
    forecast_id     INTEGER REFERENCES income_forecasts(id), -- matched forecast entry, if any
    is_manual       INTEGER NOT NULL DEFAULT 0,  -- 1 = manually entered, 0 = imported

    -- Deduplication
    dedup_hash      TEXT NOT NULL UNIQUE,        -- SHA-256(account_id + pay_date + pay_type + gross_cents)

    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_income_tx_account ON income_transactions(income_account_id);
CREATE INDEX idx_income_tx_date ON income_transactions(pay_date);
CREATE INDEX idx_income_tx_type ON income_transactions(pay_type);

-- ----------------------------------------------------------------------------
-- INCOME FORECASTS
-- Expected income entries generated from salary + bonus % settings.
-- When a real import lands and matches, fulfilled_at and actual_cents are set.
-- ----------------------------------------------------------------------------
CREATE TABLE income_forecasts (
    id              INTEGER PRIMARY KEY,
    income_account_id INTEGER NOT NULL REFERENCES income_accounts(id),
    expected_date   TEXT NOT NULL,               -- YYYY-MM-DD
    pay_type        TEXT NOT NULL,               -- "regular", "bonus"
    expected_gross_cents INTEGER NOT NULL,       -- estimated gross based on settings
    actual_gross_cents   INTEGER,               -- NULL until matched to a real import
    fulfilled_at    TEXT,                        -- when matched/confirmed
    income_transaction_id INTEGER REFERENCES income_transactions(id), -- matched actual
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_income_forecasts_account ON income_forecasts(income_account_id);
CREATE INDEX idx_income_forecasts_date ON income_forecasts(expected_date);

-- ============================================================================
-- PHASE 4: INVESTMENT TRACKING & PDF IMPORT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INVESTMENT ACCOUNTS
-- Represents a brokerage or retirement account. Each PDF import is assigned here.
-- e.g. "Schwab Brokerage", "Fidelity 401k"
-- ----------------------------------------------------------------------------
CREATE TABLE investment_accounts (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- e.g. "Schwab Brokerage", "Fidelity Roth IRA"
    institution     TEXT NOT NULL,               -- "schwab" or "fidelity"
    account_type    TEXT NOT NULL DEFAULT 'brokerage', -- "brokerage", "401k", "ira", "roth_ira", "other"
    account_number  TEXT,                        -- last 4 digits or partial, for identification
    owner           TEXT NOT NULL,               -- e.g. "Connor"
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- INVESTMENT STATEMENTS
-- Audit trail for each PDF import. One row per PDF file.
-- ----------------------------------------------------------------------------
CREATE TABLE investment_statements (
    id              INTEGER PRIMARY KEY,
    investment_account_id INTEGER NOT NULL REFERENCES investment_accounts(id),
    filename        TEXT NOT NULL,
    file_hash       TEXT NOT NULL UNIQUE,        -- prevents re-importing same PDF
    statement_date  TEXT NOT NULL,               -- YYYY-MM-DD (statement end date)
    statement_period_start TEXT,                 -- YYYY-MM-DD
    statement_period_end   TEXT,                 -- YYYY-MM-DD
    imported_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inv_statements_account ON investment_statements(investment_account_id);

-- ----------------------------------------------------------------------------
-- INVESTMENT BALANCES
-- Aggregated balance and activity data extracted per statement period.
-- One row per statement. Used for performance charts and trend analysis.
-- ----------------------------------------------------------------------------
CREATE TABLE investment_balances (
    id              INTEGER PRIMARY KEY,
    investment_account_id INTEGER NOT NULL REFERENCES investment_accounts(id),
    statement_id    INTEGER NOT NULL REFERENCES investment_statements(id) ON DELETE CASCADE,
    period_start    TEXT NOT NULL,               -- YYYY-MM-DD
    period_end      TEXT NOT NULL,               -- YYYY-MM-DD

    -- Balance fields (all in cents)
    beginning_balance_cents INTEGER NOT NULL DEFAULT 0,
    ending_balance_cents    INTEGER NOT NULL DEFAULT 0,
    contributions_cents     INTEGER NOT NULL DEFAULT 0, -- deposits / new money in
    withdrawals_cents       INTEGER NOT NULL DEFAULT 0, -- money taken out
    dividends_cents         INTEGER NOT NULL DEFAULT 0,
    interest_cents          INTEGER NOT NULL DEFAULT 0,
    realized_gains_cents    INTEGER NOT NULL DEFAULT 0, -- from sells during period
    unrealized_gains_cents  INTEGER,                    -- NULL if not in statement
    fees_cents              INTEGER NOT NULL DEFAULT 0,

    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inv_balances_account ON investment_balances(investment_account_id);
CREATE INDEX idx_inv_balances_period ON investment_balances(period_end);

-- ----------------------------------------------------------------------------
-- INVESTMENT TRANSACTIONS
-- Individual buy/sell/dividend/contribution transactions extracted from PDFs.
-- ----------------------------------------------------------------------------
CREATE TABLE investment_transactions (
    id              INTEGER PRIMARY KEY,
    investment_account_id INTEGER NOT NULL REFERENCES investment_accounts(id),
    statement_id    INTEGER NOT NULL REFERENCES investment_statements(id) ON DELETE CASCADE,

    transaction_date TEXT NOT NULL,              -- YYYY-MM-DD
    transaction_type TEXT NOT NULL,              -- "buy", "sell", "dividend", "interest",
                                                 -- "contribution", "withdrawal", "fee",
                                                 -- "reinvestment", "transfer"
    symbol          TEXT,                        -- ticker symbol, e.g. "VTSAX" (NULL for non-security txns)
    description     TEXT NOT NULL,               -- raw description from statement
    shares          REAL,                        -- number of shares (NULL if not applicable)
    price_cents     INTEGER,                     -- price per share in cents (NULL if not applicable)
    amount_cents    INTEGER NOT NULL,            -- total transaction amount in cents

    -- Deduplication
    dedup_hash      TEXT NOT NULL UNIQUE,        -- SHA-256(account_id + date + type + symbol + amount)

    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inv_tx_account ON investment_transactions(investment_account_id);
CREATE INDEX idx_inv_tx_date ON investment_transactions(transaction_date);
CREATE INDEX idx_inv_tx_type ON investment_transactions(transaction_type);
CREATE INDEX idx_inv_tx_symbol ON investment_transactions(symbol);

-- ----------------------------------------------------------------------------
-- MARKET DATA
-- Cached historical market index prices fetched from a public API.
-- Used for S&P 500 benchmark comparison against portfolio performance.
-- Stored as REAL (not integer cents) since index values are not dollar amounts.
-- ----------------------------------------------------------------------------
CREATE TABLE market_data (
    id              INTEGER PRIMARY KEY,
    symbol          TEXT NOT NULL,               -- e.g. "^GSPC" (S&P 500), "^IXIC" (NASDAQ)
    price_date      TEXT NOT NULL,               -- YYYY-MM-DD
    close_price     REAL NOT NULL,               -- closing price / index value
    fetched_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(symbol, price_date)
);

CREATE INDEX idx_market_data_symbol_date ON market_data(symbol, price_date);

-- ============================================================================
-- PHASE 5: SUBSCRIPTIONS & RECURRING CHARGES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- Tracks detected or manually flagged recurring charges.
-- Auto-detection logic lives in app code; this stores the results.
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- cleaned service name, e.g. "Netflix"
    category_id     INTEGER REFERENCES categories(id),
    estimated_amount_cents INTEGER,              -- typical monthly charge in cents
    billing_cycle   TEXT NOT NULL DEFAULT 'monthly', -- "monthly", "annual", "quarterly", "weekly"
    first_seen_date TEXT,                        -- earliest transaction date matched
    last_seen_date  TEXT,                        -- most recent transaction date matched
    is_active       INTEGER NOT NULL DEFAULT 1,  -- 0 = cancelled or stopped appearing
    review_date     TEXT,                        -- user-set "review by" date for cancel reminders
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Links subscription to its matched transactions for drill-down
CREATE TABLE subscription_transactions (
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, transaction_id)
);

-- ============================================================================
-- PHASE 6: FIRE / FINANCIAL GOALS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- GOALS
-- Stores FIRE target and any other user-defined financial goals.
-- ----------------------------------------------------------------------------
CREATE TABLE goals (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- e.g. "Early Retirement", "Emergency Fund"
    goal_type       TEXT NOT NULL DEFAULT 'fire',-- "fire", "savings", "custom"
    target_amount_cents INTEGER,                 -- e.g. $6,000,000 = 600000000 cents
    target_date     TEXT,                        -- e.g. "2040-01-01" (age 45)
    assumed_return_rate REAL DEFAULT 0.07,       -- annual return rate for compounding calcs
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- MONTHLY SNAPSHOTS
-- Aggregated monthly data for fast trend queries and FIRE projections.
-- Populated by app code after import; acts as a materialized cache.
-- ----------------------------------------------------------------------------
CREATE TABLE monthly_snapshots (
    id              INTEGER PRIMARY KEY,
    month           TEXT NOT NULL,               -- "YYYY-MM" format
    card_id         INTEGER REFERENCES cards(id),-- NULL = household total
    total_spend_cents     INTEGER NOT NULL DEFAULT 0,
    total_credits_cents   INTEGER NOT NULL DEFAULT 0,
    net_spend_cents       INTEGER NOT NULL DEFAULT 0,
    transaction_count     INTEGER NOT NULL DEFAULT 0,
    -- Optional user-entered fields for FIRE tracking
    income_cents          INTEGER,               -- populated from income_transactions
    savings_cents         INTEGER,               -- calculated or manual
    savings_rate          REAL,                  -- savings / income
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(month, card_id)
);

CREATE INDEX idx_snapshots_month ON monthly_snapshots(month);

-- ============================================================================
-- PHASE 7: MULTI-USER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS
-- Lightweight user profiles for multi-user access.
-- Phase 1-6 can operate without this table (single implicit user).
-- When Phase 7 lands, add user_id FK to: cards, settings, goals, rules,
-- income_accounts, investment_accounts.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,               -- e.g. "Connor", "Heather"
    is_primary      INTEGER NOT NULL DEFAULT 0,  -- 1 = app owner
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- VIEWS (convenience queries)
-- ============================================================================

-- Effective category and display name for a transaction
CREATE VIEW v_transactions_enriched AS
SELECT
    t.*,
    COALESCE(c.name, t.original_category) AS effective_category,
    COALESCE(t.display_name, t.description) AS effective_name,
    cd.name AS card_name,
    cd.owner AS card_owner
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN cards cd ON t.card_id = cd.id;

-- Monthly spend by category (respects splits)
CREATE VIEW v_monthly_category_spend AS
SELECT
    strftime('%Y-%m', t.transaction_date) AS month,
    t.card_id,
    COALESCE(c.name, t.original_category) AS category,
    SUM(
        CASE
            WHEN EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
            THEN 0  -- splits handled separately below
            ELSE t.amount_cents
        END
    ) AS direct_amount_cents,
    COUNT(t.id) AS transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY month, t.card_id, category

UNION ALL

-- Add split amounts
SELECT
    strftime('%Y-%m', t.transaction_date) AS month,
    t.card_id,
    c.name AS category,
    SUM(ts.amount_cents) AS direct_amount_cents,
    COUNT(DISTINCT t.id) AS transaction_count
FROM transaction_splits ts
JOIN transactions t ON ts.transaction_id = t.id
JOIN categories c ON ts.category_id = c.id
GROUP BY month, t.card_id, category;

-- Subscription annual cost summary
CREATE VIEW v_subscription_costs AS
SELECT
    s.*,
    CASE s.billing_cycle
        WHEN 'monthly'   THEN s.estimated_amount_cents * 12
        WHEN 'quarterly' THEN s.estimated_amount_cents * 4
        WHEN 'annual'    THEN s.estimated_amount_cents
        WHEN 'weekly'    THEN s.estimated_amount_cents * 52
    END AS annual_cost_cents,
    c.name AS category_name
FROM subscriptions s
LEFT JOIN categories c ON s.category_id = c.id
WHERE s.is_active = 1;

-- Budget spending summary: total tagged spend per budget across all cards
-- Counts transaction amount for any transaction tagged with a tag linked to that budget.
-- App code handles monthly_category budget spend separately via category matching.
CREATE VIEW v_budget_tag_spend AS
SELECT
    b.id AS budget_id,
    b.name AS budget_name,
    b.budget_type,
    b.total_amount_cents,
    tg.id AS tag_id,
    tg.name AS tag_name,
    tg.date_start,
    tg.date_end,
    SUM(ABS(t.amount_cents)) AS tag_spend_cents,
    COUNT(t.id) AS transaction_count
FROM budgets b
JOIN tags tg ON tg.budget_id = b.id
JOIN transaction_tags tt ON tt.tag_id = tg.id
JOIN transactions t ON t.id = tt.transaction_id
WHERE t.amount_cents < 0               -- charges only, not credits/returns
GROUP BY b.id, tg.id;

-- Monthly income summary across all accounts and pay types
CREATE VIEW v_income_monthly AS
SELECT
    strftime('%Y-%m', pay_date) AS month,
    pay_type,
    SUM(gross_cents) AS total_gross_cents,
    SUM(net_cents) AS total_net_cents,
    COUNT(*) AS payment_count
FROM income_transactions
GROUP BY month, pay_type;

-- Investment income (dividends + interest) by month, for inclusion in income views
CREATE VIEW v_investment_income_monthly AS
SELECT
    strftime('%Y-%m', transaction_date) AS month,
    investment_account_id,
    transaction_type,
    SUM(amount_cents) AS total_cents,
    COUNT(*) AS transaction_count
FROM investment_transactions
WHERE transaction_type IN ('dividend', 'interest', 'reinvestment')
GROUP BY month, investment_account_id, transaction_type;
