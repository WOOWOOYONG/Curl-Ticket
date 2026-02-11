<script setup lang="ts">
import { PENDING_INVITATION_TOKEN_KEY } from '~~/app/constants/auth'

definePageMeta({
  layout: 'header-only'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const code = ref('')
const loading = ref(false)
const validating = ref(false)
const valid = ref(false)
const errorMessage = ref('')

const { fetchProfile, clearProfile } = useProfile()

// 已登入且有 profile 才導回首頁；已登入但無 profile 留在此頁繼續輸入邀請碼
watch(user, async (val) => {
  if (val) {
    try {
      const profile = await fetchProfile()
      if (profile) {
        await navigateTo('/')
      }
    } catch {
      // 無 profile 或未授權，留在此頁
    }
  }
}, { immediate: true })

async function validateCode() {
  const trimmed = code.value.trim().toUpperCase()
  if (trimmed.length !== 6) {
    errorMessage.value = '請輸入 6 位邀請碼'
    return
  }

  validating.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/invitation-codes/validate', {
      method: 'POST',
      body: { code: trimmed }
    })
    code.value = trimmed
    valid.value = true

    // 已登入：直接 redeem 並跳轉首頁
    if (user.value) {
      await redeemAndEnter(trimmed)
    }
  } catch {
    errorMessage.value = '邀請碼無效或已被使用'
  } finally {
    validating.value = false
  }
}

async function redeemAndEnter(invitationCode: string) {
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/invitation-codes/redeem', {
      method: 'POST',
      body: { code: invitationCode }
    })
    clearProfile()
    await navigateTo('/')
  } catch {
    errorMessage.value = '兌換邀請碼失敗，請重試'
    loading.value = false
  }
}

async function signInWithGoogle() {
  loading.value = true
  sessionStorage.setItem(PENDING_INVITATION_TOKEN_KEY, code.value)

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${useRequestURL().origin}/confirm`
    }
  })
  if (error) {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="py-16">
    <UCard class="max-w-md mx-auto text-center">
      <!-- 已登入：驗證通過後自動 redeem，顯示 loading -->
      <div
        v-if="valid && user"
        class="flex flex-col items-center gap-4 py-8"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin text-primary"
        />
        <p class="text-sm text-slate-500 dark:text-slate-400">
          正在完成註冊...
        </p>
        <p
          v-if="errorMessage"
          class="text-sm text-red-500 dark:text-red-400"
        >
          {{ errorMessage }}
        </p>
      </div>

      <!-- 未登入：驗證通過，顯示 Google 註冊按鈕 -->
      <div
        v-else-if="valid && !user"
        class="flex flex-col items-center gap-4 py-8"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
          <UIcon
            name="i-lucide-check-circle"
            class="size-7"
          />
        </div>
        <div class="space-y-2">
          <h1 class="text-xl font-semibold text-slate-900 dark:text-white">
            歡迎加入 Curl Ticket
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            邀請碼驗證通過，請使用 Google 帳號完成註冊
          </p>
        </div>

        <UButton
          icon="i-simple-icons-google"
          color="neutral"
          variant="solid"
          size="lg"
          block
          :loading="loading"
          class="mt-4"
          @click="signInWithGoogle"
        >
          使用 Google 註冊
        </UButton>
      </div>

      <!-- 輸入邀請碼 -->
      <div
        v-else
        class="flex flex-col items-center gap-4 py-8"
      >
        <div class="space-y-2">
          <h1 class="text-xl font-semibold text-slate-900 dark:text-white">
            註冊帳號
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            請輸入管理員提供的 6 位邀請碼
          </p>
        </div>

        <UInput
          v-model="code"
          placeholder="例如：A3X9K2"
          size="lg"
          class="w-full max-w-50 text-center font-mono tracking-widest uppercase"
          :maxlength="6"
          @keyup.enter="validateCode"
        />

        <p
          v-if="errorMessage"
          class="text-sm text-red-500 dark:text-red-400"
        >
          {{ errorMessage }}
        </p>

        <UButton
          size="lg"
          :loading="validating"
          class="mt-2"
          @click="validateCode"
        >
          驗證邀請碼
        </UButton>

        <NuxtLink
          to="/login"
          class="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          已有帳號？返回登入
        </NuxtLink>
      </div>
    </UCard>
  </UContainer>
</template>
