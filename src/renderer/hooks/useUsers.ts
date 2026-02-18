import { useState, useEffect, useCallback } from 'react'
import { usersApi } from '@renderer/api/users'
import type { User, UserCreate } from '@shared/types'

interface UseUsersReturn {
  users: User[]
  loading: boolean
  error: string | null
  create: (data: UserCreate) => Promise<void>
  seed: () => Promise<{ users: User[]; owners: string[] } | null>
  refetch: () => void
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await usersApi.list()
      if (res.success) {
        setUsers((res.data as User[]) ?? [])
      } else {
        setError(res.error ?? 'Failed to load users')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const create = useCallback(async (data: UserCreate) => {
    const res = await usersApi.create(data)
    if (!res.success) throw new Error(res.error ?? 'Failed to create user')
    await fetchUsers()
  }, [fetchUsers])

  const seed = useCallback(async () => {
    const res = await usersApi.seed()
    if (!res.success) throw new Error(res.error ?? 'Failed to seed users')
    await fetchUsers()
    return res.data as { users: User[]; owners: string[] }
  }, [fetchUsers])

  return { users, loading, error, create, seed, refetch: fetchUsers }
}
