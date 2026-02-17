import { getDatabase } from '../database/connection'
import type {
  Subscription,
  SubscriptionWithCost,
  SubscriptionUpdate,
  BillingCycle,
  DetectSubscriptionsResult,
} from '../../shared/types'

// ============================================================================
// Row types (snake_case from SQLite)
// ============================================================================

interface SubscriptionRow {
  id: number
  name: string
  category_id: number | null
  estimated_amount_cents: number | null
  billing_cycle: string
  first_seen_date: string | null
  last_seen_date: string | null
  is_active: number
  review_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface SubscriptionCostRow extends SubscriptionRow {
  annual_cost_cents: number | null
  category_name: string | null
  transaction_count: number
}

interface TransactionGroupRow {
  normalized_key: string
  transaction_date: string
  amount_cents: number
  transaction_id: number
}

// ============================================================================
// Row → TypeScript object mappers
// ============================================================================

function rowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    estimatedAmountCents: row.estimated_amount_cents,
    billingCycle: row.billing_cycle as BillingCycle,
    firstSeenDate: row.first_seen_date,
    lastSeenDate: row.last_seen_date,
    isActive: row.is_active === 1,
    reviewDate: row.review_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToWithCost(row: SubscriptionCostRow): SubscriptionWithCost {
  return {
    ...rowToSubscription(row),
    annualCostCents: row.annual_cost_cents,
    categoryName: row.category_name,
    transactionCount: row.transaction_count,
  }
}

// ============================================================================
// Detection helpers
// ============================================================================

/**
 * Normalize a raw Chase description into a stable grouping key.
 * Strips store IDs, long digit sequences, and trailing city/state tokens.
 */
function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/#\d+/g, '')        // Remove store IDs like #12345
    .replace(/\*\S+/g, '')       // Remove tokens after * (e.g. "AMZN*ABC123")
    .replace(/\d{4,}/g, '')      // Remove 4+ digit sequences
    .replace(/\b[A-Z]{2}\b/g, '') // Remove 2-char state codes (already lowercased, skip)
    .replace(/\s+/g, ' ')
    .trim()
}

function toDisplayName(normalizedKey: string): string {
  // Title-case each word
  return normalizedKey
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/**
 * Given a sorted list of ISO date strings, compute the interval in days
 * between each consecutive pair.
 */
function computeIntervals(sortedDates: string[]): number[] {
  const intervals: number[] = []
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime()
    const curr = new Date(sortedDates[i]).getTime()
    intervals.push(Math.round((curr - prev) / 86_400_000))
  }
  return intervals
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/**
 * Classify the cadence based on the median interval between transactions.
 * Returns null if the intervals don't cluster around a known cycle.
 */
function detectCadence(intervalDays: number[]): BillingCycle | null {
  if (intervalDays.length === 0) return null
  const med = median(intervalDays)
  if (med >= 5 && med <= 10) return 'weekly'
  if (med >= 24 && med <= 45) return 'monthly'
  if (med >= 80 && med <= 105) return 'quarterly'
  if (med >= 330 && med <= 400) return 'annual'
  return null
}

/**
 * Given a list of amounts in cents, return the mode (most common value).
 * Falls back to the median if no clear mode.
 */
function mostCommonAmount(amounts: number[]): number {
  const freq = new Map<number, number>()
  for (const a of amounts) freq.set(a, (freq.get(a) ?? 0) + 1)
  let best = amounts[0]
  let bestCount = 0
  for (const [val, count] of freq) {
    if (count > bestCount) { bestCount = count; best = val }
  }
  return best
}

// ============================================================================
// Public service functions
// ============================================================================

export function listSubscriptions(): SubscriptionWithCost[] {
  const db = getDatabase()

  const rows = db.prepare(`
    SELECT
      s.*,
      CASE s.billing_cycle
        WHEN 'monthly'   THEN s.estimated_amount_cents * 12
        WHEN 'quarterly' THEN s.estimated_amount_cents * 4
        WHEN 'annual'    THEN s.estimated_amount_cents
        WHEN 'weekly'    THEN s.estimated_amount_cents * 52
        ELSE NULL
      END AS annual_cost_cents,
      c.name AS category_name,
      COUNT(st.transaction_id) AS transaction_count
    FROM subscriptions s
    LEFT JOIN categories c ON s.category_id = c.id
    LEFT JOIN subscription_transactions st ON st.subscription_id = s.id
    GROUP BY s.id
    ORDER BY s.is_active DESC, s.estimated_amount_cents DESC
  `).all() as SubscriptionCostRow[]

  return rows.map(rowToWithCost)
}

export function updateSubscription(data: SubscriptionUpdate): Subscription {
  const db = getDatabase()

  const updates: string[] = ["updated_at = datetime('now')"]
  const params: (string | number | null)[] = []

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
  if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId) }
  if (data.reviewDate !== undefined) { updates.push('review_date = ?'); params.push(data.reviewDate) }
  if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes) }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0) }

  params.push(data.id)
  db.prepare(`UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(data.id) as SubscriptionRow | undefined
  if (!row) throw new Error(`Subscription not found: ${data.id}`)
  return rowToSubscription(row)
}

export function archiveSubscription(id: number): void {
  const db = getDatabase()
  db.prepare(`UPDATE subscriptions SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
}

/**
 * Run the recurring charge detection algorithm against all transactions.
 *
 * Strategy:
 *   1. Pull all non-payment transactions grouped by a normalized description key.
 *   2. For each group with ≥ 2 transactions, compute intervals between consecutive dates.
 *   3. If the median interval matches a known billing cadence AND the amounts are
 *      consistent (same amount for ≥ 60% of occurrences), upsert a subscription record.
 *   4. Link all matching transactions via subscription_transactions.
 *
 * This is intentionally conservative — it prefers precision over recall.
 */
export function detectSubscriptions(): DetectSubscriptionsResult {
  const db = getDatabase()

  // Fetch all charge transactions (exclude payments and returns) ordered by date
  const txRows = db.prepare(`
    SELECT
      id AS transaction_id,
      transaction_date,
      amount_cents,
      LOWER(
        TRIM(
          REPLACE(REPLACE(REPLACE(description, '#', ' '), '*', ' '), '  ', ' ')
        )
      ) AS normalized_key
    FROM transactions
    WHERE type != 'Payment' AND is_return = 0
    ORDER BY transaction_date ASC
  `).all() as TransactionGroupRow[]

  // Group by normalized key
  const groups = new Map<string, TransactionGroupRow[]>()
  for (const row of txRows) {
    const key = normalizeDescription(row.normalized_key)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  let created = 0
  let updated = 0

  const upsertSub = db.prepare(`
    INSERT INTO subscriptions (name, estimated_amount_cents, billing_cycle, first_seen_date, last_seen_date)
    VALUES (?, ?, ?, ?, ?)
  `)
  const updateSub = db.prepare(`
    UPDATE subscriptions
    SET estimated_amount_cents = ?, billing_cycle = ?, first_seen_date = ?, last_seen_date = ?,
        is_active = 1, updated_at = datetime('now')
    WHERE id = ?
  `)
  const linkTx = db.prepare(`
    INSERT OR IGNORE INTO subscription_transactions (subscription_id, transaction_id)
    VALUES (?, ?)
  `)
  const findByName = db.prepare('SELECT id FROM subscriptions WHERE name = ?')

  // Run everything in a single transaction for performance
  const run = db.transaction(() => {
    for (const [key, rows] of groups) {
      if (rows.length < 2) continue

      const sortedDates = rows.map((r) => r.transaction_date)
      const amounts = rows.map((r) => Math.abs(r.amount_cents))
      const intervals = computeIntervals(sortedDates)
      const cadence = detectCadence(intervals)

      if (!cadence) continue

      // Require amount consistency: mode amount must account for ≥60% of occurrences
      const modalAmount = mostCommonAmount(amounts)
      const modalCount = amounts.filter((a) => a === modalAmount).length
      if (modalCount / amounts.length < 0.6) continue

      const displayName = toDisplayName(key)
      const firstSeen = sortedDates[0]
      const lastSeen = sortedDates[sortedDates.length - 1]

      // Upsert by display name
      const existing = findByName.get(displayName) as { id: number } | undefined
      let subId: number

      if (existing) {
        updateSub.run(modalAmount, cadence, firstSeen, lastSeen, existing.id)
        subId = existing.id
        updated++
      } else {
        const result = upsertSub.run(displayName, modalAmount, cadence, firstSeen, lastSeen)
        subId = result.lastInsertRowid as number
        created++
      }

      // Link all matching transactions
      for (const row of rows) {
        linkTx.run(subId, row.transaction_id)
      }
    }
  })

  run()
  return { created, updated }
}
