import { describe, it, expect, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

// ── In-memory database ───────────────────────────────────────────────────────

const db = new Database(':memory:')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE users (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE cards (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    owner        TEXT NOT NULL,
    issuer       TEXT NOT NULL DEFAULT 'chase',
    account_type TEXT NOT NULL DEFAULT 'credit',
    last_four    TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

vi.mock('@main/database/connection', () => ({ getDatabase: () => db }))

const {
  listUsers,
  createUser,
  seedUsersFromCards,
  listCardOwners,
} = await import('@main/services/user.service')

function clearAll() {
  db.exec('DELETE FROM users; DELETE FROM cards;')
}

// ════════════════════════════════════════════════════════════════════════════
// createUser
// ════════════════════════════════════════════════════════════════════════════

describe('createUser', () => {
  beforeEach(clearAll)

  it('creates a user and returns it with an id', () => {
    const user = createUser({ name: 'Connor' })
    expect(user.id).toBeGreaterThan(0)
    expect(user.name).toBe('Connor')
    expect(user.isPrimary).toBe(false)
    expect(user.createdAt).toBeTruthy()
  })

  it('sets isPrimary when requested', () => {
    const user = createUser({ name: 'Connor', isPrimary: true })
    expect(user.isPrimary).toBe(true)
  })

  it('defaults isPrimary to false', () => {
    const user = createUser({ name: 'Heather' })
    expect(user.isPrimary).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// listUsers
// ════════════════════════════════════════════════════════════════════════════

describe('listUsers', () => {
  beforeEach(clearAll)

  it('returns empty array when no users', () => {
    expect(listUsers()).toEqual([])
  })

  it('returns all users ordered: primary first, then alphabetical', () => {
    createUser({ name: 'Zara' })
    createUser({ name: 'Heather', isPrimary: true })
    createUser({ name: 'Bob' })

    const names = listUsers().map((u) => u.name)
    expect(names[0]).toBe('Heather')   // primary first
    expect(names.slice(1)).toEqual(['Bob', 'Zara'])  // then alpha
  })

  it('returns camelCase properties', () => {
    createUser({ name: 'Connor', isPrimary: true })
    const [user] = listUsers()
    expect(user).toMatchObject({
      id: expect.any(Number),
      name: 'Connor',
      isPrimary: true,
      createdAt: expect.any(String),
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// seedUsersFromCards
// ════════════════════════════════════════════════════════════════════════════

describe('seedUsersFromCards', () => {
  beforeEach(clearAll)

  it('returns empty array if no cards', () => {
    const users = seedUsersFromCards()
    expect(users).toEqual([])
    expect(listUsers()).toHaveLength(0)
  })

  it('creates one user per distinct card owner', () => {
    db.exec(`
      INSERT INTO cards (name, owner) VALUES ('Connor Sapphire', 'Connor');
      INSERT INTO cards (name, owner) VALUES ('Heather Freedom', 'Heather');
    `)
    const users = seedUsersFromCards()
    expect(users).toHaveLength(2)
    const names = users.map((u) => u.name).sort()
    expect(names).toEqual(['Connor', 'Heather'])
  })

  it('marks the owner with most cards as primary', () => {
    db.exec(`
      INSERT INTO cards (name, owner) VALUES ('Connor Sapphire', 'Connor');
      INSERT INTO cards (name, owner) VALUES ('Connor Freedom', 'Connor');
      INSERT INTO cards (name, owner) VALUES ('Heather Freedom', 'Heather');
    `)
    const users = seedUsersFromCards()
    const connor = users.find((u) => u.name === 'Connor')
    expect(connor?.isPrimary).toBe(true)
    const heather = users.find((u) => u.name === 'Heather')
    expect(heather?.isPrimary).toBe(false)
  })

  it('is a no-op if users already exist — returns existing users', () => {
    createUser({ name: 'ExistingUser', isPrimary: true })
    db.exec(`INSERT INTO cards (name, owner) VALUES ('Connor Card', 'Connor');`)

    const users = seedUsersFromCards()
    // Should NOT have created Connor — users table was already populated
    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('ExistingUser')
  })

  it('skips cards with blank owner', () => {
    db.exec(`
      INSERT INTO cards (name, owner) VALUES ('Mystery Card', '');
      INSERT INTO cards (name, owner) VALUES ('Connor Sapphire', 'Connor');
    `)
    const users = seedUsersFromCards()
    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('Connor')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// listCardOwners
// ════════════════════════════════════════════════════════════════════════════

describe('listCardOwners', () => {
  beforeEach(clearAll)

  it('returns empty array when no cards', () => {
    expect(listCardOwners()).toEqual([])
  })

  it('returns distinct active card owners sorted alphabetically', () => {
    db.exec(`
      INSERT INTO cards (name, owner, is_active) VALUES ('Connor Sapphire', 'Connor', 1);
      INSERT INTO cards (name, owner, is_active) VALUES ('Connor Freedom', 'Connor', 1);
      INSERT INTO cards (name, owner, is_active) VALUES ('Heather Freedom', 'Heather', 1);
    `)
    expect(listCardOwners()).toEqual(['Connor', 'Heather'])
  })

  it('excludes archived (is_active = 0) cards', () => {
    db.exec(`
      INSERT INTO cards (name, owner, is_active) VALUES ('Connor Old', 'Connor', 0);
      INSERT INTO cards (name, owner, is_active) VALUES ('Heather Freedom', 'Heather', 1);
    `)
    expect(listCardOwners()).toEqual(['Heather'])
  })

  it('excludes cards with blank owner', () => {
    db.exec(`
      INSERT INTO cards (name, owner, is_active) VALUES ('Mystery', '', 1);
      INSERT INTO cards (name, owner, is_active) VALUES ('Connor Card', 'Connor', 1);
    `)
    expect(listCardOwners()).toEqual(['Connor'])
  })
})
