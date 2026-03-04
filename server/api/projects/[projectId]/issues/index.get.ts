import type { SQL } from 'drizzle-orm'
import { eq, desc, count, and, or, ilike, isNotNull } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { sanitizeSearchQuery, escapeLikePattern } from '~~/server/utils/search'
import { issueQuerySchema } from '~~/shared/schemas/query'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  // Validate and extract query parameters
  const parsed = issueQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    badRequest('Invalid query parameters')
  }
  const { page, pageSize, status, environment, issueType } = parsed.data

  const offset = (page - 1) * pageSize

  // Build filter conditions
  const conditions: SQL[] = [eq(issues.projectId, projectId)]

  if (status) {
    conditions.push(eq(issues.status, status))
  }

  if (environment) {
    conditions.push(eq(issues.environment, environment))
  }

  if (issueType) {
    conditions.push(eq(issues.issueType, issueType))
  }

  const search = sanitizeSearchQuery(parsed.data.search)
  if (search) {
    const escaped = escapeLikePattern(search)
    conditions.push(
      or(
        ilike(issues.title, `%${escaped}%`),
        and(isNotNull(issues.url), ilike(issues.url, `%${escaped}%`))
      )!
    )
  }

  const whereClause = and(...conditions)

  await getAccessibleProject(db, projectId, userId)

  // Fetch issues and total count in parallel
  const [issuesList, totalResult] = await Promise.all([
    db
      .select({
        id: issues.id,
        issueNumber: issues.issueNumber,
        projectKey: issues.projectKey,
        issueType: issues.issueType,
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
