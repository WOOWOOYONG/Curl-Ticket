import { serverSupabaseClient } from '#supabase/server'
import { getProfile } from '~~/server/utils/profile'

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
    '/api/invitation-codes/validate'
  ]

  if (import.meta.dev) {
    publicRoutes.push('/api/dev/login')
  }

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) return

  // 僅需 OAuth 驗證、不需要 profile 的路由
  const authOnlyRoutes = [
    '/api/invitation-codes/redeem',
    '/api/auth/me'
  ]

  // 使用 Supabase Client 進行 Server-side 驗證
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
