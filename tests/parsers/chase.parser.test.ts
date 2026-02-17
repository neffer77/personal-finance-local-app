import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { ChaseParser } from '../../src/main/parsers/chase.parser'

const FIXTURE = fs.readFileSync(path.join(__dirname, '../fixtures/chase-sample.csv'), 'utf-8')

describe('ChaseParser', () => {
  const parser = new ChaseParser()

  it('detects Chase CSV format from headers', () => {
    const headers = ['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount', 'Memo']
    expect(parser.detectFormat(headers)).toBe(true)
  })

  it('rejects non-Chase headers', () => {
    const headers = ['Date', 'Payee', 'Amount', 'Balance']
    expect(parser.detectFormat(headers)).toBe(false)
  })

  it('parses 7 rows from fixture', () => {
    const rows = parser.parse(FIXTURE)
    expect(rows).toHaveLength(7)
  })

  it('converts amounts to cents', () => {
    const rows = parser.parse(FIXTURE)
    const wholeFoods = rows.find((r) => r.description.includes('WHOLE FOODS'))
    expect(wholeFoods?.amountCents).toBe(-8743)
  })

  it('marks returns as positive and isReturn=true', () => {
    const rows = parser.parse(FIXTURE)
    const nordstrom = rows.find((r) => r.description.includes('NORDSTROM'))
    expect(nordstrom?.amountCents).toBe(4599)
    expect(nordstrom?.isReturn).toBe(true)
  })

  it('converts MM/DD/YYYY to YYYY-MM-DD', () => {
    const rows = parser.parse(FIXTURE)
    expect(rows[0].transactionDate).toBe('2026-02-15')
    expect(rows[0].postedDate).toBe('2026-02-16')
  })

  it('handles Payment type', () => {
    const rows = parser.parse(FIXTURE)
    const payment = rows.find((r) => r.type === 'Payment')
    expect(payment).toBeDefined()
    expect(payment?.amountCents).toBe(184732)
    expect(payment?.isReturn).toBe(true)
  })

  it('parses two identical same-day transactions without error', () => {
    const rows = parser.parse(FIXTURE)
    const starbucks = rows.filter((r) => r.description === 'STARBUCKS #12345 ENCINITAS CA' && r.transactionDate === '2026-02-11')
    expect(starbucks).toHaveLength(2)
    expect(starbucks[0].amountCents).toBe(-543)
    expect(starbucks[1].amountCents).toBe(-543)
  })
})
