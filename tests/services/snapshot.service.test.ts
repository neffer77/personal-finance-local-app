import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// ── In-memory database ───────────────────────────────────────────────────────

const db = new Database(':memory:')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE monthly_snapshots (
    id                    INTEGER PRIMARY KEY,
    month                 TEXT NOT NULL,
    card_id               INTEGER,
    total_spend_cents     INTEGER NOT NULL DEFAULT 0,
    total_credits_cents   INTEGER NOT NULL DEFAULT 0,
    net_spend_cents       INTEGER NOT NULL DEFAULT 0,
    transaction_count     INTEGER NOT NULL DEFAULT 0,
    income_cents          INTEGER,
    savings_cents         INTEGER,
    savings_rate          REAL,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(month, card_id)
  );
`)

vi.mock('@main/database/connection', () => ({ getDatabase: () => db }))

const { updateSnapshotIncome, getSnapshotSummary, getSnapshots } =
  await import('@main/services/snapshot.service')

function clearSnapshots() {
  db.exec('DELETE FROM monthly_snapshots;')
}

// helper
function insertSnapshot(month: string, cardId: number | null, spendCents: number) {
  db.prepare(`
    INSERT OR IGNORE INTO monthly_snapshots (month, card_id, total_spend_cents, net_spend_cents)
    VALUES (?, ?, ?, ?)
  `).run(month, cardId, spendCents, spendCents)
}

// ════════════════════════════════════════════════════════════════════════════
// updateSnapshotIncome
// ════════════════════════════════════════════════════════════════════════════

describe('updateSnapshotIncome', () => {
  beforeEach(clearSnapshots)

  it('creates a new row when no snapshot exists yet for the month', () => {
    updateSnapshotIncome({ month: '2026-01', cardId: null, incomeCents: 800_000, savingsCents: 200_000 })
    const rows = db.prepare("SELECT * FROM monthly_snapshots WHERE month = '2026-01'").all()
    expect(rows).toHaveLength(1)
  })

  it('updates an existing row without clobbering spend data', () => {
    insertSnapshot('2026-02', null, 350_000)
    updateSnapshotIncome({ month: '2026-02', cardId: null, incomeCents: 1_000_000, savingsCents: 400_000 })
    const row = db.prepare("SELECT * FROM monthly_snapshots WHERE month = '2026-02' AND card_id IS NULL")
      .get() as { total_spend_cents: number; income_cents: number }
    expect(row.total_spend_cents).toBe(350_000)
    expect(row.income_cents).toBe(1_000_000)
  })

  it('computes savings_rate as savingsCents / incomeCents', () => {
    updateSnapshotIncome({ month: '2026-03', cardId: null, incomeCents: 1_000_000, savingsCents: 300_000 })
    const row = db.prepare("SELECT savings_rate FROM monthly_snapshots WHERE month = '2026-03'")
      .get() as { savings_rate: number }
    expect(row.savings_rate).toBeCloseTo(0.3, 5)
  })

  it('sets savings_rate to null when incomeCents is null', () => {
    updateSnapshotIncome({ month: '2026-04', cardId: null, incomeCents: null, savingsCents: 100_000 })
    const row = db.prepare("SELECT savings_rate FROM monthly_snapshots WHERE month = '2026-04'")
      .get() as { savings_rate: number | null }
    expect(row.savings_rate).toBeNull()
  })

  it('sets savings_rate to null when incomeCents is zero', () => {
    updateSnapshotIncome({ month: '2026-05', cardId: null, incomeCents: 0, savingsCents: 50_000 })
    const row = db.prepare("SELECT savings_rate FROM monthly_snapshots WHERE month = '2026-05'")
      .get() as { savings_rate: number | null }
    expect(row.savings_rate).toBeNull()
  })

  it('returns the updated snapshot as a TypeScript object', () => {
    const snap = updateSnapshotIncome({
      month: '2026-06', cardId: null, incomeCents: 500_000, savingsCents: 150_000,
    })
    expect(snap.month).toBe('2026-06')
    expect(snap.incomeCents).toBe(500_000)
    expect(snap.savingsCents).toBe(150_000)
    expect(snap.savingsRate).toBeCloseTo(0.3, 5)
  })

  it('handles card_id isolation — separate rows for null vs specific card', () => {
    updateSnapshotIncome({ month: '2026-07', cardId: null, incomeCents: 800_000, savingsCents: 200_000 })
    updateSnapshotIncome({ month: '2026-07', cardId: 1, incomeCents: 400_000, savingsCents: 100_000 })
    const rows = db.prepare("SELECT * FROM monthly_snapshots WHERE month = '2026-07'").all()
    expect(rows).toHaveLength(2)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getSnapshotSummary
// ════════════════════════════════════════════════════════════════════════════

describe('getSnapshotSummary', () => {
  beforeEach(clearSnapshots)

  it('returns zero averages and null savings rate when no snapshots exist', () => {
    const s = getSnapshotSummary()
    expect(s.avgMonthlySpendCents).toBe(0)
    expect(s.avgSavingsRate).toBeNull()
    expect(s.monthsWithIncome).toBe(0)
    expect(s.latestMonth).toBeNull()
  })

  it('averages spend across household-total snapshots (card_id IS NULL)', () => {
    // Only null-card rows count toward household summary
    db.prepare("INSERT INTO monthly_snapshots (month, card_id, total_spend_cents, net_spend_cents) VALUES ('2025-06', NULL, 400000, 400000)").run()
    db.prepare("INSERT INTO monthly_snapshots (month, card_id, total_spend_cents, net_spend_cents) VALUES ('2025-07', NULL, 600000, 600000)").run()
    // Card-specific row should be excluded
    db.prepare("INSERT INTO monthly_snapshots (month, card_id, total_spend_cents, net_spend_cents) VALUES ('2025-07', 1, 999999, 999999)").run()

    const s = getSnapshotSummary()
    expect(s.avgMonthlySpendCents).toBe(500_000)
  })

  it('counts monthsWithIncome correctly', () => {
    updateSnapshotIncome({ month: '2025-09', cardId: null, incomeCents: 900_000, savingsCents: 300_000 })
    updateSnapshotIncome({ month: '2025-10', cardId: null, incomeCents: 950_000, savingsCents: 350_000 })
    insertSnapshot('2025-11', null, 400_000) // no income entered

    const s = getSnapshotSummary()
    expect(s.monthsWithIncome).toBe(2)
  })

  it('reports the latest month', () => {
    insertSnapshot('2025-08', null, 300_000)
    insertSnapshot('2025-10', null, 500_000)
    const s = getSnapshotSummary()
    expect(s.latestMonth).toBe('2025-10')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// getSnapshots
// ════════════════════════════════════════════════════════════════════════════

describe('getSnapshots', () => {
  beforeEach(clearSnapshots)

  it('returns all snapshots when cardId is undefined', () => {
    insertSnapshot('2026-01', null, 100_000)
    insertSnapshot('2026-01', 1, 80_000)
    expect(getSnapshots()).toHaveLength(2)
  })

  it('filters to a specific card when cardId is provided', () => {
    insertSnapshot('2026-01', null, 100_000)
    insertSnapshot('2026-01', 1, 80_000)
    const snaps = getSnapshots(1)
    expect(snaps).toHaveLength(1)
    expect(snaps[0].cardId).toBe(1)
  })

  it('maps snake_case DB columns to camelCase TypeScript properties', () => {
    updateSnapshotIncome({ month: '2026-02', cardId: null, incomeCents: 700_000, savingsCents: 210_000 })
    const [snap] = getSnapshots(null)
    expect(snap).toHaveProperty('incomeCents', 700_000)
    expect(snap).toHaveProperty('savingsCents', 210_000)
    expect(snap).toHaveProperty('savingsRate')
    expect(snap).toHaveProperty('totalSpendCents')
    expect(snap).toHaveProperty('createdAt')
  })
})
