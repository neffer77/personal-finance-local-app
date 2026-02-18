import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { UserCreate } from '@shared/types'
import {
  listUsers,
  createUser,
  seedUsersFromCards,
  listCardOwners,
} from '@main/services/user.service'

export function registerUserHandlers(): void {
  ipcMain.handle(IPC.USERS_LIST, () => {
    try {
      return { success: true, data: listUsers() }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.USERS_CREATE, (_event, data: UserCreate) => {
    try {
      return { success: true, data: createUser(data) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle(IPC.USERS_SEED, () => {
    try {
      // Seed users from card owners, then also return distinct owner names
      // for the Reports owner switcher.
      const users = seedUsersFromCards()
      const owners = listCardOwners()
      return { success: true, data: { users, owners } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
