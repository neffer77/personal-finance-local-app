import { registerTransactionHandlers } from './transaction.ipc'
import { registerImportHandlers } from './import.ipc'
import { registerCardHandlers } from './card.ipc'
import { registerCategoryHandlers } from './category.ipc'
import { registerRuleHandlers } from './rule.ipc'
import { registerSearchHandlers } from './search.ipc'
import { registerSettingsHandlers } from './settings.ipc'
import { registerBackupHandlers } from './backup.ipc'
import { registerSubscriptionHandlers } from './subscription.ipc'
import { registerGoalHandlers } from './goal.ipc'
import { registerSnapshotHandlers } from './snapshot.ipc'
import { registerUserHandlers } from './user.ipc'
import { registerReportHandlers } from './report.ipc'

export function registerAllHandlers(): void {
  registerTransactionHandlers()
  registerImportHandlers()
  registerCardHandlers()
  registerCategoryHandlers()
  registerRuleHandlers()
  registerSearchHandlers()
  registerSettingsHandlers()
  registerBackupHandlers()
  registerSubscriptionHandlers()
  registerGoalHandlers()
  registerSnapshotHandlers()
  registerUserHandlers()
  registerReportHandlers()
}
