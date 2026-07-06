import { eq } from 'drizzle-orm'
import { projects } from '~~/server/database/schema'
import { badRequest, forbidden, notFound } from '~~/server/utils/errors'
import { validate } from '~~/server/utils/validate'
import { getAccessibleProject } from '~~/server/utils/project-access'
import { updateProjectSchema } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    badRequest('Project ID is required')
  }

  const db = useDB()
  const userId = event.context.userId as string
  const project = await getAccessibleProject(db, projectId, userId)

  if (project.ownerId !== userId) {
    forbidden('Only the project owner can edit this project')
  }

  const body = await readBody(event)

  if (body && typeof body === 'object' && 'key' in body) {
    badRequest('Project key cannot be updated')
  }

  const data = validate(updateProjectSchema, body)

  if (Object.keys(data).length === 0) {
    badRequest('No fields to update')
  }

  const [updatedProject] = await db
    .update(projects)
    .set(data)
    .where(eq(projects.id, projectId))
    .returning()

  if (!updatedProject) {
    notFound('Project not found')
  }

  return {
    data: updatedProject
  }
})
