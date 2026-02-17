import { create } from 'zustand'

interface FilterState {
  search: string
  categoryId: number | null
  dateFrom: string | null
  dateTo: string | null
  type: string | null   // "Sale" | "Payment" | "Return" | null
  page: number

  setSearch: (search: string) => void
  setCategoryId: (id: number | null) => void
  setDateRange: (from: string | null, to: string | null) => void
  setType: (type: string | null) => void
  setPage: (page: number) => void
  resetFilters: () => void
}

const DEFAULT_FILTER: Omit<FilterState, keyof Pick<FilterState,
  'setSearch' | 'setCategoryId' | 'setDateRange' | 'setType' | 'setPage' | 'resetFilters'
>> = {
  search: '',
  categoryId: null,
  dateFrom: null,
  dateTo: null,
  type: null,
  page: 1,
}

export const useFilterStore = create<FilterState>((set) => ({
  ...DEFAULT_FILTER,

  setSearch: (search) => set({ search, page: 1 }),
  setCategoryId: (categoryId) => set({ categoryId, page: 1 }),
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo, page: 1 }),
  setType: (type) => set({ type, page: 1 }),
  setPage: (page) => set({ page }),
  resetFilters: () => set(DEFAULT_FILTER),
}))
