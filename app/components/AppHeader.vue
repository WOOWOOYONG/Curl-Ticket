<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const items = [
  {
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await supabase.auth.signOut()
      navigateTo('/login')
    }
  }
]
</script>

<template>
  <UHeader :ui="{ container: 'max-w-full', right: 'gap-6' }">
    <template #title>
      <NuxtLink to="/">
        <span class="text-lg font-bold">Curl Ticket</span>
      </NuxtLink>
    </template>

    <template #right>
      <UColorModeButton />
      <UDropdownMenu
        v-if="user"
        :items="items"
      >
        <UAvatar
          :src="user.user_metadata?.avatar_url"
          :alt="user.user_metadata?.full_name"
          size="sm"
          class="cursor-pointer"
        />
      </UDropdownMenu>
    </template>
  </UHeader>
</template>
