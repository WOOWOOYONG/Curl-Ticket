import { desc } from 'drizzle-orm'
import { invitationCodes } from '~~/server/database/schema'
import { requireAdmin } from '~~/server/utils/profile'

/**
 * GET /api/invitation-codes
 * Admin 列出所有邀請連結
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  await requireAdmin(db, userId)

  const codes = await db
    .select()
    .from(invitationCodes)
    .orderBy(desc(invitationCodes.createdAt))
    .limit(100)

  return { data: codes }
})
