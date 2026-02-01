import type { SQL } from 'drizzle-orm'
import { eq, desc, count, and } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { IssueStatus, type IssueStatus as IssueStatusType, type Environment } from '~~/shared/constants'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const db = useDB()

  // Extract query parameters
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const status = query.status as IssueStatusType | undefined
  const environment = query.environment as Environment | undefined

  const offset = (page - 1) * pageSize

  // Build filter conditions
  const conditions: SQL[] = [eq(issues.projectId, projectId)]

  if (status && Object.values(IssueStatus).includes(status)) {
    conditions.push(eq(issues.status, status))
  }

  if (environment) {
    conditions.push(eq(issues.environment, environment))
  }

  const whereClause = and(...conditions)

  // Fetch issues and total count in parallel
  const [issuesList, totalResult] = await Promise.all([
    db
      .select({
        id: issues.id,
        issueNumber: issues.issueNumber,
        projectKey: issues.projectKey,
        title: issues.title,
        method: issues.method,
        url: issues.url,
        environment: issues.environment,
        status: issues.status,
        responseStatus: issues.responseStatus,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt
      })
      .from(issues)
      .where(whereClause)
      .orderBy(desc(issues.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(issues)
      .where(whereClause)
  ])

  const total = totalResult[0]?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    data: issuesList,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  }
})
