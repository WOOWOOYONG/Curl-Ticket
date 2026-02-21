import { describe, it, expect } from 'vitest'
import { getHttpMethodColor } from './http'

describe('getHttpMethodColor', () => {
  it('returns success for GET', () => {
    expect(getHttpMethodColor('GET')).toBe('success')
  })

  it('returns primary for POST', () => {
    expect(getHttpMethodColor('POST')).toBe('primary')
  })

  it('returns warning for PUT', () => {
    expect(getHttpMethodColor('PUT')).toBe('warning')
  })

  it('returns warning for PATCH', () => {
    expect(getHttpMethodColor('PATCH')).toBe('warning')
  })

  it('returns error for DELETE', () => {
    expect(getHttpMethodColor('DELETE')).toBe('error')
  })

  it('returns neutral for HEAD', () => {
    expect(getHttpMethodColor('HEAD')).toBe('neutral')
  })

  it('returns neutral for OPTIONS', () => {
    expect(getHttpMethodColor('OPTIONS')).toBe('neutral')
  })

  it('returns warning as fallback for unknown method', () => {
    expect(getHttpMethodColor('UNKNOWN')).toBe('warning')
  })

  it('returns warning as fallback for empty string', () => {
    expect(getHttpMethodColor('')).toBe('warning')
  })
})
