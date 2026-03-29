<script setup lang="ts">
import { PENDING_INVITATION_TOKEN_KEY } from '~~/app/constants/auth'

definePageMeta({
  layout: 'header-only'
})

const user = useSupabaseUser()
const processedSub = ref<string | null>(null)

watch(
  () => user.value?.sub,
  async (sub) => {
    if (!sub || processedSub.value === sub) {
      return
    }

    processedSub.value = sub

    if (import.meta.client) {
      const pendingToken = sessionStorage.getItem(PENDING_INVITATION_TOKEN_KEY)

      if (pendingToken) {
        await nextTick()

        try {
          await $fetch('/api/invitation-codes/redeem', {
            method: 'POST',
            body: { code: pendingToken }
          })
        } catch (e) {
          console.error('Failed to redeem invitation code:', e)
        } finally {
          sessionStorage.removeItem(PENDING_INVITATION_TOKEN_KEY)
        }
      }
    }

    await navigateTo('/')
  },
  { immediate: true }
)
</script>

<template>
  <UContainer class="py-16">
    <div class="flex justify-center">
      <UIcon
        name="i-heroicons-arrow-path"
        class="h-8 w-8 animate-spin"
      />
    </div>
  </UContainer>
</template>
