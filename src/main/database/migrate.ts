import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const MIGRATIONS_DIR = path.join(__dirname, '../../../sql/migrations')
const SEED_FILE = path.join(__dirname, '../../../sql/seed.sql')

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id      INTEGER PRIMARY KEY,
      name    TEXT NOT NULL UNIQUE,
      run_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = db
    .prepare('SELECT name FROM _migrations ORDER BY id')
    .all() as { name: string }[]
  const appliedSet = new Set(applied.map((r) => r.name))

  // Read and sort migration files
  let migrationFiles: string[] = []
  if (fs.existsSync(MIGRATIONS_DIR)) {
    migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  }

  for (const file of migrationFiles) {
    if (appliedSet.has(file)) continue

    const filePath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(filePath, 'utf-8')

    // Run migration in a transaction
    const runMigration = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    })

    runMigration()
    console.log(`[migrate] Applied: ${file}`)
  }

  // Run seed if no categories exist yet
  const categoryCount = (
    db.prepare('SELECT COUNT(*) as count FROM categories').get() as {
      count: number
    }
  ).count

  if (categoryCount === 0 && fs.existsSync(SEED_FILE)) {
    const seedSql = fs.readFileSync(SEED_FILE, 'utf-8')
    db.exec(seedSql)
    console.log('[migrate] Seed data applied')
  }
}
