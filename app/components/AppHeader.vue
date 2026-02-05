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
  <ClientOnly>
    <UHeader
      :ui="{
        root: 'bg-slate-50/85 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-white/10 backdrop-blur',
        container: 'max-w-full',
        right: 'gap-6'
      }"
    >
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

    <template #fallback>
      <header class="bg-slate-50/85 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/80 dark:border-white/10 h-(--ui-header-height) sticky top-0 z-50 ">
        <div class="w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 h-full max-w-full">
          <NuxtLink
            to="/"
            class="text-lg font-bold"
          >
            Curl Ticket
          </NuxtLink>
        </div>
      </header>
    </template>
  </ClientOnly>
</template>
