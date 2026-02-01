import { projects } from '../../database/schema'
import { createProjectSchema } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const db = useDB()

  const body = await readBody(event)
  const result = createProjectSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: result.error.issues
    })
  }

  // 3. result.data 已經是正確型別，直接寫入資料庫
  const [newProject] = await db
    .insert(projects)
    .values(result.data)
    .returning()

  return newProject
})
