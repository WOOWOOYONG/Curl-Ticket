import { describe, it, expect } from 'vitest'
import { formatPagination } from '../formatters.js'
import {
  paginationMultiPage,
  paginationSinglePage,
  paginationEmpty,
  paginationPage2
} from './fixtures.js'

describe('formatPagination', () => {
  it('returns pagination hint for multi-page result', () => {
    const result = formatPagination(paginationMultiPage)
    expect(result).toBe('Showing 1-10 of 42 (page 1/5)')
  })

  it('returns empty string for single page', () => {
    const result = formatPagination(paginationSinglePage)
    expect(result).toBe('')
  })

  it('returns empty string for empty result', () => {
    const result = formatPagination(paginationEmpty)
    expect(result).toBe('')
  })

  it('calculates correct range for page 2', () => {
    const result = formatPagination(paginationPage2)
    expect(result).toBe('Showing 11-20 of 42 (page 2/5)')
  })

  it('caps end at total when on last page', () => {
    const result = formatPagination({
      page: 5,
      pageSize: 10,
      total: 42,
      totalPages: 5
    })
    expect(result).toBe('Showing 41-42 of 42 (page 5/5)')
  })
})
