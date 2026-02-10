<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { IssueListItem } from '~~/shared/schemas'
import { getHttpMethodColor } from '~/constants/http'
import { IssueStatusColor } from '~/constants/issue'

definePageMeta({
  ssr: false
})

const route = useRoute()
const user = useSupabaseUser()
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

const totalIssuesCount = computed(() => pagination.value?.total ?? issues.value.length)
const pageStart = computed(() => {
  if (!pagination.value || pagination.value.total === 0) return 0
  const pageSize = pagination.value.pageSize || issuesOptions.value.pageSize
  return (pagination.value.page - 1) * pageSize + 1
})
const pageEnd = computed(() => {
  if (!pagination.value || pagination.value.total === 0) return 0
  const pageSize = pagination.value.pageSize || issuesOptions.value.pageSize
  return Math.min(pagination.value.page * pageSize, pagination.value.total)
})

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

// Row click handler
function onRowSelect(_event: Event, row: { original: IssueListItem }) {
  navigateTo(`/projects/${projectId.value}/issues/${row.original.id}`)
}
</script>

<template>
  <UDashboardPanel>
    <div class="relative isolate flex-1 min-h-full overflow-hidden">
      <div class="page-bg">
        <div class="page-bg-blob-left -top-28 -left-32" />
        <div class="page-bg-blob-right-compact top-12 -right-40" />
        <div class="page-bg-radial" />
        <div class="page-bg-grid" />
      </div>

      <div class="relative z-10 flex flex-1 min-h-0 flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <!-- Loading State -->
        <template v-if="status === 'pending'">
          <USkeleton class="h-10 w-48" />
          <USkeleton class="h-64 rounded-2xl" />
        </template>

        <!-- Error State -->
        <template v-else-if="!project">
          <div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-white/70 py-16 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
            <div class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
              <UIcon
                name="i-lucide-alert-circle"
                class="size-6"
              />
            </div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              Project not found
            </h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              The project you're looking for doesn't exist or has been deleted.
            </p>
            <UButton
              to="/"
              variant="outline"
              class="mt-6"
            >
              Back to Projects
            </UButton>
          </div>
        </template>

        <!-- Content -->
        <template v-else>
          <header class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex items-start gap-4">
              <NuxtLink
                to="/"
                class="flex size-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white/80 text-slate-500 transition hover:-translate-x-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-gray-900/60 dark:text-slate-300"
              >
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-4"
                />
              </NuxtLink>
              <div class="space-y-2">
                <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold uppercase  text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Project
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                    {{ project.name }}
                  </h1>
                  <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    {{ project.key }}
                  </span>
                </div>
                <p
                  v-if="project.description"
                  class="text-sm text-slate-600 dark:text-slate-300"
                >
                  {{ project.description }}
                </p>
              </div>
            </div>
            <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <UButton
                v-if="project.ownerId === user?.sub"
                icon="i-lucide-settings"
                :to="`/projects/${projectId}/settings`"
                size="lg"
                variant="outline"
              >
                Settings
              </UButton>
              <UButton
                icon="i-lucide-plus"
                :to="`/projects/${projectId}/issues/create`"
                size="lg"
                class="shadow-sm shadow-emerald-500/20"
              >
                Create Issue
              </UButton>
            </div>
          </header>

          <section class="flex min-h-0 flex-1 flex-col gap-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                  Issues
                </h2>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="font-mono text-xs"
                >
                  {{ totalIssuesCount }} total
                </UBadge>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="project.totalIssues === 0"
              class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
            >
              <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <UIcon
                  name="i-lucide-inbox"
                  class="size-6"
                />
              </div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                No issues yet
              </h3>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Start tracking API requests and bugs as soon as they appear.
              </p>
              <UButton
                icon="i-lucide-plus"
                :to="`/projects/${projectId}/issues/create`"
                class="mt-6"
              >
                Create First Issue
              </UButton>
            </div>

            <!-- Issues List -->
            <div
              v-else
              class="flex min-h-0 flex-1 flex-col"
            >
              <template v-if="issuesStatus === 'pending'">
                <USkeleton class="h-12 w-full rounded-2xl" />
                <USkeleton class="h-12 w-full rounded-2xl" />
                <USkeleton class="h-12 w-full rounded-2xl" />
              </template>

              <template v-else>
                <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
                  <div class="flex-1 overflow-auto">
                    <UTable
                      :columns="columns"
                      :data="issues"
                      :ui="{
                        tr: 'cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10',
                        td: 'py-3 text-slate-700 dark:text-slate-200',
                        th: 'py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400'
                      }"
                      @select="onRowSelect"
                    >
                      <!-- Issue ID -->
                      <template #issueId-cell="{ row }">
                        <span class="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {{ row.original.projectKey }}-{{ row.original.issueNumber }}
                        </span>
                      </template>

                      <!-- Title -->
                      <template #title-cell="{ row }">
                        <div class="flex flex-col gap-1">
                          <span class="font-medium text-slate-900 dark:text-white truncate">
                            {{ row.original.title }}
                          </span>
                          <span class="text-xs text-slate-400 dark:text-slate-500 truncate font-mono">
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
                        <div class="inline-flex items-center gap-1.5">
                          <UChip
                            :color="IssueStatusColor[row.original.status] || 'neutral'"
                            inset
                            standalone
                            size="xs"
                          />
                          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {{ row.original.status }}
                          </span>
                        </div>
                      </template>

                      <!-- Environment -->
                      <template #environment-cell="{ row }">
                        <span class="text-sm text-slate-500 dark:text-slate-400">
                          {{ row.original.environment }}
                        </span>
                      </template>

                      <!-- Updated At -->
                      <template #updatedAt-cell="{ row }">
                        <span class="text-sm text-slate-500 dark:text-slate-400">
                          {{ formatDateTime(row.original.updatedAt) }}
                        </span>
                      </template>
                    </UTable>
                  </div>

                  <div
                    v-if="pagination"
                    class="flex flex-col gap-3 border-t border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-gray-900/60 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span>
                      Showing <span class="font-medium text-slate-700 dark:text-slate-300">{{ pageStart }}</span>
                      to <span class="font-medium text-slate-700 dark:text-slate-300">{{ pageEnd }}</span>
                      of <span class="font-medium text-slate-700 dark:text-slate-300">{{ pagination.total }}</span> results
                    </span>
                    <UPagination
                      :model-value="issuesOptions.page"
                      :total="pagination.total"
                      :page-count="issuesOptions.pageSize"
                      @update:model-value="goToPage"
                    />
                  </div>
                </div>
              </template>
            </div>
          </section>
        </template>
      </div>
    </div>
  </UDashboardPanel>
</template>
