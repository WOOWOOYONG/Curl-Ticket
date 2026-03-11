import { createHash } from 'node:crypto'
import { serverSupabaseClient } from '#supabase/server'
import { eq } from 'drizzle-orm'
import { getProfile } from '~~/server/utils/profile'
import { unauthorized } from '~~/server/utils/errors'
import { apiTokens } from '~~/server/database/schema'

/**
 * Server Middleware: 驗證用戶登入狀態
 * - 只處理 /api/ 開頭的請求
 * - 排除公開 API 路由
 * - 區分「僅需 OAuth」與「需要 profile」的路由
 * - 未完成註冊（無 profile）的用戶只能存取 authOnlyRoutes
 */
export default defineEventHandler(async (event) => {
  const pathname = event.path.split('?')[0]

  if (!pathname.startsWith('/api/')) return

  // 公開路由（不需要驗證）
  const publicRoutes = [
    '/api/health',
    '/api/invitation-codes/validate',
    '/api/auth/device/code',
    '/api/auth/device/token'
  ]

  if (import.meta.dev) {
    publicRoutes.push('/api/dev/login')
  }

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) return

  // Bearer Token 路徑（API Token 驗證）
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ct_')) {
    const tokenValue = authHeader.slice(7).trim()
    const tokenHash = createHash('sha256').update(tokenValue).digest('hex')

    const db = useDB()
    const [tokenRecord] = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash))
      .limit(1)

    if (!tokenRecord) {
      unauthorized('Invalid or expired token')
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      unauthorized('Invalid or expired token')
    }

    const profile = await getProfile(db, tokenRecord.userId)
    if (!profile) {
      unauthorized('Invalid or expired token')
    }

    event.context.userId = tokenRecord.userId
    event.context.userEmail = profile!.email
    event.context.profile = profile
    event.context.authMethod = 'api_token'

    // Fire-and-forget: update lastUsedAt（不阻塞回應）
    db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, tokenRecord.id))
      .catch(() => {})

    return
  }

  // 僅需 OAuth 驗證、不需要 profile 的路由
  const authOnlyRoutes = [
    '/api/invitation-codes/redeem',
    '/api/auth/me'
  ]

  // 使用 Supabase Client 進行 Server-side 驗證（getUser 會向 Auth server 確認 token 真實性）
  const supabase = await serverSupabaseClient(event)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // 將用戶資訊存到 context
  event.context.userId = user.id
  event.context.userEmail = user.email ?? undefined
  event.context.userMetadata = user.user_metadata

  const isAuthOnlyRoute = authOnlyRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // authOnly 路由不需要 profile，直接放行
  if (isAuthOnlyRoute) return

  // 其他 API 需要 profile
  const db = useDB()
  const profile = await getProfile(db, user.id)

  if (!profile) {
    forbidden('請先完成註冊')
  }

  event.context.profile = profile
})
