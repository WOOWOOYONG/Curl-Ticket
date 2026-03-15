<script setup lang="ts">
import type { NavItem } from '~/components/AppHeader.vue'
import { UserRole } from '~~/shared/constants'

const route = useRoute()

const { profile, fetchProfile } = useProfile()
// Silently catch: unauthenticated visitors won't have a profile — that's fine,
// but the await is needed so SSR renders the same nav items as the client.
await fetchProfile().catch(() => {})

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { to: '/', icon: 'i-lucide-folder', label: 'Projects' }
  ]
  if (profile.value?.role === UserRole.Admin) {
    items.push({ to: '/admin', icon: 'i-lucide-shield', label: 'Invitations' })
  }
  return items
})

function isActive(item: NavItem) {
  return item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader :nav-items="navItems" />
    <UDashboardGroup class="flex-1 pt-(--ui-header-height)">
      <UDashboardSidebar
        :ui="{
          root: 'bg-slate-50/85 dark:bg-slate-950/70 border-slate-200/80 dark:border-white/10',
          body: 'px-4 py-3'
        }"
      >
        <nav class="flex flex-col gap-1">
          <UButton
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :color="isActive(item) ? 'primary' : 'neutral'"
            :variant="isActive(item) ? 'soft' : 'ghost'"
            :class="['w-full justify-start', isActive(item) && 'font-semibold']"
          >
            {{ item.label }}
          </UButton>
        </nav>
      </UDashboardSidebar>
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-gray-950">
        <slot />
      </main>
    </UDashboardGroup>
  </div>
</template>
