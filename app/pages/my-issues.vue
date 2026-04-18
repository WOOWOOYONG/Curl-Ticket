<script setup lang="ts">
import type { LocationQueryValue } from 'vue-router'
import { issueStatuses, environments } from '~~/shared/constants'
import type { Environment, IssueStatus } from '~~/shared/constants'
import {
  EMPTY_MY_ISSUES_SUMMARY,
  myIssuesSortFields,
  myIssuesOrderValues
} from '~~/shared/schemas'
import type { MyIssuesSortField, MyIssuesOrder } from '~~/shared/schemas'
import { IssueStatusColor, IssueStatusLabel, EnvironmentColor } from '~/constants/issue'

definePageMeta({
  ssr: false
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { formatRelative } = useRelativeTime()

type QueryInput = LocationQueryValue | LocationQueryValue[] | undefined

function normalizeArray(raw: QueryInput): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')
  return typeof raw === 'string' ? [raw] : []
}

function normalizeString(raw: QueryInput): string | undefined {
  if (typeof raw === 'string' && raw.length > 0) return raw
  return undefined
}

const statusSet = new Set<string>(issueStatuses)
const envSet = new Set<string>(environments)
const sortSet = new Set<string>(myIssuesSortFields)
const orderSet = new Set<string>(myIssuesOrderValues)

const selectedStatuses = ref<IssueStatus[]>(
  normalizeArray(route.query.status).filter((s): s is IssueStatus => statusSet.has(s))
)
const selectedProjectId = ref<string | undefined>(normalizeString(route.query.projectId))
const selectedEnvironment = ref<Environment | undefined>(
  (() => {
    const v = normalizeString(route.query.environment)
    return v && envSet.has(v) ? (v as Environment) : undefined
  })()
)
const searchQuery = ref(normalizeString(route.query.search) ?? '')
const debouncedSearch = refDebounced(searchQuery, 300)
const selectedSort = ref<MyIssuesSortField>(
  (() => {
    const v = normalizeString(route.query.sort)
    return v && sortSet.has(v) ? (v as MyIssuesSortField) : 'updatedAt'
  })()
)
const selectedOrder = ref<MyIssuesOrder>(
  (() => {
    const v = normalizeString(route.query.order)
    return v && orderSet.has(v) ? (v as MyIssuesOrder) : 'desc'
  })()
)
const page = ref<number>(Number(normalizeString(route.query.page) ?? '1') || 1)

function buildOptions(pageValue = page.value): UseMyIssuesOptions {
  return {
    page: pageValue,
    pageSize: 20,
    status: selectedStatuses.value.length ? [...selectedStatuses.value] : undefined,
    projectId: selectedProjectId.value,
    environment: selectedEnvironment.value,
    search: debouncedSearch.value || undefined,
    sort: selectedSort.value,
    order: selectedOrder.value
  }
}

function buildQuery(options: UseMyIssuesOptions): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}
  if (options.status?.length) query.status = options.status
  if (options.projectId) query.projectId = options.projectId
  if (options.environment) query.environment = options.environment
  if (options.search) query.search = options.search
  if (options.sort && options.sort !== 'updatedAt') query.sort = options.sort
  if (options.order && options.order !== 'desc') query.order = options.order
  if (options.page && options.page !== 1) query.page = String(options.page)
  return query
}

function sameStringArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

function sameOptions(a: UseMyIssuesOptions, b: UseMyIssuesOptions) {
  return (
    (a.page ?? 1) === (b.page ?? 1) &&
    (a.pageSize ?? 20) === (b.pageSize ?? 20) &&
    sameStringArray(a.status ?? [], b.status ?? []) &&
    a.projectId === b.projectId &&
    a.environment === b.environment &&
    a.search === b.search &&
    a.sort === b.sort &&
    a.order === b.order
  )
}

const options = ref<UseMyIssuesOptions>(buildOptions())

const { data, status: fetchStatus } = useMyIssues(options)
const { data: availableProjects } = useMyIssuesProjects()

const issues = computed(() => data.value?.data ?? [])
const pagination = computed(() => data.value?.pagination)
const summary = computed(() => data.value?.summary ?? EMPTY_MY_ISSUES_SUMMARY)

watch(
  [selectedStatuses, selectedProjectId, selectedEnvironment, debouncedSearch, selectedSort, selectedOrder, page],
  (current, previous) => {
    if (previous) {
      const filtersChanged =
        !sameStringArray(current[0], previous[0]) ||
        current[1] !== previous[1] ||
        current[2] !== previous[2] ||
        current[3] !== previous[3] ||
        current[4] !== previous[4] ||
        current[5] !== previous[5]

      if (filtersChanged && current[6] !== 1) {
        page.value = 1
        return
      }
    }

    const nextOptions = buildOptions()
    if (!sameOptions(options.value, nextOptions)) {
      options.value = nextOptions
    }

    router.replace({ query: buildQuery(nextOptions) })
  }
)

const statusItems = issueStatuses.map((s) => ({ label: IssueStatusLabel[s], value: s }))
const environmentItems = environments.map((e) => ({ label: e, value: e }))
const sortItems: { label: string; value: MyIssuesSortField }[] = [
  { label: t('myIssues.filters.sortUpdatedAt'), value: 'updatedAt' },
  { label: t('myIssues.filters.sortCreatedAt'), value: 'createdAt' },
  { label: t('myIssues.filters.sortStatus'), value: 'status' }
]
const orderItems: { label: string; value: MyIssuesOrder }[] = [
  { label: t('myIssues.filters.orderDesc'), value: 'desc' },
  { label: t('myIssues.filters.orderAsc'), value: 'asc' }
]

const projectItems = computed(
  () =>
    availableProjects.value?.map((p) => ({
      label: `${p.key} · ${p.name}`,
      value: p.id
    })) ?? []
)

const hasAnyFilter = computed(
  () =>
    selectedStatuses.value.length > 0 ||
    !!selectedProjectId.value ||
    !!selectedEnvironment.value ||
    !!searchQuery.value
)

function resetFilters() {
  selectedStatuses.value = []
  selectedProjectId.value = undefined
  selectedEnvironment.value = undefined
  searchQuery.value = ''
}

function goToPage(p: number) {
  page.value = p
}

const isLoading = computed(() => fetchStatus.value === 'pending')
const hasResults = computed(() => issues.value.length > 0)
const hasZeroTotal = computed(() => summary.value.total === 0)
</script>

<template>
  <UDashboardPanel>
    <div class="relative isolate min-h-full overflow-hidden">
      <div class="relative z-10 flex flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <header class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {{ $t('myIssues.title') }}
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('myIssues.subtitle') }}</p>
        </header>

        <!-- Summary cards -->
        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <div class="text-[11px] font-semibold text-slate-500 uppercase dark:text-slate-400">
              {{ $t('myIssues.summary.open') }}
            </div>
            <div class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ summary.open }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <div class="text-[11px] font-semibold text-slate-500 uppercase dark:text-slate-400">
              {{ $t('myIssues.summary.inProgress') }}
            </div>
            <div class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ summary.inProgress }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <div class="text-[11px] font-semibold text-slate-500 uppercase dark:text-slate-400">
              {{ $t('myIssues.summary.done') }}
            </div>
            <div class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ summary.done }}
            </div>
          </div>
          <div
            class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <div class="text-[11px] font-semibold text-slate-500 uppercase dark:text-slate-400">
              {{ $t('myIssues.summary.total') }}
            </div>
            <div class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ summary.total }}
            </div>
          </div>
        </section>

        <!-- Filter toolbar -->
        <section class="flex flex-wrap items-center gap-3">
          <USelectMenu
            v-model="selectedStatuses"
            :items="statusItems"
            value-key="value"
            multiple
            :placeholder="$t('myIssues.filters.status')"
            class="min-w-48"
          />
          <USelectMenu
            v-model="selectedProjectId"
            :items="projectItems"
            value-key="value"
            :placeholder="$t('myIssues.filters.project')"
            clear
            class="min-w-48"
          />
          <USelectMenu
            v-model="selectedEnvironment"
            :items="environmentItems"
            value-key="value"
            :placeholder="$t('myIssues.filters.environment')"
            clear
            class="min-w-40"
          />
          <USelect
            v-model="selectedSort"
            :items="sortItems"
            value-key="value"
            class="min-w-44"
          />
          <USelect
            v-model="selectedOrder"
            :items="orderItems"
            value-key="value"
            class="min-w-32"
          />
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            :placeholder="$t('myIssues.filters.searchPlaceholder')"
            class="min-w-56 flex-1"
          />
          <UButton
            v-if="hasAnyFilter"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            @click="resetFilters"
          >
            {{ $t('myIssues.filters.reset') }}
          </UButton>
        </section>

        <!-- List -->
        <section class="flex flex-col gap-3">
          <!-- Loading skeleton -->
          <div
            v-if="isLoading && !data"
            class="flex flex-col gap-2"
          >
            <USkeleton
              v-for="i in 6"
              :key="i"
              class="h-14 rounded-xl"
            />
          </div>

          <!-- Zero total empty state -->
          <div
            v-else-if="hasZeroTotal"
            class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <div
              class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <UIcon
                name="i-lucide-inbox"
                class="size-6"
              />
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ $t('myIssues.emptyAll.title') }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ $t('myIssues.emptyAll.hint') }}
            </p>
          </div>

          <!-- Zero filtered results -->
          <div
            v-else-if="!hasResults"
            class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-sm dark:border-white/10 dark:bg-gray-900/60"
          >
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ $t('myIssues.emptyFiltered.title') }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ $t('myIssues.emptyFiltered.hint') }}
            </p>
            <UButton
              class="mt-4"
              icon="i-lucide-rotate-ccw"
              @click="resetFilters"
            >
              {{ $t('myIssues.emptyFiltered.reset') }}
            </UButton>
          </div>

          <!-- Rows -->
          <ul
            v-else
            class="flex flex-col gap-2"
          >
            <li
              v-for="issue in issues"
              :key="issue.id"
            >
              <NuxtLink
                :to="`/projects/${issue.project.id}/issues/${issue.id}`"
                class="group flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-gray-900/60"
              >
                <UBadge
                  color="neutral"
                  variant="subtle"
                  class="font-mono text-xs"
                >
                  {{ issue.project.key }}
                </UBadge>
                <span class="font-mono text-xs text-slate-500 dark:text-slate-400">
                  #{{ issue.issueNumber }}
                </span>
                <span
                  class="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ issue.title }}
                </span>
                <UBadge
                  :color="IssueStatusColor[issue.status]"
                  variant="subtle"
                  class="shrink-0"
                >
                  {{ IssueStatusLabel[issue.status] }}
                </UBadge>
                <UBadge
                  v-if="issue.environment"
                  :color="EnvironmentColor[issue.environment as Environment]"
                  variant="outline"
                  class="shrink-0"
                >
                  {{ issue.environment }}
                </UBadge>
                <span class="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {{ formatRelative(issue.updatedAt) }}
                </span>
              </NuxtLink>
            </li>
          </ul>

          <!-- Pagination -->
          <div
            v-if="pagination && pagination.totalPages > 1"
            class="flex justify-end"
          >
            <UPagination
              :page="pagination.page"
              :total="pagination.total"
              :items-per-page="pagination.pageSize"
              @update:page="goToPage"
            />
          </div>
        </section>
      </div>
    </div>
  </UDashboardPanel>
</template>
