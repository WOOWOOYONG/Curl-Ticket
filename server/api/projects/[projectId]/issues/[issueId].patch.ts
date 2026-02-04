import { and, eq } from 'drizzle-orm'
import { projects, issues } from '~~/server/database/schema'
import { updateIssueSchema } from '~~/shared/schemas'
import { badRequest, notFound } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const issueId = getRouterParam(event, 'issueId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  if (!issueId) {
    badRequest('Issue ID is required')
  }

  const db = useDB()

  const [project] = await db
    .select({ id: projects.id, key: projects.key })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) {
    notFound('Project not found')
  }

  const body = await readBody(event)
  const result = updateIssueSchema.safeParse(body)

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  if (Object.keys(result.data).length === 0) {
    badRequest('No fields to update')
  }

  const [updatedIssue] = await db
    .update(issues)
    .set({
      ...result.data,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(issues.id, Number(issueId)),
        eq(issues.projectId, projectId)
      )
    )
    .returning()

  if (!updatedIssue) {
    notFound('Issue not found')
  }

  return {
    data: updatedIssue,
    friendlyId: `${project.key}-${updatedIssue.issueNumber}`
  }
})
