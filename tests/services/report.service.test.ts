import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// ── In-memory database ───────────────────────────────────────────────────────

const db = new Database(':memory:')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE cards (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    owner        TEXT NOT NULL,
    issuer       TEXT NOT NULL DEFAULT 'chase',
    account_type TEXT NOT NULL DEFAULT 'credit',
    last_four    TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE categories (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    source     TEXT NOT NULL DEFAULT 'chase',
    color      TEXT,
    icon       TEXT,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE imports (
    id             INTEGER PRIMARY KEY,
    card_id        INTEGER NOT NULL REFERENCES cards(id),
    filename       TEXT NOT NULL,
    file_hash      TEXT NOT NULL,
    row_count      INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    skipped_count  INTEGER NOT NULL DEFAULT 0,
    imported_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE transactions (
    id                INTEGER PRIMARY KEY,
    card_id           INTEGER NOT NULL REFERENCES cards(id),
    import_id         INTEGER NOT NULL REFERENCES imports(id),
    transaction_date  TEXT NOT NULL,
    posted_date       TEXT NOT NULL,
    description       TEXT NOT NULL,
    original_category TEXT NOT NULL,
    type              TEXT NOT NULL,
    amount_cents      INTEGER NOT NULL,
    memo              TEXT,
    display_name      TEXT,
    category_id       INTEGER REFERENCES categories(id),
    notes             TEXT,
    is_return         INTEGER NOT NULL DEFAULT 0,
    dedup_hash        TEXT NOT NULL UNIQUE,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE subscriptions (
    id                       INTEGER PRIMARY KEY,
    name                     TEXT NOT NULL,
    category_id              INTEGER,
    estimated_amount_cents   INTEGER,
    billing_cycle            TEXT NOT NULL DEFAULT 'monthly',
    first_seen_date          TEXT,
    last_seen_date           TEXT,
    is_active                INTEGER NOT NULL DEFAULT 1,
    review_date              TEXT,
    notes                    TEXT,
    created_at               TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE monthly_snapshots (
    id                   INTEGER PRIMARY KEY,
    month                TEXT NOT NULL,
    card_id              INTEGER REFERENCES cards(id),
    total_spend_cents    INTEGER NOT NULL DEFAULT 0,
    total_credits_cents  INTEGER NOT NULL DEFAULT 0,
    net_spend_cents      INTEGER NOT NULL DEFAULT 0,
    transaction_count    INTEGER NOT NULL DEFAULT 0,
    income_cents         INTEGER,
    savings_cents        INTEGER,
    savings_rate         REAL,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(month, card_id)
  );
`)

vi.mock('@main/database/connection', () => ({ getDatabase: () => db }))

const { generateReport, listOwners } = await import('@main/services/report.service')

// ── Seed helpers ─────────────────────────────────────────────────────────────

let cardIdCounter = 0
let importIdCounter = 0
let txIdCounter = 0

function insertCard(owner: string): number {
  const id = ++cardIdCounter
  db.prepare(
    `INSERT INTO cards (id, name, owner) VALUES (?, ?, ?)`,
  ).run(id, `${owner}'s Card`, owner)
  return id
}

function insertImport(cardId: number): number {
  const id = ++importIdCounter
  db.prepare(
    `INSERT INTO imports (id, card_id, filename, file_hash) VALUES (?, ?, 'test.csv', 'hash${id}')`,
  ).run(id, cardId)
  return id
}

function insertTx(
  cardId: number,
  importId: number,
  date: string,
  amountCents: number,
  type = 'Sale',
  category = 'Shopping',
  categoryId: number | null = null,
) {
  const id = ++txIdCounter
  db.prepare(
    `INSERT INTO transactions
       (id, card_id, import_id, transaction_date, posted_date, description,
        original_category, type, amount_cents, dedup_hash, category_id)
     VALUES (?, ?, ?, ?, ?, 'Merchant', ?, ?, ?, 'hash${id}', ?)`,
  ).run(id, cardId, importId, date, date, category, type, amountCents, categoryId)
  return id
}

function clearAll() {
  db.exec('DELETE FROM monthly_snapshots; DELETE FROM subscriptions; DELETE FROM transactions; DELETE FROM imports; DELETE FROM cards;')
  cardIdCounter = 0
  importIdCounter = 0
  txIdCounter = 0
}

// ════════════════════════════════════════════════════════════════════════════
// generateReport — totals
// ════════════════════════════════════════════════════════════════════════════

describe('generateReport — totals', () => {
  beforeEach(clearAll)

  it('returns zero totals when no transactions', () => {
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.totalSpendCents).toBe(0)
    expect(report.netSpendCents).toBe(0)
    expect(report.transactionCount).toBe(0)
  })

  it('counts charges (negative amount_cents) as spend', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-06-01', -5000)   // $50 charge
    insertTx(cId, iId, '2025-07-01', -3000)   // $30 charge

    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.totalSpendCents).toBe(8000)
    expect(report.transactionCount).toBe(2)
  })

  it('counts positive amount_cents as credits', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-09-01', -10000)   // $100 charge
    insertTx(cId, iId, '2025-09-15', 2000)     // $20 return

    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.totalSpendCents).toBe(10000)
    expect(report.totalCreditsCents).toBe(2000)
    expect(report.netSpendCents).toBe(8000)
  })

  it('excludes Payment type transactions', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-08-01', -5000)             // normal charge
    insertTx(cId, iId, '2025-08-05', 15000, 'Payment')  // payment — should be excluded

    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.totalSpendCents).toBe(5000)
    expect(report.transactionCount).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// generateReport — owner filter
// ════════════════════════════════════════════════════════════════════════════

describe('generateReport — owner filter', () => {
  beforeEach(clearAll)

  it('filters to a specific owner when owner is set', () => {
    const cConnor = insertCard('Connor')
    const cHeather = insertCard('Heather')
    const iConnor = insertImport(cConnor)
    const iHeather = insertImport(cHeather)
    insertTx(cConnor, iConnor, '2025-10-01', -8000)
    insertTx(cHeather, iHeather, '2025-10-01', -3000)

    const connorReport = generateReport({ owner: 'Connor', period: 'last_12_months' })
    expect(connorReport.totalSpendCents).toBe(8000)

    const heatherReport = generateReport({ owner: 'Heather', period: 'last_12_months' })
    expect(heatherReport.totalSpendCents).toBe(3000)
  })

  it('combines all owners when owner is null (household)', () => {
    const cConnor = insertCard('Connor')
    const cHeather = insertCard('Heather')
    const iConnor = insertImport(cConnor)
    const iHeather = insertImport(cHeather)
    insertTx(cConnor, iConnor, '2025-10-01', -8000)
    insertTx(cHeather, iHeather, '2025-10-01', -3000)

    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.totalSpendCents).toBe(11000)
    expect(report.owner).toBeNull()
  })

  it('reflects the requested owner in the report', () => {
    insertCard('Connor')
    const report = generateReport({ owner: 'Connor', period: 'last_12_months' })
    expect(report.owner).toBe('Connor')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// generateReport — monthly totals
// ════════════════════════════════════════════════════════════════════════════

describe('generateReport — monthly totals', () => {
  beforeEach(clearAll)

  it('returns monthly breakdown in ascending order', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-08-15', -4000)
    insertTx(cId, iId, '2025-09-10', -6000)
    insertTx(cId, iId, '2025-10-20', -2000)

    const report = generateReport({ owner: null, period: 'last_12_months' })
    const months = report.monthlyTotals.map((m) => m.month)
    expect(months).toEqual(['2025-08', '2025-09', '2025-10'])
  })

  it('computes netSpendCents as spendCents minus creditsCents per month', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-11-01', -10000)  // $100 charge
    insertTx(cId, iId, '2025-11-05', 2500)    // $25 return

    const report = generateReport({ owner: null, period: 'last_12_months' })
    const nov = report.monthlyTotals.find((m) => m.month === '2025-11')
    expect(nov?.spendCents).toBe(10000)
    expect(nov?.creditsCents).toBe(2500)
    expect(nov?.netSpendCents).toBe(7500)
  })

  it('computes avgMonthlyNetSpendCents across all months', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-08-01', -6000)
    insertTx(cId, iId, '2025-09-01', -4000)

    const report = generateReport({ owner: null, period: 'last_12_months' })
    // avg = (6000 + 4000) / 2 = 5000
    expect(report.avgMonthlyNetSpendCents).toBe(5000)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// generateReport — category breakdown
// ════════════════════════════════════════════════════════════════════════════

describe('generateReport — category breakdown', () => {
  beforeEach(clearAll)

  it('groups by original_category and orders by amount descending', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-10-01', -1000, 'Sale', 'Dining')
    insertTx(cId, iId, '2025-10-02', -5000, 'Sale', 'Groceries')
    insertTx(cId, iId, '2025-10-03', -3000, 'Sale', 'Dining')

    // Groceries: $50 (5000) > Dining: $10+$30 = $40 (4000) → Groceries first
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.topCategories[0].category).toBe('Groceries')
    expect(report.topCategories[0].amountCents).toBe(5000)
    expect(report.topCategories[1].category).toBe('Dining')
    expect(report.topCategories[1].amountCents).toBe(4000)
  })

  it('computes percentage relative to total spend', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-10-01', -8000, 'Sale', 'Dining')
    insertTx(cId, iId, '2025-10-02', -2000, 'Sale', 'Gas')

    const report = generateReport({ owner: null, period: 'last_12_months' })
    const dining = report.topCategories.find((c) => c.category === 'Dining')
    expect(dining?.percentage).toBe(80)
    const gas = report.topCategories.find((c) => c.category === 'Gas')
    expect(gas?.percentage).toBe(20)
  })

  it('excludes credits from category spend totals', () => {
    const cId = insertCard('Connor')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2025-10-01', -5000, 'Sale', 'Dining')
    insertTx(cId, iId, '2025-10-02', 1000, 'Return', 'Dining')

    const report = generateReport({ owner: null, period: 'last_12_months' })
    const dining = report.topCategories.find((c) => c.category === 'Dining')
    // Credits are not included in category spend
    expect(dining?.amountCents).toBe(5000)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// generateReport — subscription cost
// ════════════════════════════════════════════════════════════════════════════

describe('generateReport — subscription cost', () => {
  beforeEach(clearAll)

  it('returns 0 when no active subscriptions', () => {
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.subscriptionMonthlyCostCents).toBe(0)
  })

  it('sums monthly equivalent of active subscriptions', () => {
    db.exec(`
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, is_active)
        VALUES ('Netflix', 1599, 'monthly', 1);
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, is_active)
        VALUES ('Spotify', 999, 'monthly', 1);
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, is_active)
        VALUES ('OldSub', 500, 'monthly', 0);
    `)
    const report = generateReport({ owner: null, period: 'last_12_months' })
    // Only active: 1599 + 999 = 2598
    expect(report.subscriptionMonthlyCostCents).toBe(2598)
  })

  it('converts annual billing to monthly equivalent', () => {
    db.exec(`
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, is_active)
        VALUES ('AnnualSub', 12000, 'annual', 1);
    `)
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.subscriptionMonthlyCostCents).toBe(1000)  // 12000 / 12
  })

  it('converts quarterly billing to monthly equivalent', () => {
    db.exec(`
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, is_active)
        VALUES ('QuarterlySub', 3000, 'quarterly', 1);
    `)
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.subscriptionMonthlyCostCents).toBe(1000)  // 3000 / 3
  })
})

// ════════════════════════════════════════════════════════════════════════════
// generateReport — savings rate
// ════════════════════════════════════════════════════════════════════════════

describe('generateReport — savings rate', () => {
  beforeEach(clearAll)

  it('returns null when no household snapshots with income', () => {
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.avgSavingsRate).toBeNull()
  })

  it('averages savings_rate from household snapshots in the period', () => {
    db.exec(`
      INSERT INTO monthly_snapshots (month, card_id, savings_rate,
        total_spend_cents, net_spend_cents)
        VALUES ('2025-08', NULL, 0.30, 0, 0);
      INSERT INTO monthly_snapshots (month, card_id, savings_rate,
        total_spend_cents, net_spend_cents)
        VALUES ('2025-09', NULL, 0.40, 0, 0);
    `)
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.avgSavingsRate).toBeCloseTo(0.35, 5)
  })

  it('excludes card-specific snapshot rows (only uses card_id IS NULL)', () => {
    const cId = insertCard('Connor')
    db.exec(`
      INSERT INTO monthly_snapshots (month, card_id, savings_rate,
        total_spend_cents, net_spend_cents)
        VALUES ('2025-08', ${cId}, 0.50, 0, 0);
    `)
    const report = generateReport({ owner: null, period: 'last_12_months' })
    expect(report.avgSavingsRate).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// listOwners
// ════════════════════════════════════════════════════════════════════════════

describe('listOwners', () => {
  beforeEach(clearAll)

  it('returns empty array when no transactions', () => {
    expect(listOwners()).toEqual([])
  })

  it('returns distinct owners who have transactions, sorted alphabetically', () => {
    const cConnor = insertCard('Connor')
    const cHeather = insertCard('Heather')
    const iConnor = insertImport(cConnor)
    const iHeather = insertImport(cHeather)
    insertTx(cConnor, iConnor, '2025-10-01', -1000)
    insertTx(cHeather, iHeather, '2025-10-01', -2000)
    insertTx(cConnor, iConnor, '2025-11-01', -3000)  // duplicate owner — should dedupe

    expect(listOwners()).toEqual(['Connor', 'Heather'])
  })

  it('returns owners even if they have no card transactions in the period', () => {
    const cId = insertCard('Solo')
    const iId = insertImport(cId)
    insertTx(cId, iId, '2020-01-01', -5000)  // old transaction, always outside period

    // listOwners has no period filter — checks all transactions
    expect(listOwners()).toContain('Solo')
  })
})
