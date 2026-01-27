import { projects } from '../../database/schema'
import { createProjectSchema } from '~~/shared/schemas'

export default defineEventHandler(async (event) => {
  const db = useDB()

  // 1. 讀取 request body
  const body = await readBody(event)

  // 2. 使用共用的 Zod schema 驗證
  const result = createProjectSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: result.error.flatten()
    })
  }

  // 3. result.data 已經是正確型別，直接寫入資料庫
  const [newProject] = await db
    .insert(projects)
    .values(result.data)
    .returning()

  return newProject
})
