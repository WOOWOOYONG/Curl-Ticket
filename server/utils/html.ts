/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

const ALLOWED_TAGS = new Set([
  'p', 'strong', 'em', 's', 'code', 'pre', 'ul', 'ol', 'li',
  'blockquote', 'a', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
])

/**
 * Validate that HTML content only contains allowed tags.
 * Returns true if all tags are in the allowlist.
 */
export function isAllowedHtml(html: string): boolean {
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(html)) !== null) {
    if (!ALLOWED_TAGS.has(match[1]!.toLowerCase())) {
      return false
    }
  }
  return true
}
