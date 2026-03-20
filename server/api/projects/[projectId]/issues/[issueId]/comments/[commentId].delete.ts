import { and, eq } from 'drizzle-orm'
import { issueComments, issues } from '~~/server/database/schema'
import { badRequest, forbidden, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')
  const commentId = getRouterParam(event, 'commentId')

  if (!projectId || !issueId || !commentId) {
    badRequest('Project ID, Issue ID, and Comment ID are required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  await getAccessibleProject(db, projectId, userId)

  // Verify issue belongs to this project
  const [issue] = await db
    .select({ id: issues.id })
    .from(issues)
    .where(
      and(
        eq(issues.id, Number(issueId)),
        eq(issues.projectId, projectId)
      )
    )
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  const [comment] = await db
    .select({ id: issueComments.id, authorId: issueComments.authorId })
    .from(issueComments)
    .where(
      and(
        eq(issueComments.id, Number(commentId)),
        eq(issueComments.issueId, Number(issueId))
      )
    )
    .limit(1)

  if (!comment) {
    notFound('Comment not found')
  }

  if (comment.authorId !== userId) {
    forbidden('You can only delete your own comments')
  }

  await db
    .delete(issueComments)
    .where(eq(issueComments.id, Number(commentId)))

  return { success: true }
})
