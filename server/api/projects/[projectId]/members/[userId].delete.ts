import { eq, and } from 'drizzle-orm'
import { projectMembers } from '~~/server/database/schema'
import { badRequest, forbidden } from '~~/server/utils/errors'
import { getAccessibleProject } from '~~/server/utils/project-access'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')
  const targetUserId = getRouterParam(event, 'userId')
  if (!projectId) {
    badRequest('Project ID is required')
  }
  if (!targetUserId) {
    badRequest('User ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string

  const project = await getAccessibleProject(db, projectId, userId)
  if (project.ownerId !== userId) {
    forbidden('只有專案擁有者可以移除成員')
  }

  if (targetUserId === userId) {
    badRequest('不能移除自己')
  }

  await db.delete(projectMembers).where(
    and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUserId))
  )

  return { success: true }
})
