import { eq, asc } from 'drizzle-orm'
import { issueComments, issues, profiles } from '~~/server/database/schema'
import { badRequest, notFound } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

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
    .select({ id: issues.id })
    .from(issues)
    .where(eq(issues.id, Number(issueId)))
    .limit(1)

  if (!issue) {
    notFound('Issue not found')
  }

  const comments = await db
    .select({
      id: issueComments.id,
      issueId: issueComments.issueId,
      authorId: issueComments.authorId,
      authorName: profiles.name,
      authorEmail: profiles.email,
      content: issueComments.content,
      createdAt: issueComments.createdAt,
      updatedAt: issueComments.updatedAt
    })
    .from(issueComments)
    .leftJoin(profiles, eq(issueComments.authorId, profiles.id))
    .where(eq(issueComments.issueId, Number(issueId)))
    .orderBy(asc(issueComments.createdAt))

  return { data: comments }
})
