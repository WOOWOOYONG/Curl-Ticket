import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { issues, projects } from '~~/server/database/schema'
import { IssueType } from '~~/shared/constants'
import { notFound } from '~~/server/utils/errors'
import { buildPublicIssueDTO } from '~~/server/utils/public-issue'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const token = getRouterParam(event, 'token')

  if (!token) {
    notFound('Issue not found')
  }

  const db = useDB()
  const [issue] = await db
    .select({
      issueNumber: issues.issueNumber,
      projectKey: issues.projectKey,
      title: issues.title,
      description: issues.description,
      method: issues.method,
      url: issues.url,
      environment: issues.environment,
      requestHeaders: issues.requestHeaders,
      requestBody: issues.requestBody,
      responseStatus: issues.responseStatus,
      responseBody: issues.responseBody,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(
      and(
        eq(issues.publicShareToken, token),
        eq(issues.issueType, IssueType.ApiBug),
        isNotNull(issues.method),
        isNotNull(issues.url),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  return {
    data: buildPublicIssueDTO(issue)
  }
})
