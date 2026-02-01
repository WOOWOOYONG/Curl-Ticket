<script setup lang="ts">
definePageMeta({
  ssr: false
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const { data: response, status } = await useProject(projectId)

const project = computed(() => response.value?.data)
</script>

<template>
  <UDashboardPanel>
    <div class="flex flex-col gap-6 p-6">
      <!-- Loading State -->
      <template v-if="status === 'pending'">
        <USkeleton class="h-10 w-48" />
        <USkeleton class="h-64 rounded-lg" />
      </template>

      <!-- Error State -->
      <template v-else-if="!project">
        <div class="flex flex-col items-center justify-center py-16">
          <UIcon
            name="i-lucide-alert-circle"
            class="size-12 text-gray-400 mb-4"
          />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Project not found
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            The project you're looking for doesn't exist or has been deleted.
          </p>
          <UButton
            to="/"
            variant="outline"
          >
            Back to Projects
          </UButton>
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <NuxtLink
              to="/"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-5"
              />
            </NuxtLink>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ project.name }}
                </h1>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="font-mono"
                >
                  {{ project.key }}
                </UBadge>
              </div>
              <p
                v-if="project.description"
                class="text-sm text-gray-500 dark:text-gray-400 mt-1"
              >
                {{ project.description }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-plus"
            :to="`/projects/${projectId}/issues/create`"
          >
            Create Issue
          </UButton>
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <UIcon
              name="i-lucide-circle-dot"
              class="size-4"
            />
            <span>{{ project.openIssues }} Open</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <UIcon
              name="i-lucide-check-circle"
              class="size-4"
            />
            <span>{{ project.totalIssues - project.openIssues }} Closed</span>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="project.totalIssues === 0"
          class="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
        >
          <div class="flex size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <UIcon
              name="i-lucide-inbox"
              class="size-8 text-gray-400"
            />
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No issues yet
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-sm">
            Get started by creating your first issue to track API requests and bugs.
          </p>
          <UButton
            icon="i-lucide-plus"
            :to="`/projects/${projectId}/issues/create`"
          >
            Create First Issue
          </UButton>
        </div>

        <!-- Issues List (placeholder for future implementation) -->
        <div
          v-else
          class="space-y-4"
        >
          <!-- TODO: Implement issues list -->
        </div>
      </template>
    </div>
  </UDashboardPanel>
</template>
