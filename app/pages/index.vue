<script setup lang="ts">
const { data: response, status } = await useFetch('/api/projects')

const projects = computed(() => response.value?.data ?? [])

function getTimeAgo(date: string | null) {
  if (!date) return null
  return useTimeAgo(new Date(date)).value
}

function getProgressPercentage(open: number, total: number) {
  if (total === 0) return 0
  return Math.round(((total - open) / total) * 100)
}
</script>

<template>
  <UDashboardPanel>
    <div class="flex flex-col gap-6 p-6 ">
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

      <!-- Loading State -->
      <div
        v-if="status === 'pending'"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <USkeleton
          v-for="i in 3"
          :key="i"
          class="h-48 rounded-lg"
        />
      </div>

      <!-- Projects Grid -->
      <div
        v-else
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <!-- Project Cards -->
        <NuxtLink
          v-for="project in projects"
          :key="project.id"
          :to="`/projects/${project.id}`"
          class="block"
        >
          <UCard class="hover:shadow-lg transition-shadow cursor-pointer">
            <!-- Header: Icon + Title + Key -->
            <div class="flex items-start gap-3 mb-4">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <UIcon
                  name="i-lucide-folder"
                  class="size-6 text-primary"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                    {{ project.name }}
                  </h3>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    class="shrink-0 font-mono"
                  >
                    {{ project.key }}
                  </UBadge>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {{ project.description || 'No description' }}
                </p>
              </div>
            </div>

            <!-- Stats: Open Issues + Total -->
            <div class="mb-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ project.openIssues }} Open Issues
                </span>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ project.totalIssues }} Total
                </span>
              </div>
              <!-- Progress Bar -->
              <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-2 rounded-full bg-amber-500 transition-all"
                  :style="{ width: `${getProgressPercentage(project.openIssues, project.totalIssues)}%` }"
                />
              </div>
            </div>

            <!-- Footer: Updated + View Details -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
              <span class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <UIcon
                  name="i-lucide-clock"
                  class="size-4"
                />
                <template v-if="project.lastUpdated">
                  Updated {{ getTimeAgo(project.lastUpdated) }}
                </template>
                <template v-else>
                  No issues yet
                </template>
              </span>
              <span class="text-sm font-medium text-primary">
                View Details →
              </span>
            </div>
          </UCard>
        </NuxtLink>

        <!-- Create New Project Card -->
        <NuxtLink to="/projects/create">
          <UCard
            class="flex min-h-48 h-full cursor-pointer items-center justify-center border-2 border-dashed border-gray-300 bg-transparent hover:border-primary hover:bg-primary/5 dark:border-gray-700 dark:hover:border-primary transition-colors"
            :ui="{ body: 'flex flex-col items-center justify-center gap-4 h-full' }"
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
