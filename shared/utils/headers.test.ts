import { describe, expect, it } from 'vitest'
import { maskHeaderValue, maskHeaders } from './headers'

describe('shared header masking', () => {
  it('masks sensitive header values before public responses', () => {
    expect(maskHeaderValue('Authorization', 'Bearer secret-token')).toBe('Bearer ******')
    expect(maskHeaderValue('X-Password', 'super-secret')).toBe('******')
  })

  it('preserves non-sensitive headers', () => {
    expect(maskHeaderValue('Content-Type', 'application/json')).toBe('application/json')
  })

  it('masks a header record without mutating the input', () => {
    const headers = {
      Authorization: 'Bearer secret-token',
      Accept: 'application/json'
    }

    expect(maskHeaders(headers)).toEqual({
      Authorization: 'Bearer ******',
      Accept: 'application/json'
    })
    expect(headers.Authorization).toBe('Bearer secret-token')
  })
})
