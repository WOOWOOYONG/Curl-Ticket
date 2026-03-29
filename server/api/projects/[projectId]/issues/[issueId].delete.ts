import { and, eq } from 'drizzle-orm'
import { issues } from '~~/server/database/schema'
import { badRequest, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { getProjectIssue } from '~~/server/utils/comment-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId || !issueId) {
    badRequest('Project ID and Issue ID are required')
  }

  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)
  const issue = await getProjectIssue(db, projectId, issueId)

  if (issue.createdBy !== userId && project.ownerId !== userId) {
    forbidden('Only the issue creator or project owner can delete this issue')
  }

  await db
    .delete(issues)
    .where(and(eq(issues.id, Number(issueId)), eq(issues.projectId, projectId)))

  return { success: true }
})
