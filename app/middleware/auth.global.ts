import { HttpStatus } from '~~/shared/constants'

/**
 * 全域 Client Middleware：保護所有頁面
 * - 未登入 → /login
 * - 已登入但無 profile（未完成註冊）→ /register
 * - 已登入且有 profile → 放行
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const publicPages = ['/login', '/register', '/confirm']

  if (publicPages.includes(to.path) || to.path.startsWith('/share/')) return

  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login')
  }

  const { fetchProfile } = useProfile()

  try {
    const profile = await fetchProfile()
    if (!profile) {
      return navigateTo('/register')
    }
  } catch (e: unknown) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === HttpStatus.Forbidden) {
      return navigateTo('/register')
    }
    return navigateTo('/login')
  }
})
