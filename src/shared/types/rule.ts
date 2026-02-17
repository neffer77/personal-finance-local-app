export type RuleType = 'categorize' | 'merchant_cleanup'
export type MatchMode = 'contains' | 'starts_with' | 'exact' | 'regex'

export interface Rule {
  id: number
  ruleType: RuleType
  matchField: string
  matchPattern: string
  matchMode: MatchMode
  targetCategoryId: number | null
  displayName: string | null
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RuleCreate {
  ruleType: RuleType
  matchField?: string
  matchPattern: string
  matchMode?: MatchMode
  targetCategoryId?: number
  displayName?: string
  priority?: number
}

export interface RuleUpdate {
  id: number
  matchPattern?: string
  matchMode?: MatchMode
  targetCategoryId?: number | null
  displayName?: string | null
  priority?: number
  isActive?: boolean
}
