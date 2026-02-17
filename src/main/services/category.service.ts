import { getDatabase } from '../database/connection'
import type { Category, CategoryCreate, CategoryUpdate } from '../../shared/types'

interface CategoryRow {
  id: number
  name: string
  source: string
  color: string | null
  icon: string | null
  is_active: number
  created_at: string
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    source: row.source as 'chase' | 'user',
    color: row.color,
    icon: row.icon,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  }
}

export function listCategories(activeOnly = true): Category[] {
  const db = getDatabase()
  const rows = activeOnly
    ? (db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY name').all() as CategoryRow[])
    : (db.prepare('SELECT * FROM categories ORDER BY name').all() as CategoryRow[])
  return rows.map(rowToCategory)
}

export function getCategoryByName(name: string): Category | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as CategoryRow | undefined
  return row ? rowToCategory(row) : null
}

export function getCategory(id: number): Category | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined
  return row ? rowToCategory(row) : null
}

export function createCategory(data: CategoryCreate): Category {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO categories (name, source, color, icon)
    VALUES (?, 'user', ?, ?)
  `).run(data.name, data.color ?? null, data.icon ?? null)
  const cat = getCategory(result.lastInsertRowid as number)
  if (!cat) throw new Error('Failed to create category')
  return cat
}

export function updateCategory(data: CategoryUpdate): Category {
  const db = getDatabase()
  const updates: string[] = []
  const params: (string | number | boolean | null)[] = []

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
  if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color) }
  if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon) }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0) }

  if (updates.length > 0) {
    params.push(data.id)
    db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  }

  const cat = getCategory(data.id)
  if (!cat) throw new Error(`Category not found: ${data.id}`)
  return cat
}
