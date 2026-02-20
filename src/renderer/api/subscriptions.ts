import type {
  SubscriptionWithCost,
  SubscriptionCreate,
  SubscriptionUpdate,
  Subscription,
  DetectSubscriptionsResult,
} from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const subscriptionsApi = {
  async list(): Promise<SubscriptionWithCost[]> {
    const res: ApiResponse<SubscriptionWithCost[]> = await window.api.subscriptions.list()
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to list subscriptions')
    return res.data
  },

  async detect(): Promise<DetectSubscriptionsResult> {
    const res: ApiResponse<DetectSubscriptionsResult> = await window.api.subscriptions.detect()
    if (!res.success || !res.data) throw new Error(res.error ?? 'Detection failed')
    return res.data
  },

  async create(data: SubscriptionCreate): Promise<Subscription> {
    const res: ApiResponse<Subscription> = await window.api.subscriptions.create(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to create subscription')
    return res.data
  },

  async update(data: SubscriptionUpdate): Promise<Subscription> {
    const res: ApiResponse<Subscription> = await window.api.subscriptions.update(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update subscription')
    return res.data
  },

  async resetOverride(id: number): Promise<Subscription> {
    const res: ApiResponse<Subscription> = await window.api.subscriptions.resetOverride(id)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to reset override')
    return res.data
  },

  async archive(id: number): Promise<void> {
    const res: ApiResponse<void> = await window.api.subscriptions.archive(id)
    if (!res.success) throw new Error(res.error ?? 'Failed to archive subscription')
  },
}
