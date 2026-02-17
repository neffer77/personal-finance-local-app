import { describe, it, expect } from 'vitest'
import { formatCents, formatDate, formatMonth, monthStartEnd, currentMonth } from '../../src/renderer/lib/format'

describe('formatCents', () => {
  it('formats positive cents as dollars', () => {
    expect(formatCents(4299)).toBe('$42.99')
  })

  it('formats negative cents with leading minus', () => {
    expect(formatCents(-8743)).toBe('-$87.43')
  })

  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00')
  })

  it('formats large amounts with commas', () => {
    expect(formatCents(123456789)).toBe('$1,234,567.89')
  })

  it('pads single-digit cents', () => {
    expect(formatCents(501)).toBe('$5.01')
  })
})

describe('formatDate', () => {
  it('formats YYYY-MM-DD to readable date', () => {
    expect(formatDate('2026-02-15')).toBe('Feb 15, 2026')
  })
})

describe('formatMonth', () => {
  it('formats YYYY-MM to full month name', () => {
    expect(formatMonth('2026-02')).toBe('February 2026')
  })
})

describe('monthStartEnd', () => {
  it('returns correct start and end for February 2026', () => {
    const { from, to } = monthStartEnd('2026-02')
    expect(from).toBe('2026-02-01')
    expect(to).toBe('2026-02-28')
  })

  it('handles months with 31 days', () => {
    const { from, to } = monthStartEnd('2026-01')
    expect(from).toBe('2026-01-01')
    expect(to).toBe('2026-01-31')
  })
})

describe('currentMonth', () => {
  it('returns YYYY-MM format', () => {
    const result = currentMonth()
    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })
})
