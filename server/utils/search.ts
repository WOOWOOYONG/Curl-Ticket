/**
 * 跳脫 SQL LIKE / ILIKE 的萬用字元（% 和 _），
 * 避免使用者輸入這些字元時產生非預期的匹配行為。
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}
