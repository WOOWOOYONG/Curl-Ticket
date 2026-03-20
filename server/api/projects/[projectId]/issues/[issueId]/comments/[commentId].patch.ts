import { eq } from 'drizzle-orm'
import { issueComments } from '~~/server/database/schema'
import { updateCommentSchema } from '~~/shared/schemas/issue-comment'
import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { getProjectIssue, getIssueComment, assertCommentAuthor } from '~~/server/utils/comment-access'
import { sanitizeHtml } from '~~/server/utils/html'

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
  assertCommentAuthor(comment, userId, 'edit')

  const body = await readBody(event)
  const result = updateCommentSchema.safeParse(body)

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const sanitizedContent = sanitizeHtml(result.data.content)

  const [updated] = await db
    .update(issueComments)
    .set({
      content: sanitizedContent,
      updatedAt: new Date()
    })
    .where(eq(issueComments.id, comment.id))
    .returning()

  const profile = event.context.profile as { name: string | null, email: string }

  return {
    data: {
      ...updated,
      authorName: profile.name ?? null,
      authorEmail: profile.email
    }
  }
})
