import { serverSupabaseClient } from '#supabase/server'

/**
 * Server Middleware: 驗證用戶登入狀態
 * - 只處理 /api/ 開頭的請求
 * - 排除公開 API 路由
 * - 使用 auth.getUser() 向 Supabase Server 驗證（非本地 JWT 驗證）
 * - 將 userId 存到 event.context 供後續 API 使用
 */
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return

  // 公開路由（不需要驗證）
  const publicRoutes = [
    '/api/health',
    '/api/auth'
  ]

  // 檢查是否為公開路由（支援前綴匹配）
  const isPublicRoute = publicRoutes.some(route =>
    event.path === route || event.path.startsWith(`${route}/`)
  )

  if (isPublicRoute) return

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
})
