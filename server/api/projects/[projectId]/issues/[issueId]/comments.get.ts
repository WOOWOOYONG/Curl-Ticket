import { eq, asc } from 'drizzle-orm'
import { issueComments, profiles } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'
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

  await getAccessibleProject(db, projectId, userId)
  await getProjectIssue(db, projectId, issueId)

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
