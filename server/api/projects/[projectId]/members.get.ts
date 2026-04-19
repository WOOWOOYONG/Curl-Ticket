import { and, eq, isNull, or } from 'drizzle-orm'
import { projectMembers, profiles } from '~~/server/database/schema'
import { badRequest } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  const project = await getAccessibleProject(db, projectId, userId)

  const rows = await db
    .select({
      userId: profiles.id,
      createdAt: projectMembers.createdAt,
      name: profiles.name,
      email: profiles.email
    })
    .from(profiles)
    .leftJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, profiles.id))
    )
    .where(
      and(
        isNull(profiles.deletedAt),
        or(eq(profiles.id, project.ownerId), eq(projectMembers.projectId, projectId))
      )
    )

  return { data: rows }
})
