import { Environment } from '~~/shared/constants'
import { maskHeaderValue } from '~~/shared/utils/headers'

/**
 * Convert request headers object to array for display
 * @param headers - Request headers object
 * @returns Array of { key, value } pairs
 */
export function toHeadersArray(headers: Record<string, string> | null | undefined) {
  if (!headers) return []
  return Object.entries(headers).map(([key, value]) => ({ key, value }))
}

/**
 * Mask sensitive header values for display
 * @param key - Header key name
 * @param value - Header value
 * @returns Masked value if sensitive, otherwise original value
 */
export function maskValue(key: string, value: string): string {
  return maskHeaderValue(key, value)
}

/**
 * Calculate human-readable payload size from data
 * @param data - Request body data
 * @returns Formatted size string (e.g., '128 B', '1.5 KB') or null if no data
 */
export function formatPayloadSize(data: unknown): string | null {
  if (!data) return null
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  const bytes = new Blob([str]).size
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/**
 * Format JSON data for display
 * @param data - Data to format
 * @returns Formatted JSON string
 */
export function formatJson(data: unknown): string {
  if (!data) return ''
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

/**
 * Calculate lines from JSON data for line number display
 * @param data - Data to get lines from
 * @returns Array of lines
 */
export function getJsonLines(data: unknown): string[] {
  const formatted = formatJson(data)
  return formatted.split('\n')
}

/**
 * Build a cURL command string from issue data
 * @param issue - Issue object with method, url, headers, and body
 * @returns cURL command string
 */
export function buildCurlCommand(issue: {
  method: string
  url: string
  requestHeaders?: Record<string, string> | null
  requestBody?: unknown
}): string {
  let cmd = `curl -X ${issue.method} '${issue.url}'`
  if (issue.requestHeaders) {
    for (const [key, value] of Object.entries(issue.requestHeaders)) {
      cmd += ` -H '${key}: ${value}'`
    }
  }
  if (issue.requestBody) {
    cmd += ` -d '${JSON.stringify(issue.requestBody)}'`
  }
  return cmd
}

/**
 * Auto-detect environment from URL hostname
 * @param url - Full URL string
 * @returns Detected environment string
 */
export function detectEnvironment(url: string): Environment {
  try {
    const urlObj = new URL(url)
    const host = urlObj.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return Environment.Local
    }
    if (host.includes('staging') || host.includes('stg')) {
      return Environment.Staging
    }
    if (host.includes('dev') || host.includes('development')) {
      return Environment.Dev
    }
    if (host.includes('prod') || host.includes('production') || !host.includes('.')) {
      return Environment.Prod
    }
  } catch {
    // Invalid URL, keep default
  }
  return Environment.Dev
}
