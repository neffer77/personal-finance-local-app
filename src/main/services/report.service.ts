import { getDatabase } from '@main/database/connection'
import type {
  ReportFilter,
  ReportSummary,
  ReportCategory,
  ReportMonth,
  ReportPeriod,
} from '@shared/types'

// ── Date helpers ──────────────────────────────────────────────────────────────

function periodToDates(period: ReportPeriod): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]   // today

  let startDate: string
  switch (period) {
    case 'last_3_months': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case 'last_6_months': {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 6)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case 'last_12_months': {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() - 1)
      startDate = d.toISOString().split('T')[0]
      break
    }
    case 'year_to_date': {
      startDate = `${now.getFullYear()}-01-01`
      break
    }
  }
  return { startDate, endDate }
}

// ── Main report generator ─────────────────────────────────────────────────────

export function generateReport(filter: ReportFilter): ReportSummary {
  const db = getDatabase()
  const { startDate, endDate } = periodToDates(filter.period)

  // Build owner WHERE clause — null means household (all cards)
  // We join transactions → cards and filter by card.owner when owner is set.
  const ownerClause = filter.owner !== null ? 'AND c.owner = ?' : ''
  const ownerParams: (string | number)[] = filter.owner !== null ? [filter.owner] : []

  // ── 1. Totals ─────────────────────────────────────────────────────────────
  interface TotalsRow {
    total_spend_cents: number
    total_credits_cents: number
    transaction_count: number
  }
  const totals = db
    .prepare(
      `SELECT
         SUM(CASE WHEN t.amount_cents < 0 THEN ABS(t.amount_cents) ELSE 0 END) AS total_spend_cents,
         SUM(CASE WHEN t.amount_cents > 0 THEN t.amount_cents ELSE 0 END)      AS total_credits_cents,
         COUNT(*)                                                                AS transaction_count
       FROM transactions t
       JOIN cards c ON t.card_id = c.id
       WHERE t.transaction_date BETWEEN ? AND ?
         AND t.type != 'Payment'
         ${ownerClause}`,
    )
    .get(startDate, endDate, ...ownerParams) as TotalsRow

  const totalSpendCents = totals?.total_spend_cents ?? 0
  const totalCreditsCents = totals?.total_credits_cents ?? 0
  const netSpendCents = totalSpendCents - totalCreditsCents
  const transactionCount = totals?.transaction_count ?? 0

  // ── 2. Monthly totals ─────────────────────────────────────────────────────
  interface MonthRow {
    month: string
    spend_cents: number
    credits_cents: number
  }
  const monthRows = db
    .prepare(
      `SELECT
         strftime('%Y-%m', t.transaction_date)                                  AS month,
         SUM(CASE WHEN t.amount_cents < 0 THEN ABS(t.amount_cents) ELSE 0 END) AS spend_cents,
         SUM(CASE WHEN t.amount_cents > 0 THEN t.amount_cents ELSE 0 END)      AS credits_cents
       FROM transactions t
       JOIN cards c ON t.card_id = c.id
       WHERE t.transaction_date BETWEEN ? AND ?
         AND t.type != 'Payment'
         ${ownerClause}
       GROUP BY month
       ORDER BY month ASC`,
    )
    .all(startDate, endDate, ...ownerParams) as MonthRow[]

  const monthlyTotals: ReportMonth[] = monthRows.map((r) => ({
    month: r.month,
    spendCents: r.spend_cents,
    creditsCents: r.credits_cents,
    netSpendCents: r.spend_cents - r.credits_cents,
  }))

  const monthCount = monthlyTotals.length || 1
  const avgMonthlyNetSpendCents = Math.round(netSpendCents / monthCount)

  // ── 3. Category breakdown ─────────────────────────────────────────────────
  interface CatRow {
    category: string
    amount_cents: number
    transaction_count: number
  }
  const catRows = db
    .prepare(
      `SELECT
         COALESCE(cat.name, t.original_category, 'Uncategorized') AS category,
         SUM(ABS(t.amount_cents))                                   AS amount_cents,
         COUNT(*)                                                    AS transaction_count
       FROM transactions t
       JOIN cards c ON t.card_id = c.id
       LEFT JOIN categories cat ON t.category_id = cat.id
       WHERE t.transaction_date BETWEEN ? AND ?
         AND t.type != 'Payment'
         AND t.amount_cents < 0
         ${ownerClause}
       GROUP BY category
       ORDER BY amount_cents DESC
       LIMIT 10`,
    )
    .all(startDate, endDate, ...ownerParams) as CatRow[]

  const topCategories: ReportCategory[] = catRows.map((r) => ({
    category: r.category,
    amountCents: r.amount_cents,
    transactionCount: r.transaction_count,
    percentage: totalSpendCents > 0
      ? Math.round((r.amount_cents / totalSpendCents) * 1000) / 10
      : 0,
  }))

  // ── 4. Subscription monthly cost ──────────────────────────────────────────
  // Sum estimated_amount_cents for monthly-equivalent cost of active subs.
  // We include all active subscriptions regardless of owner since sub detection
  // is card-agnostic; this is an approximation for the household/owner split.
  interface SubCostRow { monthly_cost_cents: number }
  const subCostRow = db
    .prepare(
      `SELECT SUM(
         CASE billing_cycle
           WHEN 'monthly'   THEN estimated_amount_cents
           WHEN 'quarterly' THEN estimated_amount_cents / 3
           WHEN 'annual'    THEN estimated_amount_cents / 12
           WHEN 'weekly'    THEN estimated_amount_cents * 4
           ELSE estimated_amount_cents
         END
       ) AS monthly_cost_cents
       FROM subscriptions
       WHERE is_active = 1
         AND estimated_amount_cents IS NOT NULL`,
    )
    .get() as SubCostRow | undefined

  const subscriptionMonthlyCostCents = subCostRow?.monthly_cost_cents ?? 0

  // ── 5. Avg savings rate from snapshots (household total rows only) ────────
  interface SavingsRow { avg_savings_rate: number | null }
  const savingsRow = db
    .prepare(
      `SELECT AVG(savings_rate) AS avg_savings_rate
       FROM monthly_snapshots
       WHERE card_id IS NULL
         AND savings_rate IS NOT NULL
         AND month BETWEEN substr(?, 1, 7) AND substr(?, 1, 7)`,
    )
    .get(startDate, endDate) as SavingsRow | undefined

  const avgSavingsRate = savingsRow?.avg_savings_rate ?? null

  // ── 6. Owners list ────────────────────────────────────────────────────────
  interface OwnerRow { owner: string }
  const ownerRows = db
    .prepare(
      `SELECT DISTINCT c.owner
       FROM transactions t
       JOIN cards c ON t.card_id = c.id
       WHERE t.transaction_date BETWEEN ? AND ?
         AND c.owner IS NOT NULL AND c.owner != ''
       ORDER BY c.owner ASC`,
    )
    .all(startDate, endDate) as OwnerRow[]

  const owners = ownerRows.map((r) => r.owner)

  return {
    owner: filter.owner,
    period: filter.period,
    startDate,
    endDate,
    totalSpendCents,
    totalCreditsCents,
    netSpendCents,
    transactionCount,
    avgMonthlyNetSpendCents,
    topCategories,
    monthlyTotals,
    subscriptionMonthlyCostCents,
    avgSavingsRate,
    owners,
  }
}

/**
 * Returns distinct owner names that have transactions in the database.
 * Used to populate the owner switcher in the Reports view.
 */
export function listOwners(): string[] {
  const db = getDatabase()
  interface Row { owner: string }
  const rows = db
    .prepare(
      `SELECT DISTINCT c.owner
       FROM transactions t
       JOIN cards c ON t.card_id = c.id
       WHERE c.owner IS NOT NULL AND c.owner != ''
       ORDER BY c.owner ASC`,
    )
    .all() as Row[]
  return rows.map((r) => r.owner)
}
