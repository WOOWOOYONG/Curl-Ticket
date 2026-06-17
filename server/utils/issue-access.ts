import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { issues } from '~~/server/database/schema'
import { badRequest, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { parseIssueId } from '~~/server/utils/route-params'

/**
 * 載入 Registered User 在指定 Project 內可存取的 Issue。
 *
 * 一次完成 Issue 路由共用的前置流程：
 * - 解析並驗證 projectId / issueId 路由參數
 * - 確認使用者對 Project 有存取權（未被軟刪除）
 * - 依 Project 範圍撈出整筆 Issue
 *
 * 回傳已備妥的 db / userId / 參數 / project / issue，讓呼叫端直接進入該路由的核心工作。
 *
 * @throws 400 參數缺漏，或 Issue ID 非正整數
 * @throws 404 Project 不存在或無權限，或 Issue 不存在於該 Project
 */
export async function getAccessibleIssue(event: H3Event) {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  if (!issueId) {
    badRequest('Issue ID is required')
  }

  const parsedIssueId = parseIssueId(issueId)
  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)

  const [issue] = await db
    .select()
    .from(issues)
    .where(and(eq(issues.id, parsedIssueId), eq(issues.projectId, projectId)))
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  return { db, userId, projectId, issueId: parsedIssueId, project, issue }
}
