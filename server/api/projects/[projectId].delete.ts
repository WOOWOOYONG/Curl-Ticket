import { eq } from 'drizzle-orm'
import { projects } from '~~/server/database/schema'
import { badRequest, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)

  if (project.ownerId !== userId) {
    forbidden('Only the project owner can delete this project')
  }

  await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, projectId))

  return { success: true }
})
