import { describe, it, expect, vi, beforeAll } from 'vitest'
import { formatDate } from './date'

beforeAll(() => {
  // useDateFormat is a Nuxt auto-import (global) from VueUse
  vi.stubGlobal('useDateFormat', (date: Date | string, format: string) => ({
    value: (() => {
      const d = new Date(date)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      if (format === 'YYYY/MM/DD HH:mm') {
        return `${y}/${m}/${day} ${h}:${min}`
      }
      return ''
    })()
  }))
})

describe('formatDate', () => {
  it('formats a Date object correctly', () => {
    const date = new Date(2023, 9, 24, 14, 20)
    const result = formatDate(date)
    expect(result).toBe('Oct 24, 2023 • 14:20')
  })

  it('formats an ISO date string correctly', () => {
    const result = formatDate('2023-10-24T14:20:00')
    expect(result).toBe('Oct 24, 2023 • 14:20')
  })

  it('pads single-digit hours and minutes', () => {
    const date = new Date(2024, 0, 5, 3, 7)
    const result = formatDate(date)
    expect(result).toBe('Jan 5, 2024 • 03:07')
  })

  it('handles midnight', () => {
    const date = new Date(2024, 5, 15, 0, 0)
    const result = formatDate(date)
    expect(result).toBe('Jun 15, 2024 • 00:00')
  })

  it('handles end of day', () => {
    const date = new Date(2024, 11, 31, 23, 59)
    const result = formatDate(date)
    expect(result).toBe('Dec 31, 2024 • 23:59')
  })
})

describe('formatDateTime', () => {
  it('formats date as YYYY/MM/DD HH:mm', async () => {
    const { formatDateTime } = await import('./date')
    const date = new Date(2024, 2, 15, 9, 30)
    const result = formatDateTime(date)
    expect(result).toBe('2024/03/15 09:30')
  })

  it('formats a string date', async () => {
    const { formatDateTime } = await import('./date')
    const result = formatDateTime('2023-12-25T18:45:00')
    expect(result).toBe('2023/12/25 18:45')
  })
})
