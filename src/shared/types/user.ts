export interface User {
  id: number
  name: string
  isPrimary: boolean
  createdAt: string
}

export interface UserCreate {
  name: string
  isPrimary?: boolean
}

// ── Report types (Phase 4) ──────────────────────────────────────────────────

export type ReportPeriod = 'last_3_months' | 'last_6_months' | 'last_12_months' | 'year_to_date'

export interface ReportFilter {
  /** null = household (all owners combined) */
  owner: string | null
  period: ReportPeriod
}

export interface ReportCategory {
  category: string
  amountCents: number
  transactionCount: number
  /** Share of total net spend, 0–100 */
  percentage: number
}

export interface ReportMonth {
  month: string     // YYYY-MM
  spendCents: number
  creditsCents: number
  netSpendCents: number
}

export interface ReportSummary {
  owner: string | null    // null = household
  period: ReportPeriod
  /** Inclusive date range used for this report */
  startDate: string       // YYYY-MM-DD
  endDate: string         // YYYY-MM-DD
  totalSpendCents: number
  totalCreditsCents: number
  netSpendCents: number
  transactionCount: number
  avgMonthlyNetSpendCents: number
  topCategories: ReportCategory[]
  monthlyTotals: ReportMonth[]
  /** Total monthly cost of active subscriptions (estimated_amount_cents sum) */
  subscriptionMonthlyCostCents: number
  /** From monthly_snapshots, null if no income entered */
  avgSavingsRate: number | null
  /** Distinct card owners present in this data set */
  owners: string[]
}
