import { useUiStore } from '../../stores/ui.store'
import { useTransactions } from '../../hooks/useTransactions'
import { useSearch } from '../../hooks/useSearch'
import { useFilterStore } from '../../stores/filter.store'
import { TransactionRow } from './TransactionRow'
import { EmptyState } from '../shared/EmptyState'
import type { EnrichedTransaction } from '../../../shared/types'

const COLUMNS = ['Date', 'Description', 'Category', 'Card', 'Amount']

export function TransactionTable() {
  const { selectedTransactionId, openSidePanel } = useUiStore()
  const { search } = useFilterStore()
  const { transactions, loading, error, total, loadNextPage } = useTransactions()
  const { results: searchResults, loading: searchLoading } = useSearch()

  // If there's an active search query, show search results; otherwise show paginated list
  const displayTransactions: EnrichedTransaction[] = search.trim()
    ? (searchResults ?? [])
    : transactions
  const isSearching = !!search.trim()
  const isLoading = isSearching ? searchLoading : loading

  const handleRowClick = (tx: EnrichedTransaction) => {
    openSidePanel(tx.id)
  }

  if (error) {
    return (
      <div className="p-[28px] text-[12px] text-[var(--color-red)]">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--color-bg)]">
            <tr className="border-b border-[var(--color-border)]">
              {COLUMNS.map((h, i) => (
                <th
                  key={h}
                  className="px-[14px] py-[8px] text-[10px] font-[600] text-[var(--color-text-tertiary)] tracking-[0.06em] uppercase whitespace-nowrap"
                  style={{ textAlign: i === COLUMNS.length - 1 ? 'right' : 'left' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayTransactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                selected={selectedTransactionId === tx.id}
                onClick={handleRowClick}
              />
            ))}
          </tbody>
        </table>

        {isLoading && (
          <div className="flex justify-center py-[24px]">
            <span className="text-[12px] text-[var(--color-text-tertiary)]">Loading…</span>
          </div>
        )}

        {!isLoading && displayTransactions.length === 0 && (
          <EmptyState
            icon="⊞"
            title={isSearching ? 'No results found' : 'No transactions'}
            description={isSearching
              ? `No transactions match "${search}"`
              : 'Import a CSV to get started'
            }
          />
        )}

        {/* Load more (only for non-search mode) */}
        {!isSearching && !isLoading && transactions.length < total && (
          <div className="flex justify-center py-[16px]">
            <button
              onClick={loadNextPage}
              className="text-[12px] text-[var(--color-accent)] hover:opacity-80 cursor-pointer bg-transparent border-none"
            >
              Load more ({total - transactions.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
