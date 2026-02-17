export interface Tag {
  id: number
  name: string
  color: string | null
  createdAt: string
}

export interface TagCreate {
  name: string
  color?: string
}
