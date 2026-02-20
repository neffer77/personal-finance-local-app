// IPC channel name constants — single source of truth
// All channels must be declared here; never hardcode strings in handlers or API layer.

export const IPC = {
  // Transactions
  TRANSACTIONS_LIST: 'transactions:list',
  TRANSACTIONS_GET: 'transactions:get',
  TRANSACTIONS_UPDATE: 'transactions:update',

  // Import
  IMPORT_CSV: 'import:csv',
  IMPORT_LIST: 'import:list',

  // Cards
  CARDS_LIST: 'cards:list',
  CARDS_CREATE: 'cards:create',
  CARDS_UPDATE: 'cards:update',
  CARDS_ARCHIVE: 'cards:archive',

  // Categories
  CATEGORIES_LIST: 'categories:list',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',

  // Tags
  TAGS_LIST: 'tags:list',
  TAGS_CREATE: 'tags:create',
  TAGS_DELETE: 'tags:delete',
  TRANSACTION_TAGS_SET: 'transaction-tags:set',

  // Rules
  RULES_LIST: 'rules:list',
  RULES_CREATE: 'rules:create',
  RULES_UPDATE: 'rules:update',
  RULES_DELETE: 'rules:delete',

  // Search
  SEARCH_TRANSACTIONS: 'search:transactions',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',

  // Subscriptions
  SUBSCRIPTIONS_LIST: 'subscriptions:list',
  SUBSCRIPTIONS_DETECT: 'subscriptions:detect',
  SUBSCRIPTIONS_CREATE: 'subscriptions:create',
  SUBSCRIPTIONS_UPDATE: 'subscriptions:update',
  SUBSCRIPTIONS_RESET_OVERRIDE: 'subscriptions:reset-override',
  SUBSCRIPTIONS_ARCHIVE: 'subscriptions:archive',

  // Goals (Phase 3)
  GOALS_LIST: 'goals:list',
  GOALS_CREATE: 'goals:create',
  GOALS_UPDATE: 'goals:update',
  GOALS_DELETE: 'goals:delete',

  // Snapshots (Phase 3)
  SNAPSHOTS_LIST: 'snapshots:list',
  SNAPSHOTS_UPDATE_INCOME: 'snapshots:update-income',
  SNAPSHOTS_SUMMARY: 'snapshots:summary',

  // Users (Phase 4)
  USERS_LIST: 'users:list',
  USERS_CREATE: 'users:create',
  USERS_SEED: 'users:seed',

  // Reports (Phase 4)
  REPORTS_SUMMARY: 'reports:summary',
  REPORTS_OWNERS: 'reports:owners',

  // Backup
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',

  // Dialog (for file pickers)
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
