-- Migration 001: Initial schema
-- Creates all tables, views, triggers, and indexes for SpendLens.
-- This migration is idempotent via CREATE TABLE IF NOT EXISTS.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- PHASE 1: MVP CORE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cards (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    owner           TEXT NOT NULL,
    issuer          TEXT NOT NULL DEFAULT 'chase',
    account_type    TEXT NOT NULL DEFAULT 'credit',
    last_four       TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    source          TEXT NOT NULL DEFAULT 'chase',
    color           TEXT,
    icon            TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS imports (
    id              INTEGER PRIMARY KEY,
    card_id         INTEGER NOT NULL REFERENCES cards(id),
    filename        TEXT NOT NULL,
    file_hash       TEXT NOT NULL,
    row_count       INTEGER NOT NULL DEFAULT 0,
    imported_count  INTEGER NOT NULL DEFAULT 0,
    skipped_count   INTEGER NOT NULL DEFAULT 0,
    imported_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    id              INTEGER PRIMARY KEY,
    card_id         INTEGER NOT NULL REFERENCES cards(id),
    import_id       INTEGER NOT NULL REFERENCES imports(id),
    transaction_date TEXT NOT NULL,
    posted_date     TEXT NOT NULL,
    description     TEXT NOT NULL,
    original_category TEXT NOT NULL,
    type            TEXT NOT NULL,
    amount_cents    INTEGER NOT NULL,
    memo            TEXT,
    display_name    TEXT,
    category_id     INTEGER REFERENCES categories(id),
    notes           TEXT,
    is_return       INTEGER NOT NULL DEFAULT 0,
    dedup_hash      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(dedup_hash)
);

CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_posted ON transactions(posted_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions(description);

CREATE VIRTUAL TABLE IF NOT EXISTS transactions_fts USING fts5(
    description,
    display_name,
    notes,
    original_category,
    memo,
    content='transactions',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS transactions_ai AFTER INSERT ON transactions BEGIN
    INSERT INTO transactions_fts(rowid, description, display_name, notes, original_category, memo)
    VALUES (new.id, new.description, new.display_name, new.notes, new.original_category, new.memo);
END;

CREATE TRIGGER IF NOT EXISTS transactions_ad AFTER DELETE ON transactions BEGIN
    INSERT INTO transactions_fts(transactions_fts, rowid, description, display_name, notes, original_category, memo)
    VALUES ('delete', old.id, old.description, old.display_name, old.notes, old.original_category, old.memo);
END;

CREATE TRIGGER IF NOT EXISTS transactions_au AFTER UPDATE ON transactions BEGIN
    INSERT INTO transactions_fts(transactions_fts, rowid, description, display_name, notes, original_category, memo)
    VALUES ('delete', old.id, old.description, old.display_name, old.notes, old.original_category, old.memo);
    INSERT INTO transactions_fts(rowid, description, display_name, notes, original_category, memo)
    VALUES (new.id, new.description, new.display_name, new.notes, new.original_category, new.memo);
END;

CREATE TABLE IF NOT EXISTS tags (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    color           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- ONGOING / CROSS-PHASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_splits (
    id              INTEGER PRIMARY KEY,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id),
    amount_cents    INTEGER NOT NULL,
    description     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_splits_transaction ON transaction_splits(transaction_id);

CREATE TABLE IF NOT EXISTS rules (
    id              INTEGER PRIMARY KEY,
    rule_type       TEXT NOT NULL,
    match_field     TEXT NOT NULL DEFAULT 'description',
    match_pattern   TEXT NOT NULL,
    match_mode      TEXT NOT NULL DEFAULT 'contains',
    target_category_id INTEGER REFERENCES categories(id),
    display_name    TEXT,
    priority        INTEGER NOT NULL DEFAULT 100,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rules_type ON rules(rule_type, priority);

-- ============================================================================
-- PHASE 2+: Created now so schema is complete; populated later
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    category_id     INTEGER REFERENCES categories(id),
    estimated_amount_cents INTEGER,
    billing_cycle   TEXT NOT NULL DEFAULT 'monthly',
    first_seen_date TEXT,
    last_seen_date  TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    review_date     TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_transactions (
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, transaction_id)
);

CREATE TABLE IF NOT EXISTS goals (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    goal_type       TEXT NOT NULL DEFAULT 'fire',
    target_amount_cents INTEGER,
    target_date     TEXT,
    assumed_return_rate REAL DEFAULT 0.07,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS monthly_snapshots (
    id              INTEGER PRIMARY KEY,
    month           TEXT NOT NULL,
    card_id         INTEGER REFERENCES cards(id),
    total_spend_cents     INTEGER NOT NULL DEFAULT 0,
    total_credits_cents   INTEGER NOT NULL DEFAULT 0,
    net_spend_cents       INTEGER NOT NULL DEFAULT 0,
    transaction_count     INTEGER NOT NULL DEFAULT 0,
    income_cents          INTEGER,
    savings_cents         INTEGER,
    savings_rate          REAL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(month, card_id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_month ON monthly_snapshots(month);

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    is_primary      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE VIEW IF NOT EXISTS v_transactions_enriched AS
SELECT
    t.*,
    COALESCE(c.name, t.original_category) AS effective_category,
    COALESCE(t.display_name, t.description) AS effective_name,
    cd.name AS card_name,
    cd.owner AS card_owner
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN cards cd ON t.card_id = cd.id;

CREATE VIEW IF NOT EXISTS v_monthly_category_spend AS
SELECT
    strftime('%Y-%m', t.transaction_date) AS month,
    t.card_id,
    COALESCE(c.name, t.original_category) AS category,
    SUM(
        CASE
            WHEN EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
            THEN 0
            ELSE t.amount_cents
        END
    ) AS direct_amount_cents,
    COUNT(t.id) AS transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY month, t.card_id, category

UNION ALL

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
