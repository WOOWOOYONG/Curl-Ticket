import { and, eq } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { badRequest, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { parseIssueId } from '~~/server/utils/route-params'
import { buildPublicShareStatus } from '~~/server/utils/public-issue'

export default defineEventHandler(async (event) => {
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
  await getAccessibleProject(db, projectId, userId)

  const [updated] = await db
    .update(issues)
    .set({
      publicShareToken: null,
      publicSharedAt: null,
      updatedAt: new Date()
    })
    .where(and(eq(issues.id, parsedIssueId), eq(issues.projectId, projectId)))
    .returning({
      publicShareToken: issues.publicShareToken,
      publicSharedAt: issues.publicSharedAt
    })

  if (!updated) {
    notFound('Issue not found')
  }

  return buildPublicShareStatus(updated, getRequestURL(event).origin)
})
