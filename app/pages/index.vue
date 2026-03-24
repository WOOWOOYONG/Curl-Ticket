<script setup lang="ts">
const user = useSupabaseUser()
const toast = useToast()
const { t } = useI18n()

const searchQuery = ref('')
const debouncedSearch = refDebounced(searchQuery, 300)

const projectsOptions = ref<UseProjectsOptions>({ page: 1, pageSize: 12 })

watch(debouncedSearch, (val) => {
  projectsOptions.value = { ...projectsOptions.value, search: val, page: 1 }
})

const { data: response, status, refresh } = await useProjects(projectsOptions)

const projects = computed(() => response.value?.data ?? [])
const pagination = computed(() => response.value?.pagination)
const summary = computed(() => response.value?.summary)

const totalProjects = computed(() => summary.value?.totalProjects ?? 0)
const totalOpenIssues = computed(() => summary.value?.openIssues ?? 0)
const totalIssues = computed(() => summary.value?.totalIssues ?? 0)
const overallProgress = computed(() => {
  if (totalIssues.value === 0) return 0
  return Math.round(((totalIssues.value - totalOpenIssues.value) / totalIssues.value) * 100)
})

const pageStart = computed(() => {
  if (!pagination.value || pagination.value.total === 0) return 0
  return (pagination.value.page - 1) * pagination.value.pageSize + 1
})
const pageEnd = computed(() => {
  if (!pagination.value || pagination.value.total === 0) return 0
  return Math.min(pagination.value.page * pagination.value.pageSize, pagination.value.total)
})

function goToPage(page: number) {
  projectsOptions.value = { ...projectsOptions.value, page }
}

function getTimeAgo(date: string | null) {
  if (!date) return null
  return useTimeAgo(new Date(date)).value
}

function getProgressPercentage(open: number, total: number) {
  if (total <= 0) return 0
  const resolved = Math.max(total - open, 0)
  return Math.round((resolved / total) * 100)
}

const projectMenuUi = {
  item: 'items-center'
} as const

// Project dropdown menu
function getProjectMenuItems(project: { id: string, name: string }) {
  return [
    [{
      label: t('projects.editProjectMenu'),
      iconVariant: 'edit' as const,
      onSelect: () => navigateTo(`/projects/${project.id}/edit`)
    }, {
      label: t('projects.inviteMembers'),
      iconVariant: 'invite' as const,
      onSelect: () => navigateTo(`/projects/${project.id}/members`)
    }],
    [{
      label: t('projects.deleteProject'),
      iconVariant: 'delete' as const,
      color: 'error' as const,
      onSelect: () => { deleteTarget.value = { id: project.id, name: project.name } }
    }]
  ]
}

// Delete project
const deleteTarget = ref<{ id: string, name: string } | null>(null)
const deleteLoading = ref(false)

async function confirmDelete() {
  if (!deleteTarget.value) return

  deleteLoading.value = true
  try {
    await $fetch(`/api/projects/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('projects.deleted'), color: 'success' })
    deleteTarget.value = null
    refresh()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('projects.deleteFailed')
    const fetchError = error as { data?: { statusMessage?: string } }
    toast.add({
      title: fetchError.data?.statusMessage || message,
      color: 'error'
    })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <div class="relative isolate min-h-full overflow-hidden">
      <div class="page-bg">
        <div class="page-bg-blob-left -top-32 -left-40" />
        <div class="page-bg-blob-right top-10 -right-48" />
        <div class="page-bg-radial" />
        <div class="page-bg-grid" />
      </div>

      <div class="relative z-10 flex flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 rounded-full border border-emerald-100/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold uppercase  text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {{ $t('projects.workspace') }}
            </div>
            <div class="space-y-2">
              <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                {{ $t('projects.title') }}
              </h1>
            </div>
          </div>
          <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              size="lg"
              :placeholder="$t('projects.searchPlaceholder')"
              class="w-full sm:w-80"
              :ui="{ base: 'bg-white/80 dark:bg-gray-900/60 border-slate-200/70 dark:border-white/10' }"
            />
            <UButton
              icon="i-lucide-plus"
              to="/projects/create"
              size="lg"
              class="shadow-sm shadow-emerald-500/20"
            >
              {{ $t('projects.newProject') }}
            </UButton>
          </div>
        </header>

        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
            <div class="flex items-start justify-between">
              <span class="text-[11px] font-semibold uppercase  text-slate-500 dark:text-slate-400">
                {{ $t('stats.total') }}
              </span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                <UIcon
                  name="i-lucide-folder"
                  class="size-4"
                />
              </div>
            </div>
            <div class="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ totalProjects }}
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ $t('stats.activeWorkspaces') }}
            </p>
          </div>

          <div class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
            <div class="flex items-start justify-between">
              <span class="text-[11px] font-semibold uppercase  text-slate-500 dark:text-slate-400">
                {{ $t('stats.open') }}
              </span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100/80 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                <UIcon
                  name="i-lucide-alert-circle"
                  class="size-4"
                />
              </div>
            </div>
            <div class="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ totalOpenIssues }}
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ $t('stats.unresolvedIssues') }}
            </p>
          </div>

          <div class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
            <div class="flex items-start justify-between">
              <span class="text-[11px] font-semibold uppercase  text-slate-500 dark:text-slate-400">
                {{ $t('stats.totalIssues') }}
              </span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                <UIcon
                  name="i-lucide-layers"
                  class="size-4"
                />
              </div>
            </div>
            <div class="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ totalIssues }}
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ $t('stats.loggedEvents') }}
            </p>
          </div>

          <div class="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
            <div class="flex items-start justify-between">
              <span class="text-[11px] font-semibold uppercase  text-slate-500 dark:text-slate-400">
                {{ $t('stats.resolution') }}
              </span>
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                <UIcon
                  name="i-lucide-trending-up"
                  class="size-4"
                />
              </div>
            </div>
            <div class="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
              {{ overallProgress }}%
            </div>
            <div class="mt-3 h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800">
              <div
                class="h-2 rounded-full bg-linear-to-r from-emerald-500 via-emerald-400 to-lime-400 transition-all"
                :style="{ width: `${overallProgress}%` }"
              />
            </div>
          </div>
        </section>

        <section class="flex flex-col gap-4">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ $t('projects.overview') }}
              </h2>
              <UBadge
                color="neutral"
                variant="subtle"
                class="font-mono text-xs"
              >
                {{ pagination?.total ?? 0 }} {{ $t('common.visible') }}
              </UBadge>
            </div>
          </div>

          <div
            v-if="status === 'pending'"
            class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <USkeleton
              v-for="i in 6"
              :key="i"
              class="h-52 rounded-2xl"
            />
          </div>

          <div
            v-else-if="projects.length === 0"
            class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
          >
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <UIcon
                name="i-lucide-folder-plus"
                class="size-6"
              />
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ $t('projects.startFirst') }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ $t('projects.startFirstHint') }}
            </p>
            <UButton
              to="/projects/create"
              class="mt-6"
              icon="i-lucide-plus"
            >
              {{ $t('projects.createProject') }}
            </UButton>
          </div>

          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <NuxtLink
              v-for="project in projects"
              :key="project.id"
              :to="`/projects/${project.id}`"
              class="group"
            >
              <article class="relative h-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-gray-900/60">
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_60%)] opacity-0 transition duration-300 group-hover:opacity-100 dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_60%)]" />
                <div class="relative z-10 flex h-full flex-col gap-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3">
                      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        <UIcon
                          name="i-lucide-folder"
                          class="size-5"
                        />
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <h3 class="truncate text-base font-semibold text-slate-900 dark:text-white">
                            {{ project.name }}
                          </h3>
                          <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                            {{ project.key }}
                          </span>
                        </div>
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {{ project.description || $t('common.noDescription') }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <UDropdownMenu
                        v-if="project.ownerId === user?.sub"
                        :items="getProjectMenuItems(project)"
                        :ui="projectMenuUi"
                      >
                        <template #item-leading="{ item }">
                          <span class="flex size-4 shrink-0 items-center justify-center self-center">
                            <ProjectMenuIcon
                              :variant="item.iconVariant"
                              class="size-4"
                            />
                          </span>
                        </template>

                        <UButton
                          icon="i-lucide-ellipsis"
                          variant="ghost"
                          size="xs"
                          color="neutral"
                          aria-label="Project actions"
                          @click.prevent.stop
                        />
                      </UDropdownMenu>
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ project.openIssues }}</span>
                      {{ $t('stats.open') }}
                    </span>
                    <span>
                      <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ project.totalIssues }}</span>
                      {{ $t('stats.total') }}
                    </span>
                  </div>

                  <div class="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800">
                    <div
                      class="h-2 rounded-full bg-linear-to-r from-emerald-500 via-emerald-400 to-lime-400 transition-all"
                      :style="{ width: `${getProgressPercentage(project.openIssues, project.totalIssues)}%` }"
                    />
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-500 dark:text-slate-400">
                      {{ $t('projects.resolutionRate') }}
                    </span>
                    <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {{ getProgressPercentage(project.openIssues, project.totalIssues) }}%
                    </span>
                  </div>

                  <div class="flex items-center justify-between pt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <span class="text-[11px] text-slate-500 dark:text-slate-400">
                      <template v-if="project.lastUpdated">
                        Updated {{ getTimeAgo(project.lastUpdated) }}
                      </template>
                      <template v-else>
                        {{ $t('projects.newProjectLabel') }}
                      </template>
                    </span>
                    <span class="text-emerald-600 transition group-hover:translate-x-1 dark:text-emerald-400">
                      {{ $t('projects.viewDetails') }} →
                    </span>
                  </div>
                </div>
              </article>
            </NuxtLink>

            <NuxtLink
              to="/projects/create"
              class="group"
            >
              <div class="relative flex h-full min-h-52 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-emerald-200/70 bg-white/60 p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-gray-900/50 dark:hover:bg-emerald-500/10">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <UIcon
                    name="i-lucide-plus"
                    class="size-6"
                  />
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ $t('projects.createNewProject') }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ $t('projects.createDescription') }}
                  </p>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div
            v-if="pagination && pagination.totalPages > 1"
            class="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/75 px-4 py-3 text-sm text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              {{ $t('common.showing') }} <span class="font-medium text-slate-700 dark:text-slate-300">{{ pageStart }}</span>
              {{ $t('common.to') }} <span class="font-medium text-slate-700 dark:text-slate-300">{{ pageEnd }}</span>
              {{ $t('common.of') }} <span class="font-medium text-slate-700 dark:text-slate-300">{{ pagination.total }}</span> {{ $t('common.results') }}
            </span>
            <UPagination
              :page="projectsOptions.page"
              :total="pagination.total"
              :items-per-page="projectsOptions.pageSize"
              @update:page="goToPage"
            />
          </div>
        </section>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :open="!!deleteTarget"
      :title="$t('projects.deleteProject')"
      :description="$t('projects.deleteConfirm', { name: deleteTarget?.name })"
      :confirm-label="$t('common.delete')"
      :loading="deleteLoading"
      :on-confirm="confirmDelete"
      :on-cancel="() => { deleteTarget = null }"
      @update:open="(val: boolean) => { if (!val && !deleteLoading) deleteTarget = null }"
    />
  </UDashboardPanel>
</template>
