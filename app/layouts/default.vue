<script setup lang="ts">
import { UserRole } from '~~/shared/constants'

const route = useRoute()

const isProjectsActive = computed(() => route.path === '/')
const isAdminActive = computed(() => route.path.startsWith('/admin'))

const { data: profile } = useFetch('/api/auth/me', { server: false })
const isAdmin = computed(() => profile.value?.role === UserRole.Admin)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <UDashboardGroup class="flex-1 pt-(--ui-header-height)">
      <UDashboardSidebar
        :ui="{
          root: 'bg-slate-50/85 dark:bg-slate-950/70 border-slate-200/80 dark:border-white/10',
          body: 'px-4 py-3'
        }"
      >
        <nav class="flex flex-col gap-1">
          <UButton
            to="/"
            icon="i-lucide-folder"
            :color="isProjectsActive ? 'primary' : 'neutral'"
            :variant="isProjectsActive ? 'soft' : 'ghost'"
            :class="['w-full justify-start', isProjectsActive && 'font-semibold']"
          >
            Projects
          </UButton>
          <UButton
            v-if="isAdmin"
            to="/admin"
            icon="i-lucide-shield"
            :color="isAdminActive ? 'primary' : 'neutral'"
            :variant="isAdminActive ? 'soft' : 'ghost'"
            :class="['w-full justify-start', isAdminActive && 'font-semibold']"
          >
            邀請管理
          </UButton>
        </nav>
      </UDashboardSidebar>
      <main class="flex-1 bg-slate-50 dark:bg-gray-950">
        <slot />
      </main>
    </UDashboardGroup>
  </div>
</template>
