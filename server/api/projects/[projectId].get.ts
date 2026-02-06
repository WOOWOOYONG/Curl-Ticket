import { eq, count, sql } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { IssueStatus } from '~~/shared/constants'
import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)

  // 取得 Issue 統計
  const [stats] = await db
    .select({
      totalIssues: count(issues.id),
      openIssues: sql<number>`count(case when ${issues.status} = ${IssueStatus.Open} then 1 end)`
    })
    .from(issues)
    .where(eq(issues.projectId, projectId))

  return {
    data: {
      ...project,
      totalIssues: stats?.totalIssues ?? 0,
      openIssues: stats?.openIssues ?? 0
    }
  }
})
