<script setup lang="ts">
import { getHttpMethodColor } from '~/constants/http'
import {
  IssueStatusColor,
  IssueStatusLabel,
  EnvironmentColor,
  IssueTypeLabel,
  IssueTypeIcon,
  IssueTypeColor
} from '~/constants/issue'
import { maskValue, formatJson, buildCurlCommand, toHeadersArray } from '~/utils/issue'
import type { IssueResponse } from '~/types/issue'
import type { Issue } from '~~/shared/schemas/issue'
import { issueStatuses, IssueType } from '~~/shared/constants'
import type { IssueStatus } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only',
  ssr: false
})

const route = useRoute()
const { copyToClipboard } = useCopy()
const toast = useToast()
const { t } = useI18n()

const projectId = computed(() => route.params.id as string)
const issueId = computed(() => route.params.issueId as string)
const backToListUrl = computed(() => {
  const type = route.query.type
  return type ? `/projects/${projectId.value}?type=${type}` : `/projects/${projectId.value}`
})

// Fetch issue data
const { data: issueResponse, status } = await useFetch<IssueResponse>(
  () => `/api/projects/${projectId.value}/issues/${issueId.value}`,
  {
    key: getIssueCacheKey(projectId.value, issueId.value)
  }
)

const issue = computed<Issue | undefined>(() => issueResponse.value?.data)
const friendlyId = computed(() => issueResponse.value?.friendlyId)

const isApiBug = computed(
  () => !issue.value?.issueType || issue.value.issueType === IssueType.ApiBug
)
const isTask = computed(() => issue.value?.issueType === IssueType.Task)

const statusOptions = issueStatuses.map((status) => ({
  label: IssueStatusLabel[status],
  value: status,
  chip: {
    color: IssueStatusColor[status]
  }
}))
const selectedStatus = ref<IssueStatus | undefined>()

function getStatusChip(value: string) {
  return statusOptions.find((item) => item.value === value)?.chip
}
const updatingStatus = ref(false)

watch(
  issue,
  (currentIssue) => {
    if (!currentIssue) return
    selectedStatus.value = currentIssue.status
  },
  { immediate: true }
)

// Headers as array
const headersArray = computed(() => toHeadersArray(issue.value?.requestHeaders))

// Tab items — always show all 3 tabs (for API Bug only)
const tabItems = computed(() => [
  { label: t('issues.requestBody'), slot: 'request-body' as const },
  { label: t('issues.requestHeaders'), slot: 'headers' as const },
  { label: t('issues.response'), slot: 'response' as const }
])

// Last updated relative time
const lastUpdated = computed(() => {
  if (!issue.value?.updatedAt) return ''
  return useTimeAgo(issue.value.updatedAt).value
})

// Copy functions
function copyUrl() {
  if (!issue.value?.url) return
  copyToClipboard(issue.value.url, { description: 'URL copied to clipboard' })
}

function copyCurl() {
  if (!issue.value) return
  const curlCmd =
    issue.value.rawCurl ||
    (issue.value.method && issue.value.url
      ? buildCurlCommand(
          issue.value as {
            method: string
            url: string
            requestHeaders?: Record<string, string> | null
            requestBody?: unknown
          }
        )
      : '')
  if (curlCmd) {
    copyToClipboard(curlCmd, { description: 'cURL command copied to clipboard' })
  }
}

function copyRequestBody() {
  if (!issue.value?.requestBody) return
  copyToClipboard(formatJson(issue.value.requestBody), {
    description: 'Request body copied to clipboard'
  })
}

function copyResponseBody() {
  if (!issue.value?.responseBody) return
  copyToClipboard(formatJson(issue.value.responseBody), {
    description: 'Response body copied to clipboard'
  })
}

watch(selectedStatus, async (nextStatus) => {
  if (!nextStatus || !issue.value) return
  if (nextStatus === issue.value.status) return
  await updateIssueStatus(nextStatus)
})

// Delete issue
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

async function deleteIssue() {
  deleteLoading.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/issues/${issueId.value}`, {
      method: 'DELETE'
    })
    clearNuxtData(getIssuesCacheKey(projectId.value))
    clearNuxtData(getIssueCacheKey(projectId.value, issueId.value))
    toast.add({
      title: t('issues.deleteSuccess'),
      color: 'success'
    })
    navigateTo(`/projects/${projectId.value}`)
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({
      title: t('common.error'),
      description: error.data?.message || t('issues.deleteFailed'),
      color: 'error'
    })
  } finally {
    deleteLoading.value = false
    showDeleteModal.value = false
  }
}

async function updateIssueStatus(nextStatus: IssueStatus) {
  if (!issue.value || updatingStatus.value) return

  const previousStatus = issue.value.status
  updatingStatus.value = true

  try {
    const response = await $fetch<IssueResponse>(
      `/api/projects/${projectId.value}/issues/${issueId.value}`,
      {
        method: 'PATCH',
        body: {
          status: nextStatus
        }
      }
    )

    issueResponse.value = response

    toast.add({
      title: t('issues.statusUpdated'),
      description: t('issues.statusUpdateHint', {
        id: response.friendlyId,
        status: IssueStatusLabel[response.data.status] || response.data.status
      }),
      color: 'success'
    })
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    selectedStatus.value = previousStatus
    toast.add({
      title: t('common.error'),
      description: error.data?.message || t('issues.statusUpdateFailed'),
      color: 'error'
    })
  } finally {
    updatingStatus.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <UContainer class="max-w-7xl py-8">
      <!-- Loading State -->
      <template v-if="status === 'pending'">
        <div class="space-y-6">
          <USkeleton class="h-12 w-full" />
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="space-y-6 lg:col-span-2">
              <USkeleton class="h-64 w-full rounded-lg" />
              <USkeleton class="h-64 w-full rounded-lg" />
            </div>
            <div class="space-y-6">
              <USkeleton class="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </template>

      <!-- Error State -->
      <template v-else-if="!issue">
        <div class="flex flex-col items-center justify-center py-16">
          <UIcon
            name="i-lucide-alert-circle"
            class="mb-4 size-16 text-gray-400"
          />
          <h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('issues.notFound') }}
          </h2>
          <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {{ $t('issues.notFoundHint') }}
          </p>
          <UButton
            :to="backToListUrl"
            variant="outline"
            icon="i-lucide-arrow-left"
          >
            {{ $t('issues.backToProject') }}
          </UButton>
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <!-- Header Section -->
        <div class="mb-8 space-y-4 border-b border-slate-200/70 pb-6 dark:border-slate-800/70">
          <!-- Back Link + Friendly ID -->
          <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <NuxtLink
              :to="backToListUrl"
              class="group inline-flex items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-4 transition-transform group-hover:-translate-x-0.5"
              />
              <span>{{ $t('issues.backToIssues') }}</span>
            </NuxtLink>
            <span class="text-slate-300 dark:text-slate-700">|</span>
            <span class="font-mono font-medium text-slate-700 dark:text-slate-300"
              >{{ $t('issues.issueId') }} {{ friendlyId }}</span
            >
            <UBadge
              :color="IssueTypeColor[issue.issueType]"
              variant="subtle"
              class="ml-1 gap-1"
            >
              <UIcon
                :name="IssueTypeIcon[issue.issueType]"
                class="size-3"
              />
              {{ IssueTypeLabel[issue.issueType] }}
            </UBadge>
          </div>

          <!-- Title + Actions Row -->
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1 space-y-2">
              <h1
                class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
              >
                {{ issue.title }}
              </h1>
              <p
                v-if="issue.description"
                class="max-w-2xl text-sm leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-300"
              >
                {{ issue.description }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <USelect
                v-model="selectedStatus"
                :items="statusOptions"
                :disabled="updatingStatus"
                value-key="value"
                class="w-40"
              >
                <template #leading="{ modelValue, ui }">
                  <UChip
                    v-if="modelValue"
                    v-bind="getStatusChip(modelValue as string)"
                    inset
                    standalone
                    :class="ui.itemLeadingChip()"
                  />
                </template>
              </USelect>
              <UIcon
                v-if="updatingStatus"
                name="i-lucide-loader-circle"
                class="size-4 animate-spin text-slate-500"
              />
              <UButton
                v-if="isApiBug"
                color="primary"
                icon="i-lucide-terminal"
                @click="copyCurl"
              >
                {{ $t('issues.copyAsCurl') }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <!-- Left Column -->
          <div class="space-y-6 lg:col-span-2">
            <!-- API Bug: Method + URL Row -->
            <template v-if="isApiBug && issue.method && issue.url">
              <div
                class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-900/50"
              >
                <UBadge
                  :color="getHttpMethodColor(issue.method)"
                  variant="subtle"
                  class="px-3 py-1.5 font-mono text-sm font-bold"
                >
                  {{ issue.method }}
                </UBadge>
                <code
                  class="min-w-0 flex-1 truncate font-mono text-sm text-slate-900 dark:text-white"
                >
                  {{ issue.url }}
                </code>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-copy"
                  @click="copyUrl"
                />
              </div>

              <!-- Info Row: Status Code | Environment -->
              <div
                class="flex items-center divide-x divide-slate-200/70 rounded-xl border border-slate-200/70 bg-white dark:divide-slate-800/70 dark:border-slate-800/70 dark:bg-slate-900/50"
              >
                <div
                  v-if="issue.responseStatus"
                  class="flex-1 px-5 py-3"
                >
                  <span
                    class="mb-1 block text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
                    >{{ $t('issues.statusCode') }}</span
                  >
                  <div class="flex items-center gap-2">
                    <span
                      class="size-2 rounded-full"
                      :class="{
                        'bg-emerald-500': issue.responseStatus >= 200 && issue.responseStatus < 300,
                        'bg-blue-500': issue.responseStatus >= 300 && issue.responseStatus < 400,
                        'bg-amber-500': issue.responseStatus >= 400 && issue.responseStatus < 500,
                        'bg-red-500': issue.responseStatus >= 500
                      }"
                    />
                    <span class="font-mono font-bold text-slate-900 dark:text-white">{{
                      issue.responseStatus
                    }}</span>
                  </div>
                </div>
                <div
                  v-if="issue.environment"
                  class="flex-1 px-5 py-3"
                >
                  <span
                    class="mb-1 block text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
                    >{{ $t('issues.environment') }}</span
                  >
                  <UBadge
                    :color="EnvironmentColor[issue.environment] || 'neutral'"
                    variant="subtle"
                    class="px-2.5 py-0.5 font-semibold"
                  >
                    {{ issue.environment }}
                  </UBadge>
                </div>
              </div>

              <!-- Tabs: Request Body / Request Headers / Response -->
              <UTabs
                :items="tabItems"
                variant="link"
              >
                <!-- Request Body Tab -->
                <template #request-body>
                  <template v-if="issue.requestBody">
                    <div
                      class="relative mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40"
                    >
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-copy"
                        class="absolute top-5 right-5 z-10"
                        @click="copyRequestBody"
                      />
                      <div class="p-4">
                        <JsonCodeBlock
                          :content="formatJson(issue.requestBody)"
                          read-only
                          :show-header="false"
                          line-number-offset-class="pl-10"
                          line-number-padding-top-class="pt-4"
                          content-padding-class="p-0"
                        />
                      </div>
                    </div>
                  </template>
                  <div
                    v-else
                    class="mt-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    {{ $t('issues.noRequestBody') }}
                  </div>
                </template>

                <!-- Headers Tab -->
                <template #headers>
                  <template v-if="headersArray.length > 0">
                    <div
                      class="mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800/70 dark:bg-slate-900/40"
                    >
                      <div class="space-y-2">
                        <div
                          v-for="header in headersArray"
                          :key="header.key"
                          class="flex items-start gap-2 font-mono text-sm"
                        >
                          <span class="min-w-50 font-medium text-emerald-600 dark:text-emerald-400"
                            >{{ header.key }}:</span
                          >
                          <span class="flex-1 break-all text-slate-600 dark:text-slate-400">{{
                            maskValue(header.key, header.value)
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <div
                    v-else
                    class="mt-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    {{ $t('issues.noHeaders') }}
                  </div>
                </template>

                <!-- Response Tab -->
                <template #response>
                  <template v-if="issue.responseBody">
                    <div
                      class="relative mt-4 overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-900/40"
                    >
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-copy"
                        class="absolute top-5 right-5 z-10"
                        @click="copyResponseBody"
                      />
                      <div class="p-4">
                        <JsonCodeBlock
                          :content="formatJson(issue.responseBody)"
                          read-only
                          :show-header="false"
                          line-number-offset-class="pl-10"
                          line-number-padding-top-class="pt-4"
                          content-padding-class="p-0"
                        />
                      </div>
                    </div>
                  </template>
                  <div
                    v-else
                    class="mt-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    {{ $t('issues.noResponse') }}
                  </div>
                </template>
              </UTabs>
            </template>

            <!-- Task: Description prominently displayed -->
            <template v-if="isTask">
              <div
                class="rounded-xl border border-slate-200/70 bg-white p-6 dark:border-slate-800/70 dark:bg-slate-900/50"
              >
                <h3
                  class="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
                >
                  {{ $t('issues.description') }}
                </h3>
                <p
                  v-if="issue.description"
                  class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300"
                >
                  {{ issue.description }}
                </p>
                <p
                  v-else
                  class="text-sm text-slate-400 italic dark:text-slate-500"
                >
                  {{ $t('common.noDescription') }}
                </p>
              </div>
            </template>

            <!-- Comments Section -->
            <IssueComments
              :project-id="projectId"
              :issue-id="issueId"
            />
          </div>

          <!-- Right Column: Metadata Sidebar -->
          <div class="space-y-6">
            <div
              class="space-y-5 rounded-xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950"
            >
              <h3
                class="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400"
              >
                {{ $t('issues.metadata') }}
              </h3>

              <!-- Type -->
              <div class="space-y-1">
                <span class="text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">{{
                  $t('issues.type')
                }}</span>
                <div class="flex items-center gap-1.5">
                  <UIcon
                    :name="IssueTypeIcon[issue.issueType]"
                    class="size-4 text-slate-600 dark:text-slate-300"
                  />
                  <span class="text-sm font-medium text-slate-900 dark:text-white">
                    {{ IssueTypeLabel[issue.issueType] }}
                  </span>
                </div>
              </div>

              <!-- Created -->
              <div class="space-y-1">
                <span class="text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">{{
                  $t('issues.created')
                }}</span>
                <p class="text-sm font-medium text-slate-900 dark:text-white">
                  {{ formatDate(issue.createdAt) }}
                </p>
              </div>

              <!-- Last Updated -->
              <div class="space-y-1">
                <span class="text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">{{
                  $t('issues.lastUpdated')
                }}</span>
                <p class="text-sm font-medium text-slate-900 dark:text-white">
                  {{ lastUpdated }}
                </p>
              </div>

              <!-- Assignee -->
              <div class="space-y-1">
                <span class="text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {{ $t('issues.assignee') }}
                </span>
                <p
                  v-if="issue.assignee"
                  class="text-sm font-medium text-slate-900 dark:text-white"
                >
                  {{ issue.assignee.name || issue.assignee.email }}
                </p>
                <p
                  v-else
                  class="text-sm text-slate-400 italic dark:text-slate-500"
                >
                  {{ $t('issues.unassigned') }}
                </p>
              </div>

              <!-- Edit Details Button -->
              <UButton
                :to="`/projects/${projectId}/issues/${issueId}/edit`"
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
                block
              >
                {{ $t('issues.editDetails') }}
              </UButton>

              <!-- Delete Issue Button -->
              <UButton
                color="error"
                variant="outline"
                icon="i-lucide-trash-2"
                block
                @click="showDeleteModal = true"
              >
                {{ $t('issues.deleteIssue') }}
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UContainer>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model:open="showDeleteModal"
      :title="$t('issues.deleteIssue')"
      :description="$t('issues.deleteConfirm', { id: friendlyId || issueId })"
      :confirm-label="$t('common.delete')"
      :loading="deleteLoading"
      :on-confirm="deleteIssue"
      :on-cancel="
        () => {
          showDeleteModal = false
        }
      "
    />
  </div>
</template>
