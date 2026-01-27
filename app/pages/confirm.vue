<script setup lang="ts">
const user = useSupabaseUser()

watch(user, (val) => {
  if (val) {
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
