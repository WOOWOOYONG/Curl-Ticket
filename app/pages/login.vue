<script setup lang="ts">
definePageMeta({
  layout: 'header-only'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)

watch(user, (val) => {
  if (val) {
    navigateTo('/')
  }
}, { immediate: true })

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
    <UCard class="max-w-md mx-auto text-center">
      <div class="space-y-4">
        <h1 class="text-2xl font-bold">
          歡迎使用
        </h1>
        <p class="text-muted">
          請使用 Google 帳號登入以繼續
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
            使用 Google 登入
          </UButton>
          <p class="text-xs text-center text-slate-400 dark:text-slate-500">
            尚未有帳號？請向管理員索取邀請連結
          </p>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
