import { badRequest } from '~~/server/utils/errors'

/** 解析路由中的 issue ID，必須為正整數，否則回傳 400 */
export function parseIssueId(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    badRequest('Issue ID must be a positive integer')
  }
  return parsed
}
