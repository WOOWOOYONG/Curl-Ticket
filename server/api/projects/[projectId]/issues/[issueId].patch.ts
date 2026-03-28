import { and, eq } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { updateIssueSchema, API_BUG_ONLY_FIELDS } from '~~/shared/schemas'
import { IssueType } from '~~/shared/constants'
import { badRequest, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
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

  const body = await readBody(event)
  const result = updateIssueSchema.safeParse(body)

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  if (Object.keys(result.data).length === 0) {
    badRequest('No fields to update')
  }

  // Fetch existing issue to check type
  const [existing] = await db
    .select({ issueType: issues.issueType })
    .from(issues)
    .where(
      and(
        eq(issues.id, Number(issueId)),
        eq(issues.projectId, projectId)
      )
    )

  if (!existing) {
    notFound('Issue not found')
  }

  // Reject API-only fields for task type
  if (existing.issueType === IssueType.Task) {
    const invalidFields = API_BUG_ONLY_FIELDS.filter(f => result.data[f] !== undefined)
    if (invalidFields.length > 0) {
      badRequest(`Cannot set API fields on a Task issue: ${invalidFields.join(', ')}`)
    }
  }

  const [updatedIssue] = await db
    .update(issues)
    .set({
      ...result.data,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(issues.id, Number(issueId)),
        eq(issues.projectId, projectId)
      )
    )
    .returning()

  if (!updatedIssue) {
    notFound('Issue not found')
  }

  return {
    data: updatedIssue,
    friendlyId: `${project.key}-${updatedIssue.issueNumber}`
  }
})
