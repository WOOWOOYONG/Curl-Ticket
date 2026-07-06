import { projectMembers, projects } from '~~/server/database/schema'
import { createProjectSchema } from '~~/shared/schemas'
import { internalServerError } from '~~/server/utils/errors'
import { validateBody } from '~~/server/utils/validate'

export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  const data = await validateBody(event, createProjectSchema)

  const newProject = await db.transaction(async (transaction) => {
    const createdProjects = await transaction
      .insert(projects)
      .values({
        ...data,
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
