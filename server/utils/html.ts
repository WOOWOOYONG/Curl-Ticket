import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p', 'strong', 'em', 's', 'code', 'pre', 'ul', 'ol', 'li',
  'blockquote', 'a', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
]

const ALLOWED_ATTR = ['href', 'target', 'rel']

/**
 * Sanitize HTML content using DOMPurify, only allowing safe tags and attributes.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR
  })
}

/**
 * Strip all HTML tags from a string, returning plain text.
 */
export function stripHtmlTags(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim()
}
