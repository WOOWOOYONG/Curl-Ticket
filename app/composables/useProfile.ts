import { HttpStatus } from '~~/shared/constants'

type Profile = {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
}

type ProfileState = {
  data: Profile | null
  fetched: boolean
}

/**
 * Client-side profile 快取
 * - 首次呼叫 fetch() 時打 /api/auth/me，結果存入 useState
 * - 後續路由切換直接讀快取，不發請求
 * - 呼叫 clear() 可清除快取（登出時使用）
 */
export function useProfile() {
  const state = useState<ProfileState>('profile', () => ({
    data: null,
    fetched: false
  }))

  async function fetchProfile(): Promise<Profile | null> {
    if (state.value.fetched) {
      return state.value.data
    }

    try {
      const profile = await $fetch('/api/auth/me')
      state.value = { data: profile, fetched: true }
      return profile
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === HttpStatus.Forbidden) {
        // 已登入但無 profile
        state.value = { data: null, fetched: true }
      }
      throw e
    }
  }

  function clearProfile() {
    state.value = { data: null, fetched: false }
  }

  return {
    profile: computed(() => state.value.data),
    fetched: computed(() => state.value.fetched),
    fetchProfile,
    clearProfile
  }
}
