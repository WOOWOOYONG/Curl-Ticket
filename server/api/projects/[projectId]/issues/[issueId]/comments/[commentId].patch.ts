import { and, eq } from 'drizzle-orm'
import { issueComments, issues } from '~~/server/database/schema'
import { updateCommentSchema } from '~~/shared/schemas/issue-comment'
import { badRequest, forbidden, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
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
    forbidden('You can only edit your own comments')
  }

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
    .where(eq(issueComments.id, Number(commentId)))
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
