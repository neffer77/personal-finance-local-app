import { getDatabase } from '../database/connection'
import type { EnrichedTransaction, TransactionFilter } from '../../shared/types'
import { listTransactions } from './transaction.service'

interface FtsRow {
  rowid: number
}

export function searchTransactions(
  query: string,
  filter: Omit<TransactionFilter, 'search'> = {},
): EnrichedTransaction[] {
  if (!query.trim()) {
    return listTransactions({ ...filter, limit: 100 }).transactions
  }

  const db = getDatabase()

  // Use FTS5 match for keyword search
  // Escape special FTS5 characters in the query
  const safeQuery = query.trim().replace(/['"*^(){}[\]|&!]/g, ' ')

  const ftsRows = db.prepare(`
    SELECT rowid FROM transactions_fts
    WHERE transactions_fts MATCH ?
    ORDER BY rank
  `).all(`${safeQuery}*`) as FtsRow[]

  if (ftsRows.length === 0) return []

  const ids = ftsRows.map((r) => r.rowid)
  const placeholders = ids.map(() => '?').join(',')

  const conditions: string[] = [`t.id IN (${placeholders})`]
  const params: (string | number)[] = [...ids]

  if (filter.cardId != null) {
    conditions.push('t.card_id = ?')
    params.push(filter.cardId)
  }
  if (filter.dateFrom) {
    conditions.push('t.transaction_date >= ?')
    params.push(filter.dateFrom)
  }
  if (filter.dateTo) {
    conditions.push('t.transaction_date <= ?')
    params.push(filter.dateTo)
  }

  const rows = db.prepare(`
    SELECT t.*
    FROM v_transactions_enriched t
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.transaction_date DESC, t.id DESC
    LIMIT 200
  `).all(...params) as (EnrichedTransaction & {
    effective_category: string
    effective_name: string
    card_name: string
    card_owner: string
    is_return: number
    card_id: number
    import_id: number
    transaction_date: string
    posted_date: string
    original_category: string
    amount_cents: number
    display_name: string | null
    category_id: number | null
    dedup_hash: string
    created_at: string
    updated_at: string
    is_return_raw: number
  })[]

  return rows.map((row) => ({
    id: row.id,
    cardId: (row as unknown as { card_id: number }).card_id,
    importId: (row as unknown as { import_id: number }).import_id,
    transactionDate: (row as unknown as { transaction_date: string }).transaction_date,
    postedDate: (row as unknown as { posted_date: string }).posted_date,
    description: row.description,
    originalCategory: (row as unknown as { original_category: string }).original_category,
    type: row.type,
    amountCents: (row as unknown as { amount_cents: number }).amount_cents,
    memo: row.memo,
    displayName: (row as unknown as { display_name: string | null }).display_name,
    categoryId: (row as unknown as { category_id: number | null }).category_id,
    notes: row.notes,
    isReturn: (row as unknown as { is_return: number }).is_return === 1,
    dedupHash: (row as unknown as { dedup_hash: string }).dedup_hash,
    createdAt: (row as unknown as { created_at: string }).created_at,
    updatedAt: (row as unknown as { updated_at: string }).updated_at,
    effectiveCategory: (row as unknown as { effective_category: string }).effective_category,
    effectiveName: (row as unknown as { effective_name: string }).effective_name,
    cardName: (row as unknown as { card_name: string }).card_name,
    cardOwner: (row as unknown as { card_owner: string }).card_owner,
  }))
}
