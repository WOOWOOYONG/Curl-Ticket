import { eq } from 'drizzle-orm'
import { profiles } from '~~/server/database/schema'

/**
 * GET /api/auth/me
 * 取得目前登入用戶的 Profile（含角色）
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)

  return profile ?? null
})
