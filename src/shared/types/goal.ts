export type GoalType = 'fire' | 'savings' | 'custom'

export interface Goal {
  id: number
  name: string
  goalType: GoalType
  targetAmountCents: number | null
  targetDate: string | null       // "YYYY-MM-DD"
  assumedReturnRate: number       // annual, e.g. 0.07
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface GoalCreate {
  name: string
  goalType?: GoalType
  targetAmountCents?: number
  targetDate?: string
  assumedReturnRate?: number
  notes?: string
}

export interface GoalUpdate {
  id: number
  name?: string
  targetAmountCents?: number | null
  targetDate?: string | null
  assumedReturnRate?: number
  notes?: string | null
}
