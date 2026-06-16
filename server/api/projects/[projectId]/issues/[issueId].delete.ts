import { and, eq } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { forbidden } from '~~/server/utils/errors'
import { getAccessibleIssue } from '~~/server/utils/issue-access'

export default defineEventHandler(async (event) => {
  const { db, userId, projectId, issueId, project, issue } = await getAccessibleIssue(event)

  if (issue.createdBy !== userId && project.ownerId !== userId) {
    forbidden('Only the issue creator or project owner can delete this issue')
  }

  await db.delete(issues).where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))

  return { success: true }
})
