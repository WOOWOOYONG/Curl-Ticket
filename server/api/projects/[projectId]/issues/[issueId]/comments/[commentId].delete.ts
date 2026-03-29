import { eq } from 'drizzle-orm'
import { issueComments } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import {
  getProjectIssue,
  getIssueComment,
  assertCommentAuthor
} from '~~/server/utils/comment-access'

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
  await getProjectIssue(db, projectId, issueId)
  const comment = await getIssueComment(db, issueId, commentId)
  assertCommentAuthor(comment, userId, 'delete')

  await db.delete(issueComments).where(eq(issueComments.id, comment.id))

  return { success: true }
})
