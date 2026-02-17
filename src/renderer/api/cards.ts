import type { Card, CardCreate, CardUpdate } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const cardsApi = {
  async list(): Promise<Card[]> {
    const res: ApiResponse<Card[]> = await window.api.cards.list()
    if (!res.success) throw new Error(res.error ?? 'Failed to list cards')
    return res.data ?? []
  },

  async create(data: CardCreate): Promise<Card> {
    const res: ApiResponse<Card> = await window.api.cards.create(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to create card')
    return res.data
  },

  async update(data: CardUpdate): Promise<Card> {
    const res: ApiResponse<Card> = await window.api.cards.update(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update card')
    return res.data
  },

  async archive(id: number): Promise<void> {
    const res: ApiResponse<void> = await window.api.cards.archive(id)
    if (!res.success) throw new Error(res.error ?? 'Failed to archive card')
  },
}
