export interface Category {
  id: number
  name: string
  source: 'chase' | 'user'
  color: string | null
  icon: string | null
  isActive: boolean
  createdAt: string
}

export interface CategoryCreate {
  name: string
  color?: string
  icon?: string
}

export interface CategoryUpdate {
  id: number
  name?: string
  color?: string
  icon?: string
  isActive?: boolean
}
