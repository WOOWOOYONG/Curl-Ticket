import { eq } from 'drizzle-orm'
import { profiles } from '~~/server/database/schema'
import { updateProfileSchema } from '~~/shared/schemas/profile'
import { badRequest } from '~~/server/utils/errors'

/**
 * PATCH /api/auth/profile
 * 更新目前登入用戶的 Profile（目前僅支援 name）
 */
export default defineEventHandler(async (event) => {
  const userId = event.context.userId as string
  const body = await readBody(event)

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    badRequest(parsed.error.issues[0]?.message ?? 'Validation failed')
  }

  const db = useDB()
  const [updated] = await db
    .update(profiles)
    .set({
      name: parsed.data.name,
      updatedAt: new Date()
    })
    .where(eq(profiles.id, userId))
    .returning()

  return updated
})
