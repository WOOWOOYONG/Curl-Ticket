import { projectMembers, projects } from '~~/server/database/schema'
import { createProjectSchema } from '~~/shared/schemas'
import { badRequest, internalServerError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  const body = await readBody(event)
  const result = createProjectSchema.safeParse(body)

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const newProject = await db.transaction(async (transaction) => {
    const createdProjects = await transaction
      .insert(projects)
      .values({
        ...result.data,
        ownerId: userId
      })
      .returning()
    const createdProject = createdProjects[0]

    if (!createdProject) {
      internalServerError('Failed to create project')
    }

    await transaction
      .insert(projectMembers)
      .values({
        projectId: createdProject.id,
        userId
      })
      .onConflictDoNothing()

    return createdProject
  })

  return newProject
})
