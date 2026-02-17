export interface ParsedRow {
  transactionDate: string    // YYYY-MM-DD
  postedDate: string         // YYYY-MM-DD
  description: string
  originalCategory: string
  type: string               // "Sale", "Payment", "Return", etc.
  amountCents: number        // integer cents; negative = charge, positive = credit
  memo: string
  isReturn: boolean
}

export interface ParserInterface {
  issuer: string
  parse(csvContent: string): ParsedRow[]
  detectFormat(headers: string[]): boolean
}
