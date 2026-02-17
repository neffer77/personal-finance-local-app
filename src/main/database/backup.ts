import { getDatabase } from './connection'
import fs from 'fs'
import path from 'path'

export async function createBackup(destPath: string): Promise<void> {
  const db = getDatabase()
  // better-sqlite3 backup() returns a promise
  await db.backup(destPath)
}

export function restoreFromBackup(backupPath: string, dbPath: string): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`)
  }
  // Copy the backup file over the current database
  fs.copyFileSync(backupPath, dbPath)
}

export function getDefaultBackupPath(userDataPath: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return path.join(userDataPath, `spendlens-backup-${date}.db`)
}
