import { getDatabase } from '../database/connection'
import type { Card, CardCreate, CardUpdate } from '../../shared/types'

interface CardRow {
  id: number
  name: string
  owner: string
  issuer: string
  account_type: string
  last_four: string | null
  is_active: number
  created_at: string
  updated_at: string
}

function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    issuer: row.issuer,
    accountType: row.account_type,
    lastFour: row.last_four,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listCards(activeOnly = true): Card[] {
  const db = getDatabase()
  const rows = activeOnly
    ? (db.prepare('SELECT * FROM cards WHERE is_active = 1 ORDER BY name').all() as CardRow[])
    : (db.prepare('SELECT * FROM cards ORDER BY name').all() as CardRow[])
  return rows.map(rowToCard)
}

export function getCard(id: number): Card | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined
  return row ? rowToCard(row) : null
}

export function createCard(data: CardCreate): Card {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO cards (name, owner, issuer, account_type, last_four)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.owner,
    data.issuer ?? 'chase',
    data.accountType ?? 'credit',
    data.lastFour ?? null,
  )
  const card = getCard(result.lastInsertRowid as number)
  if (!card) throw new Error('Failed to create card')
  return card
}

export function updateCard(data: CardUpdate): Card {
  const db = getDatabase()

  const updates: string[] = ["updated_at = datetime('now')"]
  const params: (string | number | boolean | null)[] = []

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
  if (data.owner !== undefined) { updates.push('owner = ?'); params.push(data.owner) }
  if (data.lastFour !== undefined) { updates.push('last_four = ?'); params.push(data.lastFour) }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0) }

  params.push(data.id)
  db.prepare(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const card = getCard(data.id)
  if (!card) throw new Error(`Card not found: ${data.id}`)
  return card
}

export function archiveCard(id: number): void {
  const db = getDatabase()
  db.prepare("UPDATE cards SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id)
}
