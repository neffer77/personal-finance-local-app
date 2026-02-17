import Papa from 'papaparse'
import { ParserInterface, ParsedRow } from './parser.interface'

// Chase CSV headers (case-insensitive matching)
const CHASE_HEADERS = [
  'transaction date',
  'post date',
  'description',
  'category',
  'type',
  'amount',
]

function parseDate(raw: string): string {
  // Chase exports MM/DD/YYYY — convert to YYYY-MM-DD
  const parts = raw.trim().split('/')
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: "${raw}"`)
  }
  const [month, day, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseDollars(raw: string): number {
  // Chase amounts are decimal dollars; convert to integer cents
  const cleaned = raw.trim().replace(/[$,]/g, '')
  const dollars = parseFloat(cleaned)
  if (isNaN(dollars)) {
    throw new Error(`Invalid amount: "${raw}"`)
  }
  // Round to avoid floating point artifacts (e.g. 87.43 * 100 = 8742.999...)
  return Math.round(dollars * 100)
}

export class ChaseParser implements ParserInterface {
  issuer = 'chase'

  detectFormat(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return CHASE_HEADERS.every((required) => normalized.includes(required))
  }

  parse(csvContent: string): ParsedRow[] {
    const result = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (result.errors.length > 0) {
      const fatal = result.errors.filter((e) => e.type === 'Delimiter' || e.type === 'FieldMismatch')
      if (fatal.length > 0) {
        throw new Error(`CSV parse errors: ${fatal.map((e) => e.message).join(', ')}`)
      }
    }

    // Normalize header keys (case-insensitive)
    const normalizeKey = (key: string) => key.toLowerCase().trim()
    const rows = result.data.map((row) => {
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        normalized[normalizeKey(k)] = v
      }
      return normalized
    })

    // Track seen raw signatures within this CSV to handle same-day duplicates
    const seenSignatures = new Map<string, number>()

    const parsed: ParsedRow[] = []
    for (const row of rows) {
      const rawDate = row['transaction date'] ?? ''
      const rawPosted = row['post date'] ?? ''
      const description = (row['description'] ?? '').trim()
      const originalCategory = (row['category'] ?? '').trim()
      const type = (row['type'] ?? '').trim()
      const rawAmount = row['amount'] ?? ''
      const memo = (row['memo'] ?? '').trim()

      // Skip rows without required fields
      if (!rawDate || !description || !rawAmount) continue

      let transactionDate: string
      let postedDate: string
      let amountCents: number

      try {
        transactionDate = parseDate(rawDate)
        postedDate = parseDate(rawPosted || rawDate)
        amountCents = parseDollars(rawAmount)
      } catch {
        // Skip malformed rows
        continue
      }

      // Detect returns: positive amount or type contains "Return"
      const isReturn = amountCents > 0 || type.toLowerCase().includes('return')

      // Track duplicate raw signatures within this file
      const sig = `${transactionDate}|${description}|${amountCents}|${type}`
      const count = (seenSignatures.get(sig) ?? 0) + 1
      seenSignatures.set(sig, count)

      parsed.push({
        transactionDate,
        postedDate,
        description,
        originalCategory,
        type,
        amountCents,
        memo,
        isReturn,
      })
    }

    return parsed
  }
}

export const chaseParser = new ChaseParser()
