import { eq, and } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { badRequest, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  // 1. 取得路由參數
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  if (!issueId) {
    badRequest('Issue ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)

  // 3. 查詢 Issue 詳細資料（確保屬於該專案）
  const [issue] = await db
    .select()
    .from(issues)
    .where(
      and(
        eq(issues.id, Number(issueId)),
        eq(issues.projectId, projectId)
      )
    )
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  // 4. 回傳完整的 Issue 資料
  return {
    data: issue,
    friendlyId: `${project.key}-${issue.issueNumber}`
  }
})
