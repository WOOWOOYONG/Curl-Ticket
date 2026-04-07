import { getProfile } from '~~/server/utils/profile'

/**
 * GET /api/auth/me
 * 取得目前登入用戶的 Profile（含角色）
 */
export default defineEventHandler(async (event) => {
  const db = useDB()
  const userId = event.context.userId as string
  const profile = await getProfile(db, userId)

  if (!profile) return null

  const metadata = event.context.userMetadata as Record<string, unknown> | undefined
  const avatarUrl = (metadata?.avatar_url ?? metadata?.picture ?? null) as string | null

  return { ...profile, avatarUrl }
})
