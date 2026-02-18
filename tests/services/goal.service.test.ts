import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// ── In-memory database ───────────────────────────────────────────────────────

const db = new Database(':memory:')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE goals (
    id                   INTEGER PRIMARY KEY,
    name                 TEXT NOT NULL,
    goal_type            TEXT NOT NULL DEFAULT 'fire',
    target_amount_cents  INTEGER,
    target_date          TEXT,
    assumed_return_rate  REAL NOT NULL DEFAULT 0.07,
    notes                TEXT,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

vi.mock('@main/database/connection', () => ({ getDatabase: () => db }))

const {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  futureValueCents,
  monthsToTarget,
  requiredMonthlySavingsCents,
  impactOfSpendCutCents,
} = await import('@main/services/goal.service')

function clearGoals() {
  db.exec('DELETE FROM goals;')
}

// ════════════════════════════════════════════════════════════════════════════
// CRUD
// ════════════════════════════════════════════════════════════════════════════

describe('createGoal', () => {
  beforeEach(clearGoals)

  it('persists a goal and returns it with generated id', () => {
    const goal = createGoal({ name: 'Early Retirement', targetAmountCents: 600_000_000 })
    expect(goal.id).toBeGreaterThan(0)
    expect(goal.name).toBe('Early Retirement')
    expect(goal.targetAmountCents).toBe(600_000_000)
    expect(goal.goalType).toBe('fire')
    expect(goal.assumedReturnRate).toBe(0.07)
  })

  it('defaults goalType to fire and assumedReturnRate to 0.07', () => {
    const goal = createGoal({ name: 'Test' })
    expect(goal.goalType).toBe('fire')
    expect(goal.assumedReturnRate).toBe(0.07)
  })

  it('respects custom assumedReturnRate', () => {
    const goal = createGoal({ name: 'Conservative', assumedReturnRate: 0.05 })
    expect(goal.assumedReturnRate).toBe(0.05)
  })
})

describe('listGoals', () => {
  beforeEach(clearGoals)

  it('returns empty array when no goals exist', () => {
    expect(listGoals()).toEqual([])
  })

  it('returns all goals ordered by creation time', () => {
    createGoal({ name: 'A' })
    createGoal({ name: 'B' })
    const goals = listGoals()
    expect(goals).toHaveLength(2)
    expect(goals[0].name).toBe('A')
    expect(goals[1].name).toBe('B')
  })
})

describe('updateGoal', () => {
  beforeEach(clearGoals)

  it('updates target amount and name', () => {
    const { id } = createGoal({ name: 'Old', targetAmountCents: 100_000_000 })
    const updated = updateGoal({ id, name: 'New', targetAmountCents: 200_000_000 })
    expect(updated.name).toBe('New')
    expect(updated.targetAmountCents).toBe(200_000_000)
  })

  it('throws when goal does not exist', () => {
    expect(() => updateGoal({ id: 9999, name: 'Ghost' })).toThrow()
  })
})

describe('deleteGoal', () => {
  beforeEach(clearGoals)

  it('removes the goal from the database', () => {
    const { id } = createGoal({ name: 'To delete' })
    deleteGoal(id)
    expect(listGoals()).toHaveLength(0)
  })

  it('is idempotent — deleting a non-existent id does not throw', () => {
    expect(() => deleteGoal(9999)).not.toThrow()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// FIRE math — futureValueCents
// ════════════════════════════════════════════════════════════════════════════

describe('futureValueCents', () => {
  it('returns present value unchanged for 0 months', () => {
    expect(futureValueCents(100_000, 1_000, 0.07, 0)).toBe(100_000)
  })

  it('grows a lump sum with no contributions at 7% over 1 year', () => {
    // $10,000 at 7% annual, monthly compounding, 12 months
    // FV = 10000 × (1 + 0.07/12)^12 ≈ $10,722.90 → 1_072_290 cents
    const fv = futureValueCents(1_000_000, 0, 0.07, 12)
    expect(fv).toBeGreaterThan(1_072_000)
    expect(fv).toBeLessThan(1_073_000)
  })

  it('compounds monthly contributions correctly at 7% over 10 years', () => {
    // $500/mo at 7% annual for 120 months ≈ $86,717
    const fv = futureValueCents(0, 50_000, 0.07, 120)
    expect(fv).toBeGreaterThan(8_600_000)
    expect(fv).toBeLessThan(8_800_000)
  })

  it('handles 0% return rate (pure arithmetic sum)', () => {
    // $100/mo × 12 months = $1,200 with no initial value
    expect(futureValueCents(0, 10_000, 0, 12)).toBe(120_000)
  })

  it('handles starting value + contributions at 0%', () => {
    expect(futureValueCents(50_000, 10_000, 0, 12)).toBe(170_000)
  })

  it('returns whole cents (no floating point residuals)', () => {
    const fv = futureValueCents(123_456, 7_891, 0.07, 37)
    expect(fv).toBe(Math.round(fv))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// monthsToTarget
// ════════════════════════════════════════════════════════════════════════════

describe('monthsToTarget', () => {
  it('returns 0 when present value already meets target', () => {
    expect(monthsToTarget(1_000_000, 1_000_000, 50_000, 0.07)).toBe(0)
    expect(monthsToTarget(1_000_000, 2_000_000, 50_000, 0.07)).toBe(0)
  })

  it('calculates months correctly at 0% return', () => {
    // Need $10,000, saving $1,000/mo → 10 months
    expect(monthsToTarget(1_000_000, 0, 100_000, 0)).toBe(10)
  })

  it('returns Infinity when contribution is zero and growth alone cannot reach target at 0%', () => {
    expect(monthsToTarget(1_000_000, 0, 0, 0)).toBe(Infinity)
  })

  it('returns a finite value for a realistic FIRE scenario', () => {
    // $6M target, saving $5,000/mo ($500_000 cents) at 7%
    const months = monthsToTarget(600_000_000, 0, 500_000, 0.07)
    expect(isFinite(months)).toBe(true)
    expect(months).toBeGreaterThan(200) // more than ~16 years
    expect(months).toBeLessThan(600)    // less than 50 years
  })

  it('returns fewer months when contribution is larger', () => {
    const slow = monthsToTarget(600_000_000, 0, 300_000, 0.07)
    const fast = monthsToTarget(600_000_000, 0, 600_000, 0.07)
    expect(fast).toBeLessThan(slow)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// requiredMonthlySavingsCents
// ════════════════════════════════════════════════════════════════════════════

describe('requiredMonthlySavingsCents', () => {
  it('returns 0 for 0 months', () => {
    expect(requiredMonthlySavingsCents(1_000_000, 0, 0, 0.07)).toBe(0)
  })

  it('computes flat arithmetic when annualRate is 0', () => {
    // Need $12,000, have $0, over 12 months → $1,000/mo
    expect(requiredMonthlySavingsCents(1_200_000, 0, 12, 0)).toBe(100_000)
  })

  it('is internally consistent with futureValueCents at 7%', () => {
    const target = 600_000_000 // $6M
    const months = 360         // 30 years
    const rate = 0.07
    const pmt = requiredMonthlySavingsCents(target, 0, months, rate)
    const fv = futureValueCents(0, pmt, rate, months)
    // FV should be within $1 of target (rounding acceptable)
    expect(Math.abs(fv - target)).toBeLessThanOrEqual(100)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// impactOfSpendCutCents
// ════════════════════════════════════════════════════════════════════════════

describe('impactOfSpendCutCents', () => {
  it('returns 0 when reduction is 0', () => {
    expect(impactOfSpendCutCents(0, 10, 0.07)).toBe(0)
  })

  it('grows larger over a longer horizon', () => {
    const ten = impactOfSpendCutCents(10_000, 10, 0.07)
    const thirty = impactOfSpendCutCents(10_000, 30, 0.07)
    expect(thirty).toBeGreaterThan(ten)
  })

  it('$100/mo cut over 30 years at 7% compounds to ~$121,997', () => {
    // Well-known financial planning rule of thumb
    const fv = impactOfSpendCutCents(10_000, 30, 0.07)
    expect(fv).toBeGreaterThan(12_000_000) // > $120,000
    expect(fv).toBeLessThan(12_500_000)    // < $125,000
  })

  it('at 0% return is simply monthly × months', () => {
    // $50/mo × 120 months (10 yrs) = $6,000
    expect(impactOfSpendCutCents(5_000, 10, 0)).toBe(600_000)
  })
})
