import { describe, it, expect } from 'vitest'
import { maskValue, formatJson, formatPayloadSize, getJsonLines, buildCurlCommand, detectEnvironment } from './issue'

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

describe('formatPayloadSize', () => {
  it('returns null for null data', () => {
    expect(formatPayloadSize(null)).toBeNull()
  })

  it('returns null for undefined data', () => {
    expect(formatPayloadSize(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(formatPayloadSize('')).toBeNull()
  })

  it('returns bytes for small string payload', () => {
    expect(formatPayloadSize('hello')).toBe('5 B')
  })

  it('returns bytes for small object payload', () => {
    const result = formatPayloadSize({ a: 1 })
    expect(result).toBe(`${new Blob(['{"a":1}']).size} B`)
  })

  it('returns KB for payload >= 1024 bytes', () => {
    const data = 'x'.repeat(1024)
    expect(formatPayloadSize(data)).toBe('1.0 KB')
  })

  it('returns KB with one decimal for larger payloads', () => {
    const data = 'x'.repeat(2560)
    expect(formatPayloadSize(data)).toBe('2.5 KB')
  })

  it('handles string data directly without double-encoding', () => {
    const str = '{"key":"value"}'
    expect(formatPayloadSize(str)).toBe(`${new Blob([str]).size} B`)
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

describe('detectEnvironment', () => {
  it('returns Local for localhost', () => {
    expect(detectEnvironment('http://localhost:3000/api')).toBe('Local')
  })

  it('returns Local for 127.0.0.1', () => {
    expect(detectEnvironment('http://127.0.0.1:8080/test')).toBe('Local')
  })

  it('returns Local for 192.168.x.x', () => {
    expect(detectEnvironment('http://192.168.1.100:3000/api')).toBe('Local')
  })

  it('returns Staging for staging.example.com', () => {
    expect(detectEnvironment('https://staging.example.com/api')).toBe('Staging')
  })

  it('returns Staging for api.stg.example.com', () => {
    expect(detectEnvironment('https://api.stg.example.com/v1')).toBe('Staging')
  })

  it('returns Dev for dev.example.com', () => {
    expect(detectEnvironment('https://dev.example.com/api')).toBe('Dev')
  })

  it('returns Dev for api.development.example.com', () => {
    expect(detectEnvironment('https://api.development.example.com/v1')).toBe('Dev')
  })

  it('returns Prod for prod.example.com', () => {
    expect(detectEnvironment('https://prod.example.com/api')).toBe('Prod')
  })

  it('returns Prod for api.production.example.com', () => {
    expect(detectEnvironment('https://api.production.example.com/v1')).toBe('Prod')
  })

  it('returns Dev as fallback for invalid URL', () => {
    expect(detectEnvironment('not-a-url')).toBe('Dev')
  })

  it('returns Dev as fallback for empty string', () => {
    expect(detectEnvironment('')).toBe('Dev')
  })
})
