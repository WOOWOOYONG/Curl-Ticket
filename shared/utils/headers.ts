import { SensitiveHeaderKeywords } from '../constants'

export const MASKED_HEADER_VALUE = '******'

export function isSensitiveHeader(key: string): boolean {
  const normalizedKey = key.toLowerCase()
  return SensitiveHeaderKeywords.some((keyword) => normalizedKey.includes(keyword))
}

export function maskHeaderValue(key: string, value: string): string {
  if (!isSensitiveHeader(key)) return value

  const prefix = value.split(' ')[0]
  if (prefix && value.length > prefix.length + 6) {
    return `${prefix} ${MASKED_HEADER_VALUE}`
  }

  return MASKED_HEADER_VALUE
}

export function maskHeaders(
  headers: Record<string, string> | null | undefined
): Record<string, string> | null {
  if (!headers) return null

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, maskHeaderValue(key, value)])
  )
}
