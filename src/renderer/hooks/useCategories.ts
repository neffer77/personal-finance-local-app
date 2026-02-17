import { useState, useEffect } from 'react'
import { categoriesApi } from '../api/categories'
import type { Category, CategoryCreate } from '../../shared/types'

export interface UseCategoriesResult {
  categories: Category[]
  loading: boolean
  error: string | null
  createCategory: (data: CategoryCreate) => Promise<Category>
  refetch: () => void
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await categoriesApi.list()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const createCategory = async (data: CategoryCreate): Promise<Category> => {
    const cat = await categoriesApi.create(data)
    setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
    return cat
  }

  return { categories, loading, error, createCategory, refetch: fetchCategories }
}
