<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <UDashboardGroup class="flex-1 pt-(--ui-header-height)">
      <UDashboardSidebar />
      <main class="flex-1 bg-slate-50 dark:bg-gray-950">
        <slot />
      </main>
    </UDashboardGroup>
  </div>
</template>
