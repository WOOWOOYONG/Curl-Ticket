import { describe, it, expect } from 'vitest'
import { sanitizeSearchQuery, escapeLikePattern } from './search'

describe('sanitizeSearchQuery', () => {
  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  hello  ')).toBe('hello')
  })

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300)
    expect(sanitizeSearchQuery(long)).toHaveLength(200)
  })

  it('trims before truncating', () => {
    const input = '  ' + 'a'.repeat(300) + '  '
    const result = sanitizeSearchQuery(input)
    expect(result).toHaveLength(200)
    expect(result).toBe('a'.repeat(200))
  })

  it('returns empty string for null', () => {
    expect(sanitizeSearchQuery(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(sanitizeSearchQuery(undefined)).toBe('')
  })

  it('returns empty string for number', () => {
    expect(sanitizeSearchQuery(123)).toBe('')
  })

  it('returns empty string for boolean', () => {
    expect(sanitizeSearchQuery(true)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(sanitizeSearchQuery('')).toBe('')
  })

  it('returns empty string for whitespace-only string', () => {
    expect(sanitizeSearchQuery('   ')).toBe('')
  })
})

describe('escapeLikePattern', () => {
  it('escapes % characters', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
  })

  it('escapes _ characters', () => {
    expect(escapeLikePattern('user_name')).toBe('user\\_name')
  })

  it('escapes multiple occurrences', () => {
    expect(escapeLikePattern('%foo%_bar_')).toBe('\\%foo\\%\\_bar\\_')
  })

  it('returns plain string unchanged', () => {
    expect(escapeLikePattern('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(escapeLikePattern('')).toBe('')
  })
})
