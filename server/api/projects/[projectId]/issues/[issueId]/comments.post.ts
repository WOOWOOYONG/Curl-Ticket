import { eq } from 'drizzle-orm'
import { issueComments, issues, notifications, profiles } from '~~/server/database/schema'
import { createCommentSchema } from '~~/shared/schemas/issue-comment'
import { NotificationType } from '~~/shared/constants'
import { badRequest, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { sanitizeHtml, stripHtmlTags } from '~~/shared/utils/html'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId || !issueId) {
    badRequest('Project ID and Issue ID are required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  await getAccessibleProject(db, projectId, userId)

  // Verify issue exists and belongs to project
  const [issue] = await db
    .select({
      id: issues.id,
      title: issues.title,
      projectKey: issues.projectKey,
      issueNumber: issues.issueNumber,
      createdBy: issues.createdBy
    })
    .from(issues)
    .where(eq(issues.id, Number(issueId)))
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

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
