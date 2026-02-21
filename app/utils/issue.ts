import { Environment, type Environment as EnvironmentType } from '~~/shared/constants'

/**
 * Mask sensitive header values for display
 * @param key - Header key name
 * @param value - Header value
 * @returns Masked value if sensitive, otherwise original value
 */
export function maskValue(key: string, value: string): string {
  const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'token', 'secret']
  if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
    const prefix = value.split(' ')[0]
    if (prefix && value.length > prefix.length + 6) {
      return `${prefix} ${'*'.repeat(6)}`
    }
    return '*'.repeat(6)
  }
  return value
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
export function detectEnvironment(url: string): EnvironmentType {
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
