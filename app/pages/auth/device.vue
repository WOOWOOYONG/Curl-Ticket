<script setup lang="ts">
import { HttpStatus } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only'
})

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { fetchProfile } = useProfile()

const userCode = computed(() => {
  const code = route.query.code
  return typeof code === 'string' ? code : null
})

const status = ref<'loading' | 'no-code' | 'login-required' | 'verifying' | 'success' | 'error'>('loading')
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
    const err = e as { statusCode?: number, data?: { statusMessage?: string } }
    if (err.statusCode === HttpStatus.Forbidden) {
      errorMessage.value = '請先完成帳號註冊後再進行 CLI 登入'
    } else {
      errorMessage.value = err?.data?.statusMessage ?? '驗證失敗，請重新執行 CLI 登入指令'
    }
    status.value = 'error'
  }
}

// 監聽 user 狀態，處理 OAuth 回調後的流程
watch(user, async (val) => {
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
      errorMessage.value = '請先完成帳號註冊後再進行 CLI 登入'
      status.value = 'error'
      return
    }
  } catch (e: unknown) {
    const errStatus = (e as { statusCode?: number }).statusCode
    if (errStatus === HttpStatus.Forbidden) {
      errorMessage.value = '請先完成帳號註冊後再進行 CLI 登入'
      status.value = 'error'
      return
    }
  }

  // 有 profile，直接驗證
  await verifyCode()
}, { immediate: true })

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
    errorMessage.value = 'Google 登入失敗，請重試'
    status.value = 'error'
  }
}
</script>

<template>
  <UContainer class="py-16">
    <UCard class="max-w-md mx-auto text-center">
      <!-- Loading -->
      <div
        v-if="status === 'loading' || status === 'verifying'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-8 h-8 mx-auto animate-spin text-primary"
        />
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ status === 'verifying' ? '正在驗證...' : '載入中...' }}
        </p>
      </div>

      <!-- No code -->
      <div
        v-else-if="status === 'no-code'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-terminal"
          class="w-10 h-10 mx-auto opacity-40"
        />
        <h2 class="text-lg font-semibold">
          CLI 裝置驗證
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          此頁面用於 CLI 工具登入驗證。<br>
          請從終端機執行登入指令以開始。
        </p>
      </div>

      <!-- Login required -->
      <div
        v-else-if="status === 'login-required'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-terminal"
          class="w-10 h-10 mx-auto opacity-40"
        />
        <h2 class="text-lg font-semibold">
          CLI 裝置驗證
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          請登入您的帳號以完成 CLI 裝置授權
        </p>
        <UButton
          icon="i-simple-icons-google"
          color="neutral"
          variant="solid"
          block
          @click="signInWithGoogle"
        >
          使用 Google 登入
        </UButton>
      </div>

      <!-- Success -->
      <div
        v-else-if="status === 'success'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-check-circle"
          class="w-10 h-10 mx-auto text-green-500"
        />
        <h2 class="text-lg font-semibold">
          登入成功
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          已完成 CLI 裝置授權，您可以關閉此頁面回到終端機。
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="status === 'error'"
        class="space-y-4 py-4"
      >
        <UIcon
          name="i-lucide-x-circle"
          class="w-10 h-10 mx-auto text-red-500"
        />
        <h2 class="text-lg font-semibold">
          驗證失敗
        </h2>
        <p class="text-sm text-red-500">
          {{ errorMessage }}
        </p>
      </div>
    </UCard>
  </UContainer>
</template>
