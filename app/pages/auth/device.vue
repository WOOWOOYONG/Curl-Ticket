<script setup lang="ts">
import { HttpStatus } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only'
})

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { t } = useI18n()
const { fetchProfile } = useProfile()

const userCode = computed(() => {
  const code = route.query.code
  return typeof code === 'string' ? code : null
})

const status = ref<'loading' | 'no-code' | 'login-required' | 'verifying' | 'success' | 'error'>(
  'loading'
)
const errorMessage = ref('')

// 無 code 參數
if (!userCode.value) {
  status.value = 'no-code'
}

async function verifyCode() {
  if (!userCode.value) return

  status.value = 'verifying'
  try {
    await $fetch('/api/auth/device/verify', {
      method: 'POST',
      body: { userCode: userCode.value }
    })
    status.value = 'success'
  } catch (e: unknown) {
    const err = e as { statusCode?: number; data?: { statusMessage?: string } }
    if (err.statusCode === HttpStatus.Forbidden) {
      errorMessage.value = t('device.registerFirst')
    } else {
      errorMessage.value = err?.data?.statusMessage ?? t('device.verifyError')
    }
    status.value = 'error'
  }
}

// 監聽 user 狀態，處理 OAuth 回調後的流程
watch(
  user,
  async (val) => {
    if (status.value === 'no-code') return

    if (!val) {
      // 未登入，需要觸發 OAuth
      status.value = 'login-required'
      return
    }

    // 已登入，確認有 profile
    try {
      const profile = await fetchProfile()
      if (!profile) {
        errorMessage.value = t('device.registerFirst')
        status.value = 'error'
        return
      }
    } catch (e: unknown) {
      const errStatus = (e as { statusCode?: number }).statusCode
      if (errStatus === HttpStatus.Forbidden) {
        errorMessage.value = t('device.registerFirst')
        status.value = 'error'
        return
      }
    }

    // 有 profile，直接驗證
    await verifyCode()
  },
  { immediate: true }
)

async function signInWithGoogle() {
  status.value = 'loading'
  const origin = useRequestURL().origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/device?code=${userCode.value}`
    }
  })
  if (error) {
    errorMessage.value = t('device.loginFailed')
    status.value = 'error'
  }
}
</script>

<template>
  <UContainer class="py-16">
    <UCard class="mx-auto max-w-md text-center">
      <!-- Loading -->
      <div
        v-if="status === 'loading' || status === 'verifying'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="text-primary mx-auto h-8 w-8 animate-spin"
        />
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ status === 'verifying' ? $t('device.verifying') : $t('common.loading') }}
        </p>
      </div>

      <!-- No code -->
      <div
        v-else-if="status === 'no-code'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-terminal"
          class="mx-auto h-10 w-10 opacity-40"
        />
        <h2 class="text-lg font-semibold">
          {{ $t('device.title') }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ $t('device.noCode') }}<br />
          {{ $t('device.noCodeHint') }}
        </p>
      </div>

      <!-- Login required -->
      <div
        v-else-if="status === 'login-required'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-terminal"
          class="mx-auto h-10 w-10 opacity-40"
        />
        <h2 class="text-lg font-semibold">
          {{ $t('device.title') }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ $t('device.loginRequired') }}
        </p>
        <UButton
          icon="i-simple-icons-google"
          color="neutral"
          variant="solid"
          block
          @click="signInWithGoogle"
        >
          {{ $t('auth.loginWithGoogle') }}
        </UButton>
      </div>

      <!-- Success -->
      <div
        v-else-if="status === 'success'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-check-circle"
          class="mx-auto h-10 w-10 text-green-500"
        />
        <h2 class="text-lg font-semibold">
          {{ $t('device.loginSuccess') }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ $t('device.loginSuccessHint') }}
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="status === 'error'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-x-circle"
          class="mx-auto h-10 w-10 text-red-500"
        />
        <h2 class="text-lg font-semibold">
          {{ $t('device.verifyFailed') }}
        </h2>
        <p class="text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </div>
    </UCard>
  </UContainer>
</template>
