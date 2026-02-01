import { eq, count, sql } from 'drizzle-orm'
import { projects, issues } from '../../database/schema'
import { IssueStatus } from '~~/shared/constants'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const db = useDB()

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1)

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  // 取得 Issue 統計
  const [stats] = await db
    .select({
      totalIssues: count(issues.id),
      openIssues: sql<number>`count(case when ${issues.status} = ${IssueStatus.Open} then 1 end)`
    })
    .from(issues)
    .where(eq(issues.projectId, id))

  return {
    data: {
      ...project,
      totalIssues: stats?.totalIssues ?? 0,
      openIssues: stats?.openIssues ?? 0
    }
  }
})
