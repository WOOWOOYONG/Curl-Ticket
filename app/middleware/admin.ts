import { UserRole } from '~~/shared/constants'

/**
 * Client-side middleware：限制只有 Admin 角色可以存取
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login')
  }

  try {
    const { fetchProfile } = useProfile()
    const profile = await fetchProfile()
    if (profile?.role !== UserRole.Admin) {
      return navigateTo('/')
    }
  } catch {
    return navigateTo('/')
  }
})
