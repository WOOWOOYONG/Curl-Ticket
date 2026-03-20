import { eq } from 'drizzle-orm'
import { issueComments, notifications, profiles } from '~~/server/database/schema'
import { createCommentSchema } from '~~/shared/schemas/issue-comment'
import { NotificationType } from '~~/shared/constants'
import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { getProjectIssue } from '~~/server/utils/comment-access'
import { sanitizeHtml, stripHtmlTags } from '~~/server/utils/html'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId || !issueId) {
    badRequest('Project ID and Issue ID are required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  await getAccessibleProject(db, projectId, userId)
  const issue = await getProjectIssue(db, projectId, issueId)

  const body = await readBody(event)
  const result = createCommentSchema.safeParse(body)

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const sanitizedContent = sanitizeHtml(result.data.content)

  const [comment] = await db
    .insert(issueComments)
    .values({
      issueId: Number(issueId),
      authorId: userId,
      content: sanitizedContent
    })
    .returning()

  // Fetch author info for response
  const [author] = await db
    .select({ name: profiles.name, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  // Notify issue creator if commenter is not the creator
  if (issue.createdBy !== userId) {
    const friendlyId = `${issue.projectKey}-${issue.issueNumber}`
    const plainText = stripHtmlTags(result.data.content)
    const preview = plainText.length > 200
      ? `${plainText.slice(0, 200)}...`
      : plainText
    await db.insert(notifications).values({
      userId: issue.createdBy,
      issueId: issue.id,
      type: NotificationType.IssueComment,
      title: `New comment on ${friendlyId}`,
      content: preview
    })
  }

  return {
    data: {
      ...comment,
      authorName: author?.name ?? null,
      authorEmail: author?.email ?? ''
    }
  }
})
