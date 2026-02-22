export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface Subscription {
  id: number
  name: string
  categoryId: number | null
  estimatedAmountCents: number | null
  manualOverrideAmountCents: number | null
  isManual: boolean
  billingCycle: BillingCycle
  firstSeenDate: string | null
  lastSeenDate: string | null
  isActive: boolean
  reviewDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionWithCost extends Subscription {
  annualCostCents: number | null
  categoryName: string | null
  transactionCount: number
}

export interface SubscriptionUpdate {
  id: number
  name?: string
  categoryId?: number | null
  manualOverrideAmountCents?: number | null
  reviewDate?: string | null
  notes?: string | null
  isActive?: boolean
}

export interface SubscriptionCreate {
  name: string
  estimatedAmountCents: number
  categoryId?: number | null
  billingCycle?: BillingCycle
  notes?: string | null
}

export interface DetectSubscriptionsResult {
  created: number
  updated: number
}
