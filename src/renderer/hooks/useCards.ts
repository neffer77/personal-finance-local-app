import { useState, useEffect } from 'react'
import { cardsApi } from '../api/cards'
import type { Card, CardCreate, CardUpdate } from '../../shared/types'

export interface UseCardsResult {
  cards: Card[]
  loading: boolean
  error: string | null
  createCard: (data: CardCreate) => Promise<Card>
  updateCard: (data: CardUpdate) => Promise<Card>
  archiveCard: (id: number) => Promise<void>
  refetch: () => void
}

export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCards = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await cardsApi.list()
      setCards(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCards() }, [])

  const createCard = async (data: CardCreate): Promise<Card> => {
    const card = await cardsApi.create(data)
    setCards((prev) => [...prev, card])
    return card
  }

  const updateCard = async (data: CardUpdate): Promise<Card> => {
    const card = await cardsApi.update(data)
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)))
    return card
  }

  const archiveCard = async (id: number): Promise<void> => {
    await cardsApi.archive(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  return { cards, loading, error, createCard, updateCard, archiveCard, refetch: fetchCards }
}
