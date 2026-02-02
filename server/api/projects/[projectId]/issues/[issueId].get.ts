import { eq, and } from 'drizzle-orm'
import { projects, issues } from '../../../../database/schema'

export default defineEventHandler(async (event) => {
  // 1. 取得路由參數
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  if (!issueId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Issue ID is required'
    })
  }

  const db = useDB()

  // 2. 驗證專案存在
  const [project] = await db
    .select({ id: projects.id, key: projects.key })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

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
    throw createError({
      statusCode: 404,
      statusMessage: 'Issue not found'
    })
  }

  // 4. 回傳完整的 Issue 資料
  return {
    data: issue,
    friendlyId: `${project.key}-${issue.issueNumber}`
  }
})
