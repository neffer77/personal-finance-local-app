// Category colors — fixed per category for visual consistency across all charts and badges
export const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#16A34A',
  'Food & Drink': '#EA580C',
  'Shopping': '#7C3AED',
  'Gas': '#0891B2',
  'Entertainment': '#DB2777',
  'Bills & Utilities': '#2563EB',
  'Travel': '#CA8A04',
  'Health & Wellness': '#059669',
  'Personal': '#6366F1',
  'Automotive': '#B45309',
  'Education': '#0369A1',
  'Fees & Adjustments': '#64748B',
  'Gifts & Donations': '#EC4899',
  'Home': '#92400E',
  'Insurance': '#1D4ED8',
  'Kids': '#F59E0B',
  'Miscellaneous': '#6B7280',
  'Pets': '#10B981',
  'Professional Services': '#7C3AED',
}

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? '#6B7280'
}

// Keyboard shortcut map (view keys 1-5)
export const VIEW_SHORTCUTS: Record<string, string> = {
  '1': 'transactions',
  '2': 'insights',
  '3': 'recurring',
  '4': 'goals',
  '5': 'reports',
}

export const TRANSACTION_LIMIT = 100
