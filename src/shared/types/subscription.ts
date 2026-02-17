export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export interface Subscription {
  id: number
  name: string
  categoryId: number | null
  estimatedAmountCents: number | null
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
  reviewDate?: string | null
  notes?: string | null
  isActive?: boolean
}

export interface DetectSubscriptionsResult {
  created: number
  updated: number
}
