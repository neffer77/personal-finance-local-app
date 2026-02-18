import type { UserCreate } from '@shared/types'

export const usersApi = {
  list: () => window.api.users.list(),
  create: (data: UserCreate) => window.api.users.create(data),
  seed: () => window.api.users.seed(),
}
