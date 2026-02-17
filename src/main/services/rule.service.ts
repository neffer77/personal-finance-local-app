import { getDatabase } from '../database/connection'
import type { Rule, RuleCreate, RuleUpdate, RuleType, MatchMode } from '../../shared/types'

interface RuleRow {
  id: number
  rule_type: string
  match_field: string
  match_pattern: string
  match_mode: string
  target_category_id: number | null
  display_name: string | null
  priority: number
  is_active: number
  created_at: string
  updated_at: string
}

function rowToRule(row: RuleRow): Rule {
  return {
    id: row.id,
    ruleType: row.rule_type as RuleType,
    matchField: row.match_field,
    matchPattern: row.match_pattern,
    matchMode: row.match_mode as MatchMode,
    targetCategoryId: row.target_category_id,
    displayName: row.display_name,
    priority: row.priority,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listRules(activeOnly = true): Rule[] {
  const db = getDatabase()
  const sql = activeOnly
    ? 'SELECT * FROM rules WHERE is_active = 1 ORDER BY priority, id'
    : 'SELECT * FROM rules ORDER BY priority, id'
  return (db.prepare(sql).all() as RuleRow[]).map(rowToRule)
}

export function createRule(data: RuleCreate): Rule {
  const db = getDatabase()
  const result = db.prepare(`
    INSERT INTO rules (rule_type, match_field, match_pattern, match_mode, target_category_id, display_name, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.ruleType,
    data.matchField ?? 'description',
    data.matchPattern,
    data.matchMode ?? 'contains',
    data.targetCategoryId ?? null,
    data.displayName ?? null,
    data.priority ?? 100,
  )
  const rule = getRule(result.lastInsertRowid as number)
  if (!rule) throw new Error('Failed to create rule')
  return rule
}

export function getRule(id: number): Rule | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM rules WHERE id = ?').get(id) as RuleRow | undefined
  return row ? rowToRule(row) : null
}

export function updateRule(data: RuleUpdate): Rule {
  const db = getDatabase()
  const updates: string[] = ["updated_at = datetime('now')"]
  const params: (string | number | null)[] = []

  if (data.matchPattern !== undefined) { updates.push('match_pattern = ?'); params.push(data.matchPattern) }
  if (data.matchMode !== undefined) { updates.push('match_mode = ?'); params.push(data.matchMode) }
  if (data.targetCategoryId !== undefined) { updates.push('target_category_id = ?'); params.push(data.targetCategoryId) }
  if (data.displayName !== undefined) { updates.push('display_name = ?'); params.push(data.displayName) }
  if (data.priority !== undefined) { updates.push('priority = ?'); params.push(data.priority) }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0) }

  params.push(data.id)
  db.prepare(`UPDATE rules SET ${updates.join(', ')} WHERE id = ?`).run(...params)

  const rule = getRule(data.id)
  if (!rule) throw new Error(`Rule not found: ${data.id}`)
  return rule
}

export function deleteRule(id: number): void {
  const db = getDatabase()
  db.prepare('DELETE FROM rules WHERE id = ?').run(id)
}

// Apply rules to a description/memo. Returns { categoryId, displayName } overrides.
export function applyRules(
  description: string,
): { categoryId: number | null; displayName: string | null } {
  const rules = listRules(true)
  let categoryId: number | null = null
  let displayName: string | null = null

  for (const rule of rules) {
    if (!rule.isActive) continue

    const fieldValue = description.toLowerCase()
    const pattern = rule.matchPattern.toLowerCase()
    let matches = false

    switch (rule.matchMode) {
      case 'contains':
        matches = fieldValue.includes(pattern)
        break
      case 'starts_with':
        matches = fieldValue.startsWith(pattern)
        break
      case 'exact':
        matches = fieldValue === pattern
        break
      case 'regex': {
        try {
          matches = new RegExp(rule.matchPattern, 'i').test(description)
        } catch {
          matches = false
        }
        break
      }
    }

    if (matches) {
      if (rule.ruleType === 'categorize' && categoryId === null && rule.targetCategoryId !== null) {
        categoryId = rule.targetCategoryId
      }
      if (rule.ruleType === 'merchant_cleanup' && displayName === null && rule.displayName !== null) {
        displayName = rule.displayName
      }
    }

    // Stop early if both are resolved
    if (categoryId !== null && displayName !== null) break
  }

  return { categoryId, displayName }
}
