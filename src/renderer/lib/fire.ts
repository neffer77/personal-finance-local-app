// Client-side FIRE math utilities.
// These mirror the functions in goal.service.ts so the GoalsView can
// recalculate instantly without an IPC round-trip (e.g. while the user
// drags a slider). Keep in sync with the service implementations.

const MONTHS_PER_YEAR = 12

/**
 * Future value of a present lump sum + monthly contributions with monthly compounding.
 * FV = PV × (1 + r/12)^n + PMT × ((1 + r/12)^n − 1) / (r/12)
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
 * Months until a target balance is reached.
 * Returns Infinity when unreachable within 100 years.
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
  if (pmt <= 0) {
    const fv = futureValueCents(presentValueCents, 0, annualRate, 1200)
    if (fv < targetCents) return Infinity
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
  return Math.ceil(Math.log(numerator / denominator) / Math.log(1 + r))
}

/**
 * Future value of redirecting a monthly spend cut toward savings.
 * FV = PMT × ((1+r)^n − 1) / r
 */
export function impactOfSpendCutCents(
  monthlyReductionCents: number,
  years: number,
  annualRate: number,
): number {
  return futureValueCents(0, monthlyReductionCents, annualRate, years * MONTHS_PER_YEAR)
}

/** Format a month count as a human-readable string: "X yrs Y mo" */
export function formatMonths(totalMonths: number): string {
  if (!isFinite(totalMonths)) return '∞'
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} mo`
  if (months === 0) return `${years} yr${years !== 1 ? 's' : ''}`
  return `${years} yr${years !== 1 ? 's' : ''} ${months} mo`
}

/** Add months to today and return "YYYY-MM-DD" */
export function projectedDate(totalMonths: number): string | null {
  if (!isFinite(totalMonths) || totalMonths > 1200) return null
  const d = new Date()
  d.setMonth(d.getMonth() + Math.ceil(totalMonths))
  return d.toISOString().slice(0, 10)
}

/** 0–100 progress percentage capped at 100 */
export function fireProgress(currentCents: number, targetCents: number): number {
  if (targetCents <= 0) return 0
  return Math.min(100, Math.round((currentCents / targetCents) * 100))
}
