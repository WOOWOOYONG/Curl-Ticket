<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { IssueListItem } from '~~/shared/schemas'
import { IssueType, issueStatuses, environments, httpMethods } from '~~/shared/constants'
import type { IssueStatus, Environment, HttpMethod } from '~~/shared/constants'
import { getHttpMethodColor } from '~/constants/http'
import { IssueStatusColor, IssueStatusLabel, IssueTypeIcon, issueTypeTabs } from '~/constants/issue'

definePageMeta({
  ssr: false
})

const route = useRoute()
const user = useSupabaseUser()
const { t } = useI18n()
const projectId = computed(() => route.params.id as string)

const { data: response, status } = await useProject(projectId)
const project = computed(() => response.value?.data)

// Issues search & options
const searchQuery = ref('')
const debouncedSearch = refDebounced(searchQuery, 300)

const DEFAULT_PAGE_SIZE = 10

// Issue type filter — initialize from query param
const initialType = route.query.type === IssueType.Task ? IssueType.Task : IssueType.ApiBug
const activeTypeFilter = ref<IssueType>(initialType)
const issuesOptions = ref<UseIssuesOptions>({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  issueType: initialType
})

// Filter options
const statusFilterOptions: { label: string; value: IssueStatus }[] = issueStatuses.map((s) => ({ label: IssueStatusLabel[s], value: s }))
const environmentFilterOptions: { label: string; value: Environment }[] = environments.map((e) => ({ label: e, value: e }))
const methodFilterOptions: { label: string; value: HttpMethod }[] = httpMethods.map((m) => ({ label: m, value: m }))

// Filter refs
const activeStatusFilter = ref<IssueStatus | undefined>()
const activeEnvironmentFilter = ref<Environment | undefined>()
const activeMethodFilter = ref<HttpMethod | undefined>()

// Filter popover controls
const statusOpen = ref(false)
const environmentOpen = ref(false)
const methodOpen = ref(false)

const hasActiveFilters = computed(
  () => !!activeStatusFilter.value || !!activeEnvironmentFilter.value || !!activeMethodFilter.value
)

function clearAllFilters() {
  activeStatusFilter.value = undefined
  activeEnvironmentFilter.value = undefined
  activeMethodFilter.value = undefined
}

function selectStatusFilter(value: IssueStatus) {
  activeStatusFilter.value = value
  statusOpen.value = false
}

function selectEnvironmentFilter(value: Environment) {
  activeEnvironmentFilter.value = value
  environmentOpen.value = false
}

function selectMethodFilter(value: HttpMethod) {
  activeMethodFilter.value = value
  methodOpen.value = false
}

watch(debouncedSearch, (val) => {
  issuesOptions.value = { ...issuesOptions.value, search: val, page: 1 }
})

watch(activeStatusFilter, (val) => {
  issuesOptions.value = { ...issuesOptions.value, status: val, page: 1 }
})

watch(activeEnvironmentFilter, (val) => {
  issuesOptions.value = { ...issuesOptions.value, environment: val, page: 1 }
})

watch(activeMethodFilter, (val) => {
  issuesOptions.value = { ...issuesOptions.value, method: val, page: 1 }
})

watch(activeTypeFilter, (val) => {
  // Reset all filters on tab switch
  activeStatusFilter.value = undefined
  activeEnvironmentFilter.value = undefined
  activeMethodFilter.value = undefined
  issuesOptions.value = {
    ...issuesOptions.value,
    issueType: val,
    status: undefined,
    environment: undefined,
    method: undefined,
    page: 1
  }
  // Sync query param without full navigation
  const query = { ...route.query, type: val }
  navigateTo({ path: route.path, query }, { replace: true })
})

const { data: issuesResponse, status: issuesStatus } = await useIssues(projectId, issuesOptions)

const goToPage = (page: number) => {
  issuesOptions.value = { ...issuesOptions.value, page }
}

const issues = computed(() => issuesResponse.value?.data ?? [])
const pagination = computed(() => issuesResponse.value?.pagination)

const totalIssuesCount = computed(() => pagination.value?.total ?? issues.value.length)
const pageStart = computed(() => {
  if (!pagination.value || pagination.value.total === 0) return 0
  const pageSize = pagination.value.pageSize || issuesOptions.value.pageSize || DEFAULT_PAGE_SIZE
  return (pagination.value.page - 1) * pageSize + 1
})
const pageEnd = computed(() => {
  if (!pagination.value || pagination.value.total === 0) return 0
  const pageSize = pagination.value.pageSize || issuesOptions.value.pageSize || DEFAULT_PAGE_SIZE
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
    header: t('issues.table.title'),
    meta: { class: { td: 'max-w-xs' } }
  },
  {
    accessorKey: 'method',
    header: t('issues.table.method'),
    meta: { class: { th: 'w-24 text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'status',
    header: t('issues.table.status'),
    meta: { class: { th: 'w-28 text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'environment',
    header: t('issues.table.environment'),
    meta: { class: { th: 'w-24 text-center', td: 'text-center' } }
  },
  {
    accessorKey: 'updatedAt',
    header: t('issues.table.updatedAt'),
    meta: { class: { th: 'w-40 text-right', td: 'text-right whitespace-nowrap' } }
  }
]

// Row click handler
function onRowSelect(_event: Event, row: { original: IssueListItem }) {
  navigateTo(
    `/projects/${projectId.value}/issues/${row.original.id}?type=${activeTypeFilter.value}`
  )
}
</script>

<template>
  <UDashboardPanel>
    <div class="relative isolate min-h-full">
      <div class="page-bg">
        <div class="page-bg-blob-left -top-28 -left-32" />
        <div class="page-bg-blob-right-compact top-12 -right-40" />
        <div class="page-bg-radial" />
        <div class="page-bg-grid" />
      </div>

      <div class="relative z-10 flex flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <!-- Loading State -->
        <template v-if="status === 'pending'">
          <USkeleton class="h-10 w-48" />
          <USkeleton class="h-64 rounded-2xl" />
        </template>

        <!-- Error State -->
        <template v-else-if="!project">
          <div
            class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-white/70 py-16 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
          >
            <div
              class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <UIcon
                name="i-lucide-alert-circle"
                class="size-6"
              />
            </div>
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ $t('projects.notFound') }}
            </h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ $t('projects.notFoundHint') }}
            </p>
            <UButton
              to="/"
              variant="outline"
              class="mt-6"
            >
              {{ $t('projects.backToProjects') }}
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
                <div
                  class="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold text-emerald-700 uppercase dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {{ $t('nav.projects') }}
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <h1
                    class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
                  >
                    {{ project.name }}
                  </h1>
                  <span
                    class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                  >
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
                icon="i-lucide-users"
                :to="`/projects/${projectId}/members`"
                size="lg"
                variant="outline"
              >
                {{ $t('projects.inviteMembers') }}
              </UButton>
              <UButton
                icon="i-lucide-plus"
                :to="`/projects/${projectId}/issues/create?type=${activeTypeFilter}`"
                size="lg"
                class="shadow-sm shadow-emerald-500/20"
              >
                {{ $t('issues.createIssue') }}
              </UButton>
            </div>
          </header>

          <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                  {{ $t('issues.title') }}
                </h2>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="font-mono text-xs"
                >
                  {{ totalIssuesCount }} {{ $t('common.total') }}
                </UBadge>
              </div>
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                size="lg"
                :placeholder="$t('issues.searchPlaceholder')"
                class="w-full sm:w-80"
                :ui="{
                  base: 'bg-white/80 dark:bg-gray-900/60 border-slate-200/70 dark:border-white/10'
                }"
              />
            </div>

            <!-- Issue Type Filter Tabs -->
            <UTabs
              :items="issueTypeTabs"
              :model-value="activeTypeFilter"
              variant="link"
              @update:model-value="activeTypeFilter = $event as IssueType"
            />

            <!-- Filter Pills -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Status -->
              <div
                class="inline-flex items-center rounded-full border text-sm transition-colors"
                :class="
                  activeStatusFilter
                    ? 'border-primary-200 bg-primary-50 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:hover:bg-primary-900'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5'
                "
              >
                <UPopover
                  v-model:open="statusOpen"
                  :ui="{ content: 'min-w-36 p-1' }"
                >
                  <button
                    class="flex cursor-pointer items-center gap-1.5 py-1.5 pl-3 font-medium"
                    :class="[
                      activeStatusFilter
                        ? 'text-primary-700 dark:text-primary-200 pr-1'
                        : 'pr-3 text-slate-600 dark:text-slate-300'
                    ]"
                  >
                    {{
                      activeStatusFilter
                        ? IssueStatusLabel[activeStatusFilter]
                        : $t('issues.table.status')
                    }}
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-3.5 opacity-50"
                    />
                  </button>
                  <template #content>
                    <button
                      v-for="opt in statusFilterOptions"
                      :key="opt.value"
                      class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                      @click="selectStatusFilter(opt.value)"
                    >
                      <UIcon
                        v-if="activeStatusFilter === opt.value"
                        name="i-lucide-check"
                        class="text-primary size-4 shrink-0"
                      />
                      <span
                        v-else
                        class="size-4 shrink-0"
                      />
                      <span>{{ opt.label }}</span>
                    </button>
                  </template>
                </UPopover>
                <button
                  v-if="activeStatusFilter"
                  class="text-primary-500 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900 mr-1.5 flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors"
                  aria-label="Clear status filter"
                  @click="activeStatusFilter = undefined"
                >
                  <UIcon
                    name="i-lucide-x"
                    class="size-3.5"
                  />
                </button>
              </div>

              <!-- Environment (API Bug only) -->
              <div
                v-if="activeTypeFilter === IssueType.ApiBug"
                class="inline-flex items-center rounded-full border text-sm transition-colors"
                :class="
                  activeEnvironmentFilter
                    ? 'border-primary-200 bg-primary-50 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:hover:bg-primary-900'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5'
                "
              >
                <UPopover
                  v-model:open="environmentOpen"
                  :ui="{ content: 'min-w-40 p-1' }"
                >
                  <button
                    class="flex cursor-pointer items-center gap-1.5 py-1.5 pl-3 font-medium"
                    :class="[
                      activeEnvironmentFilter
                        ? 'text-primary-700 dark:text-primary-200 pr-1'
                        : 'pr-3 text-slate-600 dark:text-slate-300'
                    ]"
                  >
                    {{ activeEnvironmentFilter || $t('issues.table.environment') }}
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-3.5 opacity-50"
                    />
                  </button>
                  <template #content>
                    <button
                      v-for="opt in environmentFilterOptions"
                      :key="opt.value"
                      class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                      @click="selectEnvironmentFilter(opt.value)"
                    >
                      <UIcon
                        v-if="activeEnvironmentFilter === opt.value"
                        name="i-lucide-check"
                        class="text-primary size-4 shrink-0"
                      />
                      <span
                        v-else
                        class="size-4 shrink-0"
                      />
                      <span>{{ opt.label }}</span>
                    </button>
                  </template>
                </UPopover>
                <button
                  v-if="activeEnvironmentFilter"
                  class="text-primary-500 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900 mr-1.5 flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors"
                  aria-label="Clear environment filter"
                  @click="activeEnvironmentFilter = undefined"
                >
                  <UIcon
                    name="i-lucide-x"
                    class="size-3.5"
                  />
                </button>
              </div>

              <!-- Method (API Bug only) -->
              <div
                v-if="activeTypeFilter === IssueType.ApiBug"
                class="inline-flex items-center rounded-full border text-sm transition-colors"
                :class="
                  activeMethodFilter
                    ? 'border-primary-200 bg-primary-50 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:hover:bg-primary-900'
                    : 'border-slate-300 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/5'
                "
              >
                <UPopover
                  v-model:open="methodOpen"
                  :ui="{ content: 'min-w-36 p-1' }"
                >
                  <button
                    class="flex cursor-pointer items-center gap-1.5 py-1.5 pl-3 font-medium"
                    :class="[
                      activeMethodFilter
                        ? 'text-primary-700 dark:text-primary-200 pr-1'
                        : 'pr-3 text-slate-600 dark:text-slate-300'
                    ]"
                  >
                    {{ activeMethodFilter || $t('issues.table.method') }}
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-3.5 opacity-50"
                    />
                  </button>
                  <template #content>
                    <button
                      v-for="opt in methodFilterOptions"
                      :key="opt.value"
                      class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                      @click="selectMethodFilter(opt.value)"
                    >
                      <UIcon
                        v-if="activeMethodFilter === opt.value"
                        name="i-lucide-check"
                        class="text-primary size-4 shrink-0"
                      />
                      <span
                        v-else
                        class="size-4 shrink-0"
                      />
                      <span>{{ opt.label }}</span>
                    </button>
                  </template>
                </UPopover>
                <button
                  v-if="activeMethodFilter"
                  class="text-primary-500 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900 mr-1.5 flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors"
                  aria-label="Clear method filter"
                  @click="activeMethodFilter = undefined"
                >
                  <UIcon
                    name="i-lucide-x"
                    class="size-3.5"
                  />
                </button>
              </div>

              <!-- Clear All -->
              <button
                v-if="hasActiveFilters"
                class="ml-2 cursor-pointer text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                @click="clearAllFilters"
              >
                {{ $t('issues.clearFilters') }}
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-if="project.totalIssues === 0"
              class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
            >
              <div
                class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <UIcon
                  name="i-lucide-inbox"
                  class="size-6"
                />
              </div>
              <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ $t('issues.noIssues') }}
              </h3>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {{ $t('issues.noIssuesHint') }}
              </p>
              <UButton
                icon="i-lucide-plus"
                :to="`/projects/${projectId}/issues/create?type=${activeTypeFilter}`"
                class="mt-6"
              >
                {{ $t('issues.createFirstIssue') }}
              </UButton>
            </div>

            <!-- Issues List -->
            <div
              v-else
              class="overflow-clip rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
            >
              <div class="max-h-[25vh] overflow-auto sm:max-h-[40vh]">
                <UTable
                  :columns="columns"
                  :data="issues"
                  :loading="issuesStatus === 'pending'"
                  loading-animation="carousel"
                  :ui="{
                    tr: 'cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10',
                    td: 'py-3 text-slate-700 dark:text-slate-200',
                    th: 'py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400'
                  }"
                  @select="onRowSelect"
                >
                  <!-- Issue ID -->
                  <template #issueId-cell="{ row }">
                    <div class="flex items-center gap-1.5">
                      <UIcon
                        :name="IssueTypeIcon[row.original.issueType]"
                        class="size-3.5"
                        :class="{
                          'text-red-500': row.original.issueType === IssueType.ApiBug,
                          'text-blue-500': row.original.issueType === IssueType.Task
                        }"
                      />
                      <span
                        class="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                      >
                        {{ row.original.projectKey }}-{{ row.original.issueNumber }}
                      </span>
                    </div>
                  </template>

                  <!-- Title -->
                  <template #title-cell="{ row }">
                    <div class="flex flex-col gap-1">
                      <span class="truncate font-medium text-slate-900 dark:text-white">
                        {{ row.original.title }}
                      </span>
                      <span
                        v-if="row.original.url"
                        class="truncate font-mono text-xs text-slate-400 dark:text-slate-500"
                      >
                        {{ row.original.url }}
                      </span>
                    </div>
                  </template>

                  <!-- HTTP Method -->
                  <template #method-cell="{ row }">
                    <UBadge
                      v-if="row.original.method"
                      :color="getHttpMethodColor(row.original.method)"
                      variant="subtle"
                      class="font-mono text-xs font-semibold"
                    >
                      {{ row.original.method }}
                    </UBadge>
                    <span
                      v-else
                      class="text-slate-300 dark:text-slate-600"
                    >
                      —
                    </span>
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
                        {{ IssueStatusLabel[row.original.status] || row.original.status }}
                      </span>
                    </div>
                  </template>

                  <!-- Environment -->
                  <template #environment-cell="{ row }">
                    <span
                      v-if="row.original.environment"
                      class="text-sm text-slate-500 dark:text-slate-400"
                    >
                      {{ row.original.environment }}
                    </span>
                    <span
                      v-else
                      class="text-slate-300 dark:text-slate-600"
                    >
                      —
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
                class="flex flex-col gap-3 border-t border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-gray-900/60 dark:text-slate-400"
              >
                <span>
                  {{ $t('common.showing') }}
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{
                    pageStart
                  }}</span>
                  {{ $t('common.to') }}
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{ pageEnd }}</span>
                  {{ $t('common.of') }}
                  <span class="font-medium text-slate-700 dark:text-slate-300">{{
                    pagination.total
                  }}</span>
                  {{ $t('common.results') }}
                </span>
                <UPagination
                  :page="issuesOptions.page"
                  :total="pagination.total"
                  :items-per-page="issuesOptions.pageSize"
                  @update:page="goToPage"
                />
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>
  </UDashboardPanel>
</template>
