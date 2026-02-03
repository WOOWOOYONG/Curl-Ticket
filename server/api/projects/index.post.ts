import { projects } from '~~/server/database/schema'
import { createProjectSchema } from '~~/shared/schemas'
import { badRequest } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const db = useDB()

  const body = await readBody(event)
  const result = createProjectSchema.safeParse(body)

  if (!result.success) {
    badRequest('Validation Error', result.error.issues)
  }

  const [newProject] = await db
    .insert(projects)
    .values(result.data)
    .returning()

  return newProject
})
