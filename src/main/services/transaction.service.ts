import { getDatabase } from '../database/connection'
import type {
  Transaction,
  EnrichedTransaction,
  TransactionUpdate,
  TransactionFilter,
  TransactionListResult,
} from '../../shared/types'

interface TransactionRow {
  id: number
  card_id: number
  import_id: number
  transaction_date: string
  posted_date: string
  description: string
  original_category: string
  type: string
  amount_cents: number
  memo: string | null
  display_name: string | null
  category_id: number | null
  notes: string | null
  is_return: number
  dedup_hash: string
  created_at: string
  updated_at: string
}

interface EnrichedRow extends TransactionRow {
  effective_category: string
  effective_name: string
  card_name: string
  card_owner: string
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    cardId: row.card_id,
    importId: row.import_id,
    transactionDate: row.transaction_date,
    postedDate: row.posted_date,
    description: row.description,
    originalCategory: row.original_category,
    type: row.type,
    amountCents: row.amount_cents,
    memo: row.memo,
    displayName: row.display_name,
    categoryId: row.category_id,
    notes: row.notes,
    isReturn: row.is_return === 1,
    dedupHash: row.dedup_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToEnriched(row: EnrichedRow): EnrichedTransaction {
  return {
    ...rowToTransaction(row),
    effectiveCategory: row.effective_category,
    effectiveName: row.effective_name,
    cardName: row.card_name,
    cardOwner: row.card_owner,
  }
}

export function listTransactions(filter: TransactionFilter = {}): TransactionListResult {
  const db = getDatabase()
  const limit = filter.limit ?? 100
  const page = filter.page ?? 1
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filter.cardId != null) {
    conditions.push('t.card_id = ?')
    params.push(filter.cardId)
  }
  if (filter.categoryId != null) {
    conditions.push('(t.category_id = ? OR (t.category_id IS NULL AND t.original_category = (SELECT name FROM categories WHERE id = ?)))')
    params.push(filter.categoryId, filter.categoryId)
  }
  if (filter.dateFrom) {
    conditions.push('t.transaction_date >= ?')
    params.push(filter.dateFrom)
  }
  if (filter.dateTo) {
    conditions.push('t.transaction_date <= ?')
    params.push(filter.dateTo)
  }
  if (filter.type) {
    conditions.push('t.type = ?')
    params.push(filter.type)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countRow = db.prepare(`
    SELECT COUNT(*) as count
    FROM v_transactions_enriched t
    ${where}
  `).get(...params) as { count: number }

  const rows = db.prepare(`
    SELECT t.*
    FROM v_transactions_enriched t
    ${where}
    ORDER BY t.transaction_date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as EnrichedRow[]

  return {
    transactions: rows.map(rowToEnriched),
    total: countRow.count,
    page,
    limit,
  }
}

export function getTransaction(id: number): EnrichedTransaction | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM v_transactions_enriched WHERE id = ?').get(id) as EnrichedRow | undefined
  return row ? rowToEnriched(row) : null
}

export function insertTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
): { inserted: boolean; id: number } {
  const db = getDatabase()

  try {
    const result = db.prepare(`
      INSERT INTO transactions (
        card_id, import_id, transaction_date, posted_date,
        description, original_category, type, amount_cents,
        memo, display_name, category_id, notes, is_return, dedup_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tx.cardId,
      tx.importId,
      tx.transactionDate,
      tx.postedDate,
      tx.description,
      tx.originalCategory,
      tx.type,
      tx.amountCents,
      tx.memo ?? null,
      tx.displayName ?? null,
      tx.categoryId ?? null,
      tx.notes ?? null,
      tx.isReturn ? 1 : 0,
      tx.dedupHash,
    )
    return { inserted: true, id: result.lastInsertRowid as number }
  } catch (err: unknown) {
    // UNIQUE constraint on dedup_hash = duplicate
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      const existing = db.prepare('SELECT id FROM transactions WHERE dedup_hash = ?').get(tx.dedupHash) as { id: number } | undefined
      return { inserted: false, id: existing?.id ?? 0 }
    }
    throw err
  }
}

export function updateTransaction(data: TransactionUpdate): EnrichedTransaction {
  const db = getDatabase()
  const updates: string[] = ["updated_at = datetime('now')"]
  const params: (string | number | null)[] = []

  if (data.displayName !== undefined) { updates.push('display_name = ?'); params.push(data.displayName) }
  if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId) }
  if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes) }

  params.push(data.id)
  db.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const tx = getTransaction(data.id)
  if (!tx) throw new Error(`Transaction not found: ${data.id}`)
  return tx
}
