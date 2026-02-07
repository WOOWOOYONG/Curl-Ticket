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
