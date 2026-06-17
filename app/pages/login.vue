<script setup lang="ts">
import { HttpStatus } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)

const { fetchProfile, clearProfile } = useProfile()

// 已登入且有 profile 才導回首頁；無 profile 導向 /register
watch(
  user,
  async (val) => {
    if (val) {
      try {
        clearProfile()
        const profile = await fetchProfile()
        if (profile) {
          await navigateTo('/')
        } else {
          await navigateTo('/register')
        }
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === HttpStatus.Forbidden) {
          await navigateTo('/register')
        }
      }
    }
  },
  { immediate: true }
)

async function signInWithGoogle() {
  loading.value = true
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
    <UCard class="mx-auto max-w-md text-center">
      <div class="space-y-4">
        <AppLogo class="mx-auto size-14 text-[#10b981]" />
        <h1 class="text-2xl font-bold">
          {{ $t('auth.welcome') }}
        </h1>
        <p class="text-muted">
          {{ $t('auth.loginPrompt') }}
        </p>
      </div>

      <template #footer>
        <div class="space-y-3">
          <UButton
            icon="i-simple-icons-google"
            color="neutral"
            variant="solid"
            block
            :loading="loading"
            @click="signInWithGoogle"
          >
            {{ $t('auth.loginWithGoogle') }}
          </UButton>
          <p class="text-center text-xs text-slate-400 dark:text-slate-500">
            {{ $t('auth.noAccount') }}
            <NuxtLink
              to="/register"
              class="text-primary ml-1 hover:underline"
            >
              {{ $t('auth.goToRegister') }}
            </NuxtLink>
          </p>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
