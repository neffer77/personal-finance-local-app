import { useState, useEffect } from 'react'
import { Toolbar } from '../layout/Toolbar'
import { SummaryBar } from './SummaryBar'
import { TransactionTable } from './TransactionTable'
import { TransactionDetail } from './TransactionDetail'
import { useUiStore } from '../../stores/ui.store'
import { transactionsApi } from '../../api/transactions'
import type { EnrichedTransaction } from '../../../shared/types'

export function TransactionsView() {
  const { sidePanelOpen, selectedTransactionId, closeSidePanel } = useUiStore()
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null)
  const [summaryTransactions, setSummaryTransactions] = useState<EnrichedTransaction[]>([])

  // Load the selected transaction when the side panel opens
  useEffect(() => {
    if (selectedTransactionId) {
      transactionsApi.get(selectedTransactionId).then(setSelectedTx).catch(() => {})
    } else {
      setSelectedTx(null)
    }
  }, [selectedTransactionId])

  // Load a small batch for the summary bar
  useEffect(() => {
    transactionsApi.list({ limit: 200, page: 1 }).then((r) => setSummaryTransactions(r.transactions)).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden flex-1">
      <Toolbar />
      <SummaryBar transactions={summaryTransactions} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TransactionTable />
        </div>
        {sidePanelOpen && selectedTx && (
          <TransactionDetail
            transaction={selectedTx}
            onClose={closeSidePanel}
            onUpdated={(updated) => setSelectedTx(updated)}
          />
        )}
      </div>
    </div>
  )
}
