import { eq } from 'drizzle-orm'
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

  await getAccessibleProject(db, projectId, userId)

  const members = await db
    .select({
      userId: projectMembers.userId,
      createdAt: projectMembers.createdAt,
      name: profiles.name,
      email: profiles.email
    })
    .from(projectMembers)
    .leftJoin(profiles, eq(projectMembers.userId, profiles.id))
    .where(eq(projectMembers.projectId, projectId))

  return { data: members }
})
