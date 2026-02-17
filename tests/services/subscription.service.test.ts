import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'

// ── In-memory database wired up before mocking ──────────────────────────────

const db = new Database(':memory:')

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE categories (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    source    TEXT NOT NULL DEFAULT 'chase',
    color     TEXT,
    icon      TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT INTO categories (id, name, source) VALUES (1, 'Bills & Utilities', 'chase');

  CREATE TABLE transactions (
    id               INTEGER PRIMARY KEY,
    card_id          INTEGER NOT NULL DEFAULT 1,
    import_id        INTEGER NOT NULL DEFAULT 1,
    transaction_date TEXT NOT NULL,
    posted_date      TEXT NOT NULL,
    description      TEXT NOT NULL,
    original_category TEXT NOT NULL DEFAULT '',
    type             TEXT NOT NULL DEFAULT 'Sale',
    amount_cents     INTEGER NOT NULL,
    memo             TEXT,
    display_name     TEXT,
    category_id      INTEGER,
    notes            TEXT,
    is_return        INTEGER NOT NULL DEFAULT 0,
    dedup_hash       TEXT NOT NULL UNIQUE,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE subscriptions (
    id                     INTEGER PRIMARY KEY,
    name                   TEXT NOT NULL,
    category_id            INTEGER,
    estimated_amount_cents INTEGER,
    billing_cycle          TEXT NOT NULL DEFAULT 'monthly',
    first_seen_date        TEXT,
    last_seen_date         TEXT,
    is_active              INTEGER NOT NULL DEFAULT 1,
    review_date            TEXT,
    notes                  TEXT,
    created_at             TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE subscription_transactions (
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, transaction_id)
  );
`)

// ── Mock the DB connection module ────────────────────────────────────────────

vi.mock('@main/database/connection', () => ({ getDatabase: () => db }))

// Import the service AFTER the mock is registered
const { detectSubscriptions, listSubscriptions, updateSubscription, archiveSubscription } =
  await import('@main/services/subscription.service')

// ── Helpers ──────────────────────────────────────────────────────────────────

let txId = 0

function insertTx(description: string, date: string, amountCents: number, type = 'Sale') {
  txId++
  db.prepare(`
    INSERT INTO transactions (id, transaction_date, posted_date, description, type, amount_cents, is_return, dedup_hash)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(txId, date, date, description, type, amountCents, `hash-${txId}`)
  return txId
}

function clearData() {
  db.exec('DELETE FROM subscription_transactions; DELETE FROM subscriptions; DELETE FROM transactions;')
  txId = 0
}

// ════════════════════════════════════════════════════════════════════════════
// detectSubscriptions
// ════════════════════════════════════════════════════════════════════════════

describe('detectSubscriptions', () => {
  beforeEach(clearData)

  it('detects a monthly subscription from 3 same-amount charges ~30 days apart', () => {
    insertTx('NETFLIX.COM', '2025-11-01', -1799)
    insertTx('NETFLIX.COM', '2025-12-01', -1799)
    insertTx('NETFLIX.COM', '2026-01-01', -1799)

    const result = detectSubscriptions()

    expect(result.created).toBe(1)
    expect(result.updated).toBe(0)

    const subs = db.prepare('SELECT * FROM subscriptions').all() as { billing_cycle: string; estimated_amount_cents: number }[]
    expect(subs).toHaveLength(1)
    expect(subs[0].billing_cycle).toBe('monthly')
    expect(subs[0].estimated_amount_cents).toBe(1799)
  })

  it('detects a weekly subscription (~7 day intervals)', () => {
    insertTx('WEEKLY BOX CO', '2026-01-01', -999)
    insertTx('WEEKLY BOX CO', '2026-01-08', -999)
    insertTx('WEEKLY BOX CO', '2026-01-15', -999)

    const result = detectSubscriptions()

    expect(result.created).toBe(1)
    const sub = db.prepare("SELECT * FROM subscriptions WHERE name LIKE '%Weekly%'").get() as { billing_cycle: string } | undefined
    expect(sub?.billing_cycle).toBe('weekly')
  })

  it('detects a quarterly subscription (~90 day intervals)', () => {
    insertTx('QUARTERLY PLAN INC', '2025-01-01', -2999)
    insertTx('QUARTERLY PLAN INC', '2025-04-01', -2999)
    insertTx('QUARTERLY PLAN INC', '2025-07-01', -2999)

    const result = detectSubscriptions()

    expect(result.created).toBe(1)
    const sub = db.prepare("SELECT * FROM subscriptions WHERE name LIKE '%Quarterly%'").get() as { billing_cycle: string } | undefined
    expect(sub?.billing_cycle).toBe('quarterly')
  })

  it('detects an annual subscription (~365 day intervals)', () => {
    insertTx('ANNUAL DOMAIN REGISTRAR', '2024-03-15', -1200)
    insertTx('ANNUAL DOMAIN REGISTRAR', '2025-03-15', -1200)

    const result = detectSubscriptions()

    expect(result.created).toBe(1)
    const sub = db.prepare("SELECT * FROM subscriptions").get() as { billing_cycle: string } | undefined
    expect(sub?.billing_cycle).toBe('annual')
  })

  it('ignores merchants with only one transaction', () => {
    insertTx('ONE OFF PURCHASE', '2026-01-15', -5000)

    const result = detectSubscriptions()

    expect(result.created).toBe(0)
    expect(db.prepare('SELECT COUNT(*) as n FROM subscriptions').get()).toMatchObject({ n: 0 })
  })

  it('skips groups with no recognisable cadence (irregular intervals)', () => {
    // 3, 60, 15 days — no coherent cadence
    insertTx('IRREGULAR MERCHANT', '2026-01-01', -500)
    insertTx('IRREGULAR MERCHANT', '2026-01-04', -500)
    insertTx('IRREGULAR MERCHANT', '2026-03-05', -500)
    insertTx('IRREGULAR MERCHANT', '2026-03-20', -500)

    const result = detectSubscriptions()

    expect(result.created).toBe(0)
  })

  it('skips groups where amounts are too inconsistent (< 60% same value)', () => {
    // 4 transactions, only 2 share the same amount — 50% < 60% threshold
    insertTx('VARIABLE CHARGE CO', '2026-01-01', -1000)
    insertTx('VARIABLE CHARGE CO', '2026-02-01', -2000)
    insertTx('VARIABLE CHARGE CO', '2026-03-01', -3000)
    insertTx('VARIABLE CHARGE CO', '2026-04-01', -1000)

    const result = detectSubscriptions()

    expect(result.created).toBe(0)
  })

  it('excludes Payment-type transactions from detection', () => {
    insertTx('AUTOMATIC PAYMENT', '2026-01-01', 184732, 'Payment')
    insertTx('AUTOMATIC PAYMENT', '2026-02-01', 192043, 'Payment')
    insertTx('AUTOMATIC PAYMENT', '2026-03-01', 175000, 'Payment')

    const result = detectSubscriptions()

    expect(result.created).toBe(0)
  })

  it('normalizes store IDs out of descriptions before grouping', () => {
    // Chase uses numeric store IDs — #12345, #67890, etc. These should
    // all collapse to the same normalized key and form one subscription.
    insertTx('SPOTIFY #12345 STOCKHOLM', '2026-01-01', -999)
    insertTx('SPOTIFY #67890 STOCKHOLM', '2026-02-01', -999)
    insertTx('SPOTIFY #11111 STOCKHOLM', '2026-03-01', -999)

    const result = detectSubscriptions()

    // All three normalize to the same key → single subscription
    expect(result.created).toBe(1)
    expect(db.prepare('SELECT COUNT(*) as n FROM subscriptions').get()).toMatchObject({ n: 1 })
  })

  it('links matched transactions via subscription_transactions', () => {
    const t1 = insertTx('HULU', '2026-01-01', -799)
    const t2 = insertTx('HULU', '2026-02-01', -799)

    detectSubscriptions()

    const links = db.prepare('SELECT * FROM subscription_transactions').all() as { transaction_id: number }[]
    const linkedIds = links.map((l) => l.transaction_id)
    expect(linkedIds).toContain(t1)
    expect(linkedIds).toContain(t2)
  })

  it('updates an existing subscription on re-run and does not create a duplicate', () => {
    insertTx('ADOBE CREATIVE CLOUD', '2025-11-01', -5499)
    insertTx('ADOBE CREATIVE CLOUD', '2025-12-01', -5499)
    detectSubscriptions()
    expect(db.prepare('SELECT COUNT(*) as n FROM subscriptions').get()).toMatchObject({ n: 1 })

    // Add another month and re-run
    insertTx('ADOBE CREATIVE CLOUD', '2026-01-01', -5499)
    const result = detectSubscriptions()

    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)
    expect(db.prepare('SELECT COUNT(*) as n FROM subscriptions').get()).toMatchObject({ n: 1 })
  })

  it('records correct first_seen_date and last_seen_date', () => {
    insertTx('DROPBOX', '2025-10-05', -1199)
    insertTx('DROPBOX', '2025-11-05', -1199)
    insertTx('DROPBOX', '2025-12-05', -1199)

    detectSubscriptions()

    const sub = db.prepare('SELECT * FROM subscriptions').get() as { first_seen_date: string; last_seen_date: string }
    expect(sub.first_seen_date).toBe('2025-10-05')
    expect(sub.last_seen_date).toBe('2025-12-05')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// listSubscriptions
// ════════════════════════════════════════════════════════════════════════════

describe('listSubscriptions', () => {
  beforeEach(clearData)

  it('returns an empty array when there are no subscriptions', () => {
    expect(listSubscriptions()).toEqual([])
  })

  it('returns subscriptions with computed annualCostCents', () => {
    db.prepare(`
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle)
      VALUES ('Spotify', 999, 'monthly')
    `).run()

    const subs = listSubscriptions()
    expect(subs).toHaveLength(1)
    expect(subs[0].name).toBe('Spotify')
    expect(subs[0].annualCostCents).toBe(999 * 12)
  })

  it('computes annualCostCents correctly for each billing cycle', () => {
    const cases = [
      { name: 'W', cycle: 'weekly', amount: 500, expected: 500 * 52 },
      { name: 'M', cycle: 'monthly', amount: 1000, expected: 1000 * 12 },
      { name: 'Q', cycle: 'quarterly', amount: 3000, expected: 3000 * 4 },
      { name: 'A', cycle: 'annual', amount: 12000, expected: 12000 },
    ]
    for (const c of cases) {
      db.prepare(`
        INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle)
        VALUES (?, ?, ?)
      `).run(c.name, c.amount, c.cycle)
    }

    const subs = listSubscriptions()
    for (const c of cases) {
      const sub = subs.find((s) => s.name === c.name)
      expect(sub?.annualCostCents).toBe(c.expected)
    }
  })

  it('includes transactionCount from linked subscription_transactions', () => {
    insertTx('LINK TEST', '2026-01-01', -999)
    insertTx('LINK TEST', '2026-02-01', -999)
    detectSubscriptions()

    const subs = listSubscriptions()
    expect(subs[0].transactionCount).toBe(2)
  })

  it('includes categoryName when category is assigned', () => {
    db.prepare(`
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, category_id)
      VALUES ('iCloud', 99, 'monthly', 1)
    `).run()

    const subs = listSubscriptions()
    expect(subs[0].categoryName).toBe('Bills & Utilities')
  })

  it('returns isActive as a boolean', () => {
    db.prepare(`
      INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, is_active)
      VALUES ('Old Service', 499, 'monthly', 0)
    `).run()

    const subs = listSubscriptions()
    expect(typeof subs[0].isActive).toBe('boolean')
    expect(subs[0].isActive).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// updateSubscription
// ════════════════════════════════════════════════════════════════════════════

describe('updateSubscription', () => {
  beforeEach(() => {
    clearData()
    db.prepare(`
      INSERT INTO subscriptions (id, name, estimated_amount_cents, billing_cycle)
      VALUES (1, 'Netflix', 1799, 'monthly')
    `).run()
  })

  it('updates the name', () => {
    updateSubscription({ id: 1, name: 'Netflix (4K)' })
    const row = db.prepare('SELECT name FROM subscriptions WHERE id = 1').get() as { name: string }
    expect(row.name).toBe('Netflix (4K)')
  })

  it('updates the review_date', () => {
    updateSubscription({ id: 1, reviewDate: '2026-06-01' })
    const row = db.prepare('SELECT review_date FROM subscriptions WHERE id = 1').get() as { review_date: string }
    expect(row.review_date).toBe('2026-06-01')
  })

  it('clears review_date when set to null', () => {
    db.prepare("UPDATE subscriptions SET review_date = '2026-06-01' WHERE id = 1").run()
    updateSubscription({ id: 1, reviewDate: null })
    const row = db.prepare('SELECT review_date FROM subscriptions WHERE id = 1').get() as { review_date: string | null }
    expect(row.review_date).toBeNull()
  })

  it('updates notes', () => {
    updateSubscription({ id: 1, notes: 'Shared with family' })
    const row = db.prepare('SELECT notes FROM subscriptions WHERE id = 1').get() as { notes: string }
    expect(row.notes).toBe('Shared with family')
  })

  it('returns the updated subscription object', () => {
    const updated = updateSubscription({ id: 1, name: 'Netflix HD' })
    expect(updated.name).toBe('Netflix HD')
    expect(updated.id).toBe(1)
  })

  it('throws if subscription does not exist', () => {
    expect(() => updateSubscription({ id: 999, name: 'Ghost' })).toThrow()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// archiveSubscription
// ════════════════════════════════════════════════════════════════════════════

describe('archiveSubscription', () => {
  beforeEach(() => {
    clearData()
    db.prepare(`
      INSERT INTO subscriptions (id, name, estimated_amount_cents, billing_cycle, is_active)
      VALUES (1, 'Cancelled Service', 999, 'monthly', 1)
    `).run()
  })

  it('sets is_active to 0', () => {
    archiveSubscription(1)
    const row = db.prepare('SELECT is_active FROM subscriptions WHERE id = 1').get() as { is_active: number }
    expect(row.is_active).toBe(0)
  })

  it('is idempotent — archiving an already-inactive subscription succeeds', () => {
    archiveSubscription(1)
    expect(() => archiveSubscription(1)).not.toThrow()
    const row = db.prepare('SELECT is_active FROM subscriptions WHERE id = 1').get() as { is_active: number }
    expect(row.is_active).toBe(0)
  })
})
