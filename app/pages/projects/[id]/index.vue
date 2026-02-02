<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { IssueListItem } from '~~/shared/schemas'
import { getHttpMethodColor } from '~/constants/http'
import { IssueStatusColor, IssueStatusIcon } from '~/constants/issue'

definePageMeta({
  ssr: false
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const { data: response, status } = await useProject(projectId)
const project = computed(() => response.value?.data)

// Issues options
const issuesOptions = ref({ page: 1, pageSize: 20 })

const { data: issuesResponse, status: issuesStatus } = await useIssues(projectId, issuesOptions)

const goToPage = (page: number) => {
  issuesOptions.value = { ...issuesOptions.value, page }
}

const issues = computed(() => issuesResponse.value?.data ?? [])
const pagination = computed(() => issuesResponse.value?.pagination)

// Table columns
const columns: TableColumn<IssueListItem>[] = [
  {
    accessorKey: 'issueId',
    header: 'ID',
    meta: { class: { th: 'w-28', td: 'whitespace-nowrap' } }
  },
  {
    accessorKey: 'title',
    header: '標題',
    meta: { class: { td: 'max-w-xs' } }
  },
  {
    accessorKey: 'method',
    header: '方法',
    meta: { class: { th: 'w-24 text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'status',
    header: '狀態',
    meta: { class: { th: 'w-28 text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'environment',
    header: '環境',
    meta: { class: { th: 'w-24 text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'updatedAt',
    header: '更新時間',
    meta: { class: { th: 'w-40 text-right', td: 'text-right whitespace-nowrap' } }
  }
]

// Format date
function formatDate(date: Date | string) {
  return useDateFormat(date, 'YYYY/MM/DD HH:mm').value
}

// Row click handler
function onRowSelect(_event: Event, row: { original: IssueListItem }) {
  navigateTo(`/projects/${projectId.value}/issues/${row.original.id}`)
}
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

        <!-- Issues List -->
        <div
          v-else
          class="space-y-4"
        >
          <!-- Loading -->
          <template v-if="issuesStatus === 'pending'">
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-12 w-full" />
          </template>

          <!-- Issues Table -->
          <template v-else>
            <div class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <UTable
                :columns="columns"
                :data="issues"
                :ui="{
                  tr: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                  td: 'py-3',
                  th: 'py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'
                }"
                @select="onRowSelect"
              >
                <!-- Issue ID -->
                <template #issueId-cell="{ row }">
                  <span class="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
                    {{ row.original.projectKey }}-{{ row.original.issueNumber }}
                  </span>
                </template>

                <!-- Title -->
                <template #title-cell="{ row }">
                  <div class="flex flex-col gap-1">
                    <span class="font-medium text-gray-900 dark:text-white truncate">
                      {{ row.original.title }}
                    </span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 truncate font-mono">
                      {{ row.original.url }}
                    </span>
                  </div>
                </template>

                <!-- HTTP Method -->
                <template #method-cell="{ row }">
                  <UBadge
                    :color="getHttpMethodColor(row.original.method)"
                    variant="subtle"
                    class="font-mono text-xs font-semibold"
                  >
                    {{ row.original.method }}
                  </UBadge>
                </template>

                <!-- Status -->
                <template #status-cell="{ row }">
                  <UBadge
                    :color="IssueStatusColor[row.original.status] || 'neutral'"
                    variant="soft"
                    class="gap-1"
                  >
                    <UIcon
                      :name="IssueStatusIcon[row.original.status]"
                      class="size-3"
                    />
                    {{ row.original.status }}
                  </UBadge>
                </template>

                <!-- Environment -->
                <template #environment-cell="{ row }">
                  <UBadge
                    color="neutral"
                    variant="outline"
                    size="sm"
                  >
                    {{ row.original.environment }}
                  </UBadge>
                </template>

                <!-- Updated At -->
                <template #updatedAt-cell="{ row }">
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    {{ formatDate(row.original.updatedAt) }}
                  </span>
                </template>
              </UTable>
            </div>

            <!-- Pagination -->
            <div
              v-if="pagination && pagination.totalPages > 1"
              class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800"
            >
              <span class="text-sm text-gray-500 dark:text-gray-400">
                共 <span class="font-medium text-gray-700 dark:text-gray-300">{{ pagination.total }}</span> 筆，第 <span class="font-medium text-gray-700 dark:text-gray-300">{{ pagination.page }}</span> / {{ pagination.totalPages }} 頁
              </span>
              <UPagination
                :model-value="issuesOptions.page"
                :total="pagination.total"
                :page-count="issuesOptions.pageSize"
                @update:model-value="goToPage"
              />
            </div>
          </template>
        </div>
      </template>
    </div>
  </UDashboardPanel>
</template>
