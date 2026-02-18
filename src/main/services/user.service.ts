import { getDatabase } from '@main/database/connection'
import type { User, UserCreate } from '@shared/types'

interface UserRow {
  id: number
  name: string
  is_primary: number
  created_at: string
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    isPrimary: row.is_primary === 1,
    createdAt: row.created_at,
  }
}

export function listUsers(): User[] {
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM users ORDER BY is_primary DESC, name ASC')
    .all() as UserRow[]
  return rows.map(rowToUser)
}

export function createUser(data: UserCreate): User {
  const db = getDatabase()
  const result = db
    .prepare(
      `INSERT INTO users (name, is_primary) VALUES (?, ?)
       RETURNING *`,
    )
    .get(data.name, data.isPrimary ? 1 : 0) as UserRow
  return rowToUser(result)
}

/**
 * Seed the users table from distinct card owners.
 * The owner with the most cards is marked as primary.
 * No-ops if users already exist.
 */
export function seedUsersFromCards(): User[] {
  const db = getDatabase()

  const existing = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }
  if (existing.cnt > 0) {
    return listUsers()
  }

  interface OwnerRow { owner: string; card_count: number }
  const owners = db
    .prepare(
      `SELECT owner, COUNT(*) as card_count
       FROM cards
       WHERE owner IS NOT NULL AND owner != ''
       GROUP BY owner
       ORDER BY card_count DESC, owner ASC`,
    )
    .all() as OwnerRow[]

  if (owners.length === 0) return []

  const insert = db.prepare(
    'INSERT INTO users (name, is_primary) VALUES (?, ?)',
  )

  const seedMany = db.transaction(() => {
    owners.forEach((o, idx) => {
      insert.run(o.owner, idx === 0 ? 1 : 0)
    })
  })
  seedMany()

  return listUsers()
}

/**
 * Returns distinct owner strings from the cards table.
 * Used by the Reports view to populate the owner switcher without
 * requiring the users table to be seeded first.
 */
export function listCardOwners(): string[] {
  const db = getDatabase()
  interface Row { owner: string }
  const rows = db
    .prepare(
      `SELECT DISTINCT owner
       FROM cards
       WHERE is_active = 1 AND owner IS NOT NULL AND owner != ''
       ORDER BY owner ASC`,
    )
    .all() as Row[]
  return rows.map((r) => r.owner)
}
