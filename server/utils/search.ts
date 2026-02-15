const MAX_SEARCH_LENGTH = 200

/**
 * 清理搜尋查詢：trim + 截斷長度，統一處理非字串輸入。
 */
export function sanitizeSearchQuery(raw: unknown): string {
  return (typeof raw === 'string' ? raw.trim() : '').slice(0, MAX_SEARCH_LENGTH)
}

/**
 * 跳脫 SQL LIKE / ILIKE 的萬用字元（% 和 _），
 * 避免使用者輸入這些字元時產生非預期的匹配行為。
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}
