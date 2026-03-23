import { getProfile } from '~~/server/utils/profile'

/**
 * GET /api/auth/me
 * 取得目前登入用戶的 Profile（含角色）
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string

  return await getProfile(db, userId)
})
