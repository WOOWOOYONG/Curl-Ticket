<script setup lang="ts">

</script>

<template>
  <UDashboardPanel>
    <div class="flex flex-col gap-6 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">
          Projects
        </h1>
        <UButton
          icon="i-lucide-plus"
          to="/projects/create"
        >
          New Project
        </UButton>
      </div>

      <!-- Projects Grid -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <!-- Create New Project Card -->
        <NuxtLink to="/projects/create">
          <UCard
            class="flex min-h-48 cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 bg-transparent hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
            :ui="{ body: 'flex flex-col items-center justify-center gap-4' }"
          >
            <div class="flex size-12 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600">
              <UIcon
                name="i-lucide-plus"
                class="size-6 text-gray-400"
              />
            </div>
            <span class="text-sm text-gray-500 dark:text-gray-400">Create New Project</span>
          </UCard>
        </NuxtLink>
      </div>
    </div>
  </UDashboardPanel>
</template>
