import { getDatabase } from '../database/connection'
import type { Goal, GoalCreate, GoalUpdate, GoalType } from '../../shared/types'

// ============================================================================
// Row type
// ============================================================================

interface GoalRow {
  id: number
  name: string
  goal_type: string
  target_amount_cents: number | null
  target_date: string | null
  assumed_return_rate: number
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    goalType: row.goal_type as GoalType,
    targetAmountCents: row.target_amount_cents,
    targetDate: row.target_date,
    assumedReturnRate: row.assumed_return_rate,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// CRUD
// ============================================================================

export function listGoals(): Goal[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM goals ORDER BY created_at ASC').all() as GoalRow[]
  return rows.map(rowToGoal)
}

export function getGoal(id: number): Goal | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined
  return row ? rowToGoal(row) : null
}

export function createGoal(data: GoalCreate): Goal {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO goals (name, goal_type, target_amount_cents, target_date, assumed_return_rate, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.goalType ?? 'fire',
    data.targetAmountCents ?? null,
    data.targetDate ?? null,
    data.assumedReturnRate ?? 0.07,
    data.notes ?? null,
  )
  const goal = getGoal(result.lastInsertRowid as number)
  if (!goal) throw new Error('Failed to create goal')
  return goal
}

export function updateGoal(data: GoalUpdate): Goal {
  const db = getDatabase()
  const updates: string[] = ["updated_at = datetime('now')"]
  const params: (string | number | null)[] = []

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
  if (data.targetAmountCents !== undefined) { updates.push('target_amount_cents = ?'); params.push(data.targetAmountCents) }
  if (data.targetDate !== undefined) { updates.push('target_date = ?'); params.push(data.targetDate) }
  if (data.assumedReturnRate !== undefined) { updates.push('assumed_return_rate = ?'); params.push(data.assumedReturnRate) }
  if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes) }

  params.push(data.id)
  db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const goal = getGoal(data.id)
  if (!goal) throw new Error(`Goal not found: ${data.id}`)
  return goal
}

export function deleteGoal(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

// ============================================================================
// FIRE math — pure functions, exported for independent testing
// ============================================================================

const MONTHS_PER_YEAR = 12

/**
 * Future value of a present lump sum + regular monthly contributions,
 * with monthly compounding at the given annual return rate.
 *
 * FV = PV × (1 + r/12)^n + PMT × ((1 + r/12)^n − 1) / (r/12)
 *
 * @param presentValueCents  Current savings / portfolio value in cents
 * @param monthlyContribCents  Monthly savings contribution in cents
 * @param annualRate  Annual return rate (e.g. 0.07 for 7%)
 * @param months  Number of months to project
 * @returns Future value in cents (rounded to whole cents)
 */
export function futureValueCents(
  presentValueCents: number,
  monthlyContribCents: number,
  annualRate: number,
  months: number,
): number {
  if (months <= 0) return presentValueCents
  if (annualRate === 0) return presentValueCents + monthlyContribCents * months

  const r = annualRate / MONTHS_PER_YEAR
  const growth = Math.pow(1 + r, months)
  return Math.round(presentValueCents * growth + monthlyContribCents * ((growth - 1) / r))
}

/**
 * Number of months until a savings target is reached, given a starting
 * balance and a fixed monthly contribution, at the given annual return rate.
 *
 * Derived by solving FV = PV × (1+r)^n + PMT × ((1+r)^n − 1)/r for n:
 *   n = ln((PMT + FV·r) / (PMT + PV·r)) / ln(1+r)
 *
 * Returns Infinity when the target can never be reached (contribution
 * is zero or negative and growth alone isn't enough within 1000 years).
 *
 * @param targetCents  Target portfolio value in cents
 * @param presentValueCents  Current savings in cents
 * @param monthlyContribCents  Monthly contribution in cents (must be > 0)
 * @param annualRate  Annual return rate
 * @returns Whole number of months to target, or Infinity
 */
export function monthsToTarget(
  targetCents: number,
  presentValueCents: number,
  monthlyContribCents: number,
  annualRate: number,
): number {
  if (presentValueCents >= targetCents) return 0

  if (annualRate === 0) {
    if (monthlyContribCents <= 0) return Infinity
    return Math.ceil((targetCents - presentValueCents) / monthlyContribCents)
  }

  const r = annualRate / MONTHS_PER_YEAR
  const pmt = monthlyContribCents

  // Edge: if contribution ≤ 0 and we need growth alone, iterate
  if (pmt <= 0) {
    // Check if we get there within 1200 months (100 years)
    const fv = futureValueCents(presentValueCents, 0, annualRate, 1200)
    if (fv < targetCents) return Infinity
    // Binary search
    let lo = 0; let hi = 1200
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (futureValueCents(presentValueCents, 0, annualRate, mid) >= targetCents) hi = mid
      else lo = mid + 1
    }
    return lo
  }

  const numerator = pmt + targetCents * r
  const denominator = pmt + presentValueCents * r
  if (denominator <= 0 || numerator / denominator <= 0) return Infinity

  const months = Math.log(numerator / denominator) / Math.log(1 + r)
  return Math.ceil(months)
}

/**
 * Monthly savings needed to reach a target in exactly `months` months,
 * starting from a current balance, at the given annual return rate.
 *
 * PMT = (FV − PV × (1+r)^n) × r / ((1+r)^n − 1)
 *
 * @returns Required monthly contribution in cents (rounded up to whole cents)
 */
export function requiredMonthlySavingsCents(
  targetCents: number,
  presentValueCents: number,
  months: number,
  annualRate: number,
): number {
  if (months <= 0) return 0
  if (annualRate === 0) return Math.ceil((targetCents - presentValueCents) / months)

  const r = annualRate / MONTHS_PER_YEAR
  const growth = Math.pow(1 + r, months)
  const pmt = (targetCents - presentValueCents * growth) * r / (growth - 1)
  return Math.ceil(pmt)
}

/**
 * Future value of redirecting a monthly spend reduction toward savings
 * (treated as an additional monthly contribution with no present value).
 *
 * FV = PMT × ((1+r)^n − 1) / r
 *
 * @param monthlyReductionCents  Amount saved per month from the spend cut
 * @param years  Investment horizon in years
 * @param annualRate  Annual return rate
 * @returns Compounded future value in cents
 */
export function impactOfSpendCutCents(
  monthlyReductionCents: number,
  years: number,
  annualRate: number,
): number {
  return futureValueCents(0, monthlyReductionCents, annualRate, years * MONTHS_PER_YEAR)
}
