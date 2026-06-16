import { and, eq } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { isUniqueViolation, MAX_CREATE_ATTEMPTS } from '~~/server/constants'
import { badRequest, internalServerError, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { parseIssueId } from '~~/server/utils/route-params'
import {
  buildPublicShareStatus,
  canShareIssue,
  generateShareToken
} from '~~/server/utils/public-issue'

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

  let sharedIssue:
    | Pick<typeof issues.$inferSelect, 'publicShareToken' | 'publicSharedAt'>
    | undefined
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const nextSharedAt = new Date()
    const nextToken = generateShareToken()

    try {
      sharedIssue = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            issueType: issues.issueType,
            method: issues.method,
            url: issues.url
          })
          .from(issues)
          .where(and(eq(issues.id, parsedIssueId), eq(issues.projectId, projectId)))
          .for('update')

        if (!existing) {
          notFound('Issue not found')
        }

        if (!canShareIssue(existing)) {
          badRequest('Only API Bug issues can be shared publicly')
        }

        const [updated] = await tx
          .update(issues)
          .set({
            publicShareToken: nextToken,
            publicSharedAt: nextSharedAt,
            updatedAt: nextSharedAt
          })
          .where(and(eq(issues.id, parsedIssueId), eq(issues.projectId, projectId)))
          .returning({
            publicShareToken: issues.publicShareToken,
            publicSharedAt: issues.publicSharedAt
          })

        if (!updated) {
          notFound('Issue not found')
        }

        return updated
      })
      break
    } catch (error) {
      lastError = error
      if (isUniqueViolation(error) && attempt < MAX_CREATE_ATTEMPTS) {
        continue
      }
      throw error
    }
  }

  if (!sharedIssue) {
    internalServerError('Failed to enable public sharing', lastError)
  }

  return buildPublicShareStatus(sharedIssue, getRequestURL(event).origin)
})
