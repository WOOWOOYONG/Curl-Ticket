/**
 * Check if a string contains HTML tags.
 */
export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content)
}
