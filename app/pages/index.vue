<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function signOut() {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <UContainer class="py-16">
    <UCard
      v-if="user"
      class="max-w-md mx-auto"
    >
      <div class="flex items-center gap-4">
        <UAvatar
          :src="user.user_metadata?.avatar_url"
          :alt="user.user_metadata?.full_name"
          size="xl"
        />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">
            {{ user.user_metadata?.full_name }}
          </p>
          <p class="text-sm text-muted truncate">
            {{ user.email }}
          </p>
        </div>
      </div>

      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          block
          @click="signOut"
        >
          登出
        </UButton>
      </template>
    </UCard>

    <UCard
      v-else
      class="max-w-md mx-auto text-center"
    >
      <p class="text-muted">
        尚未登入
      </p>
      <template #footer>
        <UButton
          to="/login"
          block
        >
          前往登入
        </UButton>
      </template>
    </UCard>
  </UContainer>
</template>
