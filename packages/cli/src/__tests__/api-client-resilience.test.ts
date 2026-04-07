import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CurlTicketClient, NetworkError, TimeoutError, RateLimitError } from '../api-client.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  } as unknown as Response
}

describe('CurlTicketClient resilience', () => {
  let client: CurlTicketClient

  beforeEach(() => {
    mockFetch.mockReset()
    client = new CurlTicketClient({ url: 'https://example.com', token: 'test-token' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('timeout', () => {
    it('throws TimeoutError when AbortSignal times out', async () => {
      const err = new DOMException('The operation was aborted.', 'TimeoutError')
      mockFetch.mockRejectedValue(err)

      await expect(client.getProjects()).rejects.toThrow(TimeoutError)
      await expect(client.getProjects()).rejects.toThrow(/timed out/)
    })
  })

  describe('network error retry', () => {
    it('retries GET on NetworkError and succeeds', async () => {
      const response = jsonResponse({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }
      })
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(response)

      const result = await client.getProjects()
      expect(result.data).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('does NOT retry POST on NetworkError', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))

      await expect(client.createProject({ name: 'Test', key: 'T' })).rejects.toThrow(NetworkError)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('rate limit (429)', () => {
    it('retries after Retry-After header', async () => {
      vi.useFakeTimers()
      const rateLimitResponse = jsonResponse({}, 429, { 'Retry-After': '1' })
      const successResponse = jsonResponse({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }
      })

      mockFetch.mockResolvedValueOnce(rateLimitResponse).mockResolvedValueOnce(successResponse)

      const promise = client.getProjects()
      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result.data).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })

    it('throws RateLimitError when Retry-After exceeds max', async () => {
      const rateLimitResponse = jsonResponse({}, 429, { 'Retry-After': '120' })
      mockFetch.mockResolvedValue(rateLimitResponse)

      await expect(client.getProjects()).rejects.toThrow(RateLimitError)
      await expect(client.getProjects()).rejects.toThrow(/exceeds maximum wait time/)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('uses default 5s wait when no Retry-After header', async () => {
      vi.useFakeTimers()
      const rateLimitResponse = jsonResponse({}, 429)
      const successResponse = jsonResponse({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 }
      })

      mockFetch.mockResolvedValueOnce(rateLimitResponse).mockResolvedValueOnce(successResponse)

      const promise = client.getProjects()
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(result.data).toEqual([])
      vi.useRealTimers()
    })
  })
})
