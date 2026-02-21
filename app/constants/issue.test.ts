import { describe, it, expect } from 'vitest'
import { getHttpStatusCodeColor } from './issue'

describe('getHttpStatusCodeColor', () => {
  it('returns neutral for null', () => {
    expect(getHttpStatusCodeColor(null)).toBe('neutral')
  })

  it('returns neutral for 0 (falsy)', () => {
    expect(getHttpStatusCodeColor(0)).toBe('neutral')
  })

  it('returns success for 200', () => {
    expect(getHttpStatusCodeColor(200)).toBe('success')
  })

  it('returns success for 299', () => {
    expect(getHttpStatusCodeColor(299)).toBe('success')
  })

  it('returns info for 300', () => {
    expect(getHttpStatusCodeColor(300)).toBe('info')
  })

  it('returns info for 399', () => {
    expect(getHttpStatusCodeColor(399)).toBe('info')
  })

  it('returns warning for 400', () => {
    expect(getHttpStatusCodeColor(400)).toBe('warning')
  })

  it('returns warning for 499', () => {
    expect(getHttpStatusCodeColor(499)).toBe('warning')
  })

  it('returns error for 500', () => {
    expect(getHttpStatusCodeColor(500)).toBe('error')
  })

  it('returns error for 599', () => {
    expect(getHttpStatusCodeColor(599)).toBe('error')
  })

  it('returns neutral for 100 (1xx not covered by any range)', () => {
    expect(getHttpStatusCodeColor(100)).toBe('neutral')
  })

  it('returns neutral for 199', () => {
    expect(getHttpStatusCodeColor(199)).toBe('neutral')
  })
})
