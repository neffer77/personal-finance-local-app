export interface Card {
  id: number
  name: string
  owner: string
  issuer: string
  accountType: string
  lastFour: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CardCreate {
  name: string
  owner: string
  issuer?: string
  accountType?: string
  lastFour?: string
}

export interface CardUpdate {
  id: number
  name?: string
  owner?: string
  lastFour?: string
  isActive?: boolean
}
