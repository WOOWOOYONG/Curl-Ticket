<script setup lang="ts">
import { PENDING_INVITATION_TOKEN_KEY } from '~~/app/constants/auth'

const user = useSupabaseUser()

watch(user, async (val) => {
  if (val) {
    // 檢查是否有待兌換的邀請 token（從邀請連結註冊的流程）
    const pendingToken = sessionStorage.getItem(PENDING_INVITATION_TOKEN_KEY)

    if (pendingToken) {
      try {
        await $fetch('/api/invitation-codes/redeem', {
          method: 'POST',
          body: { code: pendingToken }
        })
      } catch (e) {
        console.error('Failed to redeem invitation token:', e)
      } finally {
        sessionStorage.removeItem(PENDING_INVITATION_TOKEN_KEY)
      }
    }

    navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <UContainer class="py-16">
    <div class="flex justify-center">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin"
      />
    </div>
  </UContainer>
</template>
