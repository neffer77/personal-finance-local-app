import type { Category, CategoryCreate, CategoryUpdate } from '../../shared/types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const res: ApiResponse<Category[]> = await window.api.categories.list()
    if (!res.success) throw new Error(res.error ?? 'Failed to list categories')
    return res.data ?? []
  },

  async create(data: CategoryCreate): Promise<Category> {
    const res: ApiResponse<Category> = await window.api.categories.create(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to create category')
    return res.data
  },

  async update(data: CategoryUpdate): Promise<Category> {
    const res: ApiResponse<Category> = await window.api.categories.update(data)
    if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to update category')
    return res.data
  },
}
