import { describe, it, expect } from 'vitest'
import { maskValue, formatJson, getJsonLines, buildCurlCommand } from './issue'

describe('maskValue', () => {
  it('masks authorization header values', () => {
    expect(maskValue('Authorization', 'Bearer abc123token')).toBe('Bearer ******')
  })

  it('masks x-api-key header values without space as full asterisks', () => {
    expect(maskValue('X-Api-Key', 'my-secret-api-key')).toBe('******')
  })

  it('masks token header values without space as full asterisks', () => {
    expect(maskValue('X-Token', 'some-long-token-value')).toBe('******')
  })

  it('masks secret header values', () => {
    expect(maskValue('X-Secret', 'prefix supersecretvalue')).toBe('prefix ******')
  })

  it('returns full asterisks when value has no space or is short', () => {
    expect(maskValue('Authorization', 'short')).toBe('******')
  })

  it('is case-insensitive for header key matching', () => {
    expect(maskValue('AUTHORIZATION', 'Bearer longtoken123')).toBe('Bearer ******')
    expect(maskValue('authorization', 'Bearer longtoken123')).toBe('Bearer ******')
  })

  it('does not mask non-sensitive headers', () => {
    expect(maskValue('Content-Type', 'application/json')).toBe('application/json')
    expect(maskValue('Accept', 'text/html')).toBe('text/html')
  })

  it('does not mask headers with partial key matches that are not sensitive', () => {
    expect(maskValue('X-Request-Id', '12345')).toBe('12345')
  })
})

describe('formatJson', () => {
  it('formats an object as pretty-printed JSON', () => {
    const data = { name: 'test', value: 42 }
    expect(formatJson(data)).toBe(JSON.stringify(data, null, 2))
  })

  it('formats nested objects', () => {
    const data = { a: { b: { c: 1 } } }
    expect(formatJson(data)).toBe(JSON.stringify(data, null, 2))
  })

  it('formats arrays', () => {
    const data = [1, 2, 3]
    expect(formatJson(data)).toBe(JSON.stringify(data, null, 2))
  })

  it('returns empty string for null', () => {
    expect(formatJson(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatJson(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatJson('')).toBe('')
  })

  it('handles circular references by returning string representation', () => {
    const obj: Record<string, unknown> = {}
    obj.self = obj
    expect(formatJson(obj)).toBe('[object Object]')
  })
})

describe('getJsonLines', () => {
  it('returns lines from formatted JSON', () => {
    const data = { a: 1, b: 2 }
    const lines = getJsonLines(data)
    expect(lines).toEqual(['{', '  "a": 1,', '  "b": 2', '}'])
  })

  it('returns single-element array for empty data', () => {
    expect(getJsonLines(null)).toEqual([''])
  })

  it('returns correct line count for nested objects', () => {
    const data = { a: { b: 1 } }
    const lines = getJsonLines(data)
    expect(lines.length).toBe(5)
  })
})

describe('buildCurlCommand', () => {
  it('builds a basic curl command with method and url', () => {
    const cmd = buildCurlCommand({ method: 'GET', url: 'https://api.example.com' })
    expect(cmd).toBe('curl -X GET \'https://api.example.com\'')
  })

  it('includes request headers', () => {
    const cmd = buildCurlCommand({
      method: 'POST',
      url: 'https://api.example.com',
      requestHeaders: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      }
    })
    expect(cmd).toContain('-H \'Content-Type: application/json\'')
    expect(cmd).toContain('-H \'Authorization: Bearer token123\'')
  })

  it('includes request body as JSON', () => {
    const body = { name: 'test' }
    const cmd = buildCurlCommand({
      method: 'POST',
      url: 'https://api.example.com',
      requestBody: body
    })
    expect(cmd).toContain(`-d '${JSON.stringify(body)}'`)
  })

  it('omits headers flag when requestHeaders is null', () => {
    const cmd = buildCurlCommand({
      method: 'GET',
      url: 'https://api.example.com',
      requestHeaders: null
    })
    expect(cmd).not.toContain('-H')
  })

  it('omits body flag when requestBody is null', () => {
    const cmd = buildCurlCommand({
      method: 'GET',
      url: 'https://api.example.com',
      requestBody: null
    })
    expect(cmd).not.toContain('-d')
  })

  it('builds complete command with all options', () => {
    const cmd = buildCurlCommand({
      method: 'PUT',
      url: 'https://api.example.com/users/1',
      requestHeaders: { 'Content-Type': 'application/json' },
      requestBody: { name: 'updated' }
    })
    expect(cmd).toBe(
      'curl -X PUT \'https://api.example.com/users/1\' -H \'Content-Type: application/json\' -d \'{"name":"updated"}\''
    )
  })
})
