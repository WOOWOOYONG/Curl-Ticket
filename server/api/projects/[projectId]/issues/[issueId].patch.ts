import { and, eq } from 'drizzle-orm'
import { issues, notifications } from '~~/server/database/schema'
import { updateIssueSchema, API_BUG_ONLY_FIELDS } from '~~/shared/schemas'
import { IssueType, NotificationType } from '~~/shared/constants'
import { badRequest, notFound } from '~~/server/utils/errors'
import { validateBody } from '~~/server/utils/validate'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { assertAssigneeAllowed } from '~~/server/utils/issue-assignee'
import { buildProtectedIssueResponse } from '~~/server/utils/protected-issue'

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

  const data = await validateBody(event, updateIssueSchema)

  if (Object.keys(data).length === 0) {
    badRequest('No fields to update')
  }

  // Validate assignee outside the transaction (the check only depends on project membership).
  if (data.assigneeId !== undefined) {
    await assertAssigneeAllowed(db, projectId, data.assigneeId)
  }

  const updatedIssue = await db.transaction(async (tx) => {
    // Lock issue row to avoid race conditions between read/check and update.
    const [existing] = await tx
      .select({
        issueType: issues.issueType,
        status: issues.status,
        assigneeId: issues.assigneeId,
        createdBy: issues.createdBy,
        projectKey: issues.projectKey,
        issueNumber: issues.issueNumber
      })
      .from(issues)
      .where(and(eq(issues.id, Number(issueId)), eq(issues.projectId, projectId)))
      .for('update')

    if (!existing) {
      notFound('Issue not found')
    }

    // Reject API-only fields for task type
    if (existing.issueType === IssueType.Task) {
      const invalidFields = API_BUG_ONLY_FIELDS.filter((f) => data[f] !== undefined)
      if (invalidFields.length > 0) {
        badRequest(`Cannot set API fields on a Task issue: ${invalidFields.join(', ')}`)
      }
    }

    const [updated] = await tx
      .update(issues)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(issues.id, Number(issueId)), eq(issues.projectId, projectId)))
      .returning()

    if (!updated) {
      notFound('Issue not found')
    }

    if (
      data.status !== undefined &&
      existing.status !== updated.status &&
      existing.createdBy &&
      existing.createdBy !== userId
    ) {
      await tx.insert(notifications).values({
        userId: existing.createdBy,
        issueId: updated.id,
        type: NotificationType.IssueUpdate,
        title: `Issue ${existing.projectKey}-${existing.issueNumber} status updated`,
        content: `${existing.status} → ${updated.status}`
      })
    }

    if (
      data.assigneeId !== undefined &&
      updated.assigneeId &&
      updated.assigneeId !== existing.assigneeId &&
      updated.assigneeId !== userId
    ) {
      await tx.insert(notifications).values({
        userId: updated.assigneeId,
        issueId: updated.id,
        type: NotificationType.IssueUpdate,
        title: `Issue ${existing.projectKey}-${existing.issueNumber} assigned to you`,
        content: updated.title
      })
    }

    return updated
  })

  return buildProtectedIssueResponse(db, updatedIssue, project, getRequestURL(event).origin)
})
