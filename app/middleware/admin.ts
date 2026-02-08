import { UserRole } from '~~/shared/constants'

/**
 * Client-side middleware：限制只有 Admin 角色可以存取
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser()

  if (!user.value) {
    return navigateTo('/login')
  }

  const { data } = await useFetch('/api/auth/me')

  if (data.value?.role !== UserRole.Admin) {
    return navigateTo('/')
  }
})
