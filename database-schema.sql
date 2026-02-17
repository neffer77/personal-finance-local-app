-- ============================================================================
-- Chase Credit Card Statement Analyzer — Database Schema
-- SQLite 3.x
-- ============================================================================
-- 
-- PHASE MAP:
--   Phase 1 (MVP):        cards, categories, transactions, transaction_tags,
--                          tags, imports, settings
--   Phase 2 (Subs):       subscriptions, subscription_transactions
--   Phase 3 (FIRE):       goals, monthly_snapshots
--   Phase 4 (Multi-user): users, + user_id FKs on existing tables
--   Ongoing:              rules, transaction_splits, transaction_notes
--
-- CONVENTIONS:
--   - All tables use INTEGER PRIMARY KEY (SQLite rowid alias)
--   - Timestamps stored as ISO 8601 text (SQLite has no native datetime)
--   - Money stored as INTEGER in cents (avoids floating point issues)
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
-- TAGS
-- User-defined labels that can be applied to transactions (many-to-many).
-- ----------------------------------------------------------------------------
CREATE TABLE tags (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,        -- e.g. "vacation", "business-expense", "impulse"
    color           TEXT,                        -- hex color for UI chips
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE transaction_tags (
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

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
    ('sidebar_collapsed', 'false');

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
-- PHASE 2: SUBSCRIPTIONS & RECURRING CHARGES
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
-- PHASE 3: FIRE / FINANCIAL GOALS
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
    income_cents          INTEGER,               -- manual entry: monthly income
    savings_cents         INTEGER,               -- manual entry or calculated
    savings_rate          REAL,                   -- savings / income
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE(month, card_id)
);

CREATE INDEX idx_snapshots_month ON monthly_snapshots(month);

-- ============================================================================
-- PHASE 4: MULTI-USER
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS
-- Lightweight user profiles for multi-user access.
-- Phase 1-3 can operate without this table (single implicit user).
-- When Phase 4 lands, add user_id FK to: cards, settings, goals, rules.
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

-- Effective category for a transaction: user override > original Chase category
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
            THEN 0  -- splits handled separately
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
