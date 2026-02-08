<script setup lang="ts">
import { PENDING_INVITATION_TOKEN_KEY } from '~~/app/constants/auth'

definePageMeta({
  layout: 'header-only'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

const token = route.params.token as string
const loading = ref(false)
const validating = ref(true)
const valid = ref(false)
const errorMessage = ref('')

watch(user, (val) => {
  if (val) {
    navigateTo('/')
  }
}, { immediate: true })

async function validateToken() {
  try {
    await $fetch('/api/invitation-codes/validate', {
      method: 'POST',
      body: { code: token }
    })
    valid.value = true
  } catch {
    errorMessage.value = '邀請連結無效或已被使用'
  } finally {
    validating.value = false
  }
}

onMounted(validateToken)

async function signInWithGoogle() {
  loading.value = true
  sessionStorage.setItem(PENDING_INVITATION_TOKEN_KEY, token)

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
      <!-- 驗證中 -->
      <div
        v-if="validating"
        class="flex flex-col items-center gap-4 py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-8 animate-spin text-slate-400"
        />
        <p class="text-sm text-slate-500">
          正在驗證邀請連結...
        </p>
      </div>

      <!-- 驗證失敗 -->
      <div
        v-else-if="!valid"
        class="flex flex-col items-center gap-4 py-8"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
          <UIcon
            name="i-lucide-x-circle"
            class="size-7"
          />
        </div>
        <div class="space-y-2">
          <h1 class="text-xl font-semibold text-slate-900 dark:text-white">
            邀請連結無效
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ errorMessage }}
          </p>
        </div>
        <UButton
          to="/login"
          variant="outline"
          color="neutral"
          class="mt-2"
        >
          返回登入頁
        </UButton>
      </div>

      <!-- 驗證通過 -->
      <div
        v-else
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
            邀請驗證通過，請使用 Google 帳號完成註冊
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
    </UCard>
  </UContainer>
</template>
