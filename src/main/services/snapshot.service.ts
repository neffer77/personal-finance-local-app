import { getDatabase } from '../database/connection'
import type { MonthlySnapshot, SnapshotIncomeUpdate, SnapshotSummary } from '../../shared/types'

interface SnapshotRow {
  id: number
  month: string
  card_id: number | null
  total_spend_cents: number
  total_credits_cents: number
  net_spend_cents: number
  transaction_count: number
  income_cents: number | null
  savings_cents: number | null
  savings_rate: number | null
  created_at: string
  updated_at: string
}

function rowToSnapshot(row: SnapshotRow): MonthlySnapshot {
  return {
    id: row.id,
    month: row.month,
    cardId: row.card_id,
    totalSpendCents: row.total_spend_cents,
    totalCreditsCents: row.total_credits_cents,
    netSpendCents: row.net_spend_cents,
    transactionCount: row.transaction_count,
    incomeCents: row.income_cents,
    savingsCents: row.savings_cents,
    savingsRate: row.savings_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getSnapshots(cardId?: number | null): MonthlySnapshot[] {
  const db = getDatabase()
  if (cardId != null) {
    return (
      db.prepare('SELECT * FROM monthly_snapshots WHERE card_id = ? ORDER BY month DESC').all(cardId) as SnapshotRow[]
    ).map(rowToSnapshot)
  }
  return (
    db.prepare('SELECT * FROM monthly_snapshots ORDER BY month DESC').all() as SnapshotRow[]
  ).map(rowToSnapshot)
}

// Recompute and upsert snapshot for a given month + card combination
export function recomputeSnapshot(month: string, cardId: number | null): void {
  const db = getDatabase()

  interface AggRow {
    total_spend_cents: number
    total_credits_cents: number
    net_spend_cents: number
    transaction_count: number
  }

  const cardFilter = cardId != null ? 'AND card_id = ?' : 'AND card_id IS NOT NULL'
  const params: (string | number)[] = [month]
  if (cardId != null) params.push(cardId)

  const agg = db.prepare(`
    SELECT
      ABS(SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END)) AS total_spend_cents,
      SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END) AS total_credits_cents,
      ABS(SUM(amount_cents)) AS net_spend_cents,
      COUNT(*) AS transaction_count
    FROM transactions
    WHERE strftime('%Y-%m', transaction_date) = ?
      AND type != 'Payment'
      ${cardFilter}
  `).get(...params) as AggRow

  db.prepare(`
    INSERT INTO monthly_snapshots (month, card_id, total_spend_cents, total_credits_cents, net_spend_cents, transaction_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(month, card_id) DO UPDATE SET
      total_spend_cents = excluded.total_spend_cents,
      total_credits_cents = excluded.total_credits_cents,
      net_spend_cents = excluded.net_spend_cents,
      transaction_count = excluded.transaction_count,
      updated_at = datetime('now')
  `).run(
    month,
    cardId,
    agg.total_spend_cents ?? 0,
    agg.total_credits_cents ?? 0,
    agg.net_spend_cents ?? 0,
    agg.transaction_count ?? 0,
  )
}

/**
 * Write manually-entered income / savings for a given month.
 * Savings rate is auto-computed when both values are present.
 * Creates the snapshot row if it doesn't exist yet.
 */
export function updateSnapshotIncome(data: SnapshotIncomeUpdate): MonthlySnapshot {
  const db = getDatabase()

  const savingsRate =
    data.incomeCents != null && data.incomeCents > 0 && data.savingsCents != null
      ? data.savingsCents / data.incomeCents
      : null

  // Ensure a row exists for this month/card before updating income fields
  const cardFilter = data.cardId != null ? 'AND card_id = ?' : 'AND card_id IS NULL'
  const existsParams: (string | number)[] = [data.month]
  if (data.cardId != null) existsParams.push(data.cardId)

  const exists = db.prepare(
    `SELECT id FROM monthly_snapshots WHERE month = ? ${cardFilter}`,
  ).get(...existsParams)

  if (!exists) {
    db.prepare(`
      INSERT INTO monthly_snapshots
        (month, card_id, total_spend_cents, total_credits_cents, net_spend_cents, transaction_count,
         income_cents, savings_cents, savings_rate)
      VALUES (?, ?, 0, 0, 0, 0, ?, ?, ?)
    `).run(data.month, data.cardId, data.incomeCents, data.savingsCents, savingsRate)
  } else {
    const updateParams: (string | number | null)[] = [
      data.incomeCents,
      data.savingsCents,
      savingsRate,
      data.month,
    ]
    if (data.cardId != null) updateParams.push(data.cardId)

    db.prepare(`
      UPDATE monthly_snapshots
      SET income_cents = ?, savings_cents = ?, savings_rate = ?,
          updated_at = datetime('now')
      WHERE month = ? ${cardFilter}
    `).run(...updateParams)
  }

  const row = db.prepare(
    `SELECT * FROM monthly_snapshots WHERE month = ? ${cardFilter}`,
  ).get(...existsParams) as SnapshotRow
  return rowToSnapshot(row)
}

/**
 * Rolling summary across the last 12 household-total snapshots.
 * Used by the GoalsView to derive average monthly spend and savings rate.
 */
export function getSnapshotSummary(): SnapshotSummary {
  const db = getDatabase()

  interface AggRow {
    avg_spend: number | null
    avg_credits: number | null
    avg_net: number | null
    avg_savings_rate: number | null
    months_with_income: number
    latest_month: string | null
  }

  const agg = db.prepare(`
    SELECT
      AVG(total_spend_cents)   AS avg_spend,
      AVG(total_credits_cents) AS avg_credits,
      AVG(net_spend_cents)     AS avg_net,
      AVG(CASE WHEN savings_rate IS NOT NULL THEN savings_rate END) AS avg_savings_rate,
      COUNT(CASE WHEN income_cents IS NOT NULL THEN 1 END) AS months_with_income,
      MAX(month) AS latest_month
    FROM monthly_snapshots
    WHERE card_id IS NULL
      AND month >= strftime('%Y-%m', date('now', '-12 months'))
  `).get() as AggRow

  return {
    avgMonthlySpendCents: Math.round(agg.avg_spend ?? 0),
    avgMonthlyCreditsCents: Math.round(agg.avg_credits ?? 0),
    avgMonthlyNetSpendCents: Math.round(agg.avg_net ?? 0),
    avgSavingsRate: agg.avg_savings_rate,
    monthsWithIncome: agg.months_with_income,
    latestMonth: agg.latest_month,
  }
}

// Call after any import to recompute affected months
export function recomputeSnapshotsForCard(cardId: number): void {
  const db = getDatabase()

  interface MonthRow { month: string }

  const months = db.prepare(`
    SELECT DISTINCT strftime('%Y-%m', transaction_date) AS month
    FROM transactions
    WHERE card_id = ?
  `).all(cardId) as MonthRow[]

  for (const { month } of months) {
    recomputeSnapshot(month, cardId)
    recomputeSnapshot(month, null) // household total
  }
}
