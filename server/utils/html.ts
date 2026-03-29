import sanitize from 'sanitize-html'

const ALLOWED_TAGS = [
  'p',
  'strong',
  'em',
  's',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6'
]

const ALLOWED_ATTR: Record<string, string[]> = {
  a: ['href', 'target', 'rel']
}

/**
 * Sanitize HTML content, only allowing safe tags and attributes.
 */
export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR
  })
}

/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHtmlTags(html: string): string {
  return sanitize(html, { allowedTags: [], allowedAttributes: {} }).trim()
}
