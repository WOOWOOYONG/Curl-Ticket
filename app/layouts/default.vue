<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />

    <UDashboardGroup class="flex-1 pt-(--ui-header-height)">
      <UDashboardSidebar />
      <slot />
    </UDashboardGroup>
  </div>
</template>
