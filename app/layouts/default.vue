<script setup lang="ts">
const route = useRoute()

const isProjectsActive = computed(() => route.path === '/')
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
        </nav>
      </UDashboardSidebar>
      <main class="flex-1 bg-slate-50 dark:bg-gray-950">
        <slot />
      </main>
    </UDashboardGroup>
  </div>
</template>
