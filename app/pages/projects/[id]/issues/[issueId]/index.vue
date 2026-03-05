<script setup lang="ts">
import { getHttpMethodColor } from '~/constants/http'
import { IssueStatusColor, IssueStatusLabel, EnvironmentColor, IssueTypeLabel, IssueTypeIcon, IssueTypeColor } from '~/constants/issue'
import { maskValue, formatJson, buildCurlCommand, toHeadersArray } from '~/utils/issue'
import type { IssueResponse } from '~/types/issue'
import type { Issue } from '~~/shared/schemas/issue'
import { issueStatuses, IssueType } from '~~/shared/constants'
import type { IssueStatusType } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only',
  ssr: false
})

const route = useRoute()
const { copyToClipboard } = useCopy()
const toast = useToast()

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

const isApiBug = computed(() => !issue.value?.issueType || issue.value.issueType === IssueType.ApiBug)
const isTask = computed(() => issue.value?.issueType === IssueType.Task)

const statusOptions = issueStatuses.map(status => ({
  label: IssueStatusLabel[status],
  value: status,
  chip: {
    color: IssueStatusColor[status]
  }
}))
const selectedStatus = ref<IssueStatusType | undefined>()

function getStatusChip(value: string) {
  return statusOptions.find(item => item.value === value)?.chip
}
const updatingStatus = ref(false)

watch(issue, (currentIssue) => {
  if (!currentIssue) return
  selectedStatus.value = currentIssue.status
}, { immediate: true })

// Headers as array
const headersArray = computed(() => toHeadersArray(issue.value?.requestHeaders))

// Tab items — always show all 3 tabs (for API Bug only)
const tabItems = [
  { label: 'Request Body', slot: 'request-body' as const },
  { label: 'Request Headers', slot: 'headers' as const },
  { label: 'Response', slot: 'response' as const }
]

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
  const curlCmd = issue.value.rawCurl || (issue.value.method && issue.value.url ? buildCurlCommand(issue.value as { method: string, url: string, requestHeaders?: Record<string, string> | null, requestBody?: unknown }) : '')
  if (curlCmd) {
    copyToClipboard(curlCmd, { description: 'cURL command copied to clipboard' })
  }
}

function copyRequestBody() {
  if (!issue.value?.requestBody) return
  copyToClipboard(formatJson(issue.value.requestBody), { description: 'Request body copied to clipboard' })
}

function copyResponseBody() {
  if (!issue.value?.responseBody) return
  copyToClipboard(formatJson(issue.value.responseBody), { description: 'Response body copied to clipboard' })
}

watch(selectedStatus, async (nextStatus) => {
  if (!nextStatus || !issue.value) return
  if (nextStatus === issue.value.status) return
  await updateIssueStatus(nextStatus)
})

async function updateIssueStatus(nextStatus: IssueStatusType) {
  if (!issue.value || updatingStatus.value) return

  const previousStatus = issue.value.status
  updatingStatus.value = true

  try {
    const response = await $fetch<IssueResponse>(`/api/projects/${projectId.value}/issues/${issueId.value}`, {
      method: 'PATCH',
      body: {
        status: nextStatus
      }
    })

    issueResponse.value = response

    toast.add({
      title: 'Status updated',
      description: `Issue ${response.friendlyId} status is now ${IssueStatusLabel[response.data.status] || response.data.status}.`,
      color: 'success'
    })
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    selectedStatus.value = previousStatus
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to update issue status',
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
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
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
            class="size-16 text-gray-400 mb-4"
          />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Issue not found
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            The issue you're looking for doesn't exist or has been deleted.
          </p>
          <UButton
            :to="backToListUrl"
            variant="outline"
            icon="i-lucide-arrow-left"
          >
            Back to Project
          </UButton>
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <!-- Header Section -->
        <div class="mb-8 space-y-4 border-b border-slate-200/70 dark:border-slate-800/70 pb-6">
          <!-- Back Link + Friendly ID -->
          <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <NuxtLink
              :to="backToListUrl"
              class="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors group"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-4 group-hover:-translate-x-0.5 transition-transform"
              />
              <span>Back to Issues</span>
            </NuxtLink>
            <span class="text-slate-300 dark:text-slate-700">|</span>
            <span class="font-mono font-medium text-slate-700 dark:text-slate-300">Issue {{ friendlyId }}</span>
            <UBadge
              :color="IssueTypeColor[issue.issueType]"
              variant="subtle"
              class="gap-1 ml-1"
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
            <div class="space-y-2 flex-1 min-w-0">
              <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {{ issue.title }}
              </h1>
              <p
                v-if="issue.description"
                class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl"
              >
                {{ issue.description }}
              </p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
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
                class="size-4 text-slate-500 animate-spin"
              />
              <UButton
                v-if="isApiBug"
                color="primary"
                icon="i-lucide-terminal"
                @click="copyCurl"
              >
                Copy as cURL
              </UButton>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column -->
          <div class="lg:col-span-2 space-y-6">
            <!-- API Bug: Method + URL Row -->
            <template v-if="isApiBug && issue.method && issue.url">
              <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900/50 p-4">
                <UBadge
                  :color="getHttpMethodColor(issue.method)"
                  variant="subtle"
                  class="font-mono font-bold text-sm px-3 py-1.5"
                >
                  {{ issue.method }}
                </UBadge>
                <code class="flex-1 min-w-0 text-sm text-slate-900 dark:text-white font-mono truncate">
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
              <div class="flex items-center rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900/50 divide-x divide-slate-200/70 dark:divide-slate-800/70">
                <div
                  v-if="issue.responseStatus"
                  class="flex-1 px-5 py-3"
                >
                  <span class="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold block mb-1">Status Code</span>
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
                    <span class="font-mono font-bold text-slate-900 dark:text-white">{{ issue.responseStatus }}</span>
                  </div>
                </div>
                <div
                  v-if="issue.environment"
                  class="flex-1 px-5 py-3"
                >
                  <span class="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold block mb-1">Environment</span>
                  <UBadge
                    :color="EnvironmentColor[issue.environment] || 'neutral'"
                    variant="subtle"
                    class="font-semibold px-2.5 py-0.5"
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
                    <div class="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-white dark:bg-slate-900/40 relative">
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
                    No request body recorded
                  </div>
                </template>

                <!-- Headers Tab -->
                <template #headers>
                  <template v-if="headersArray.length > 0">
                    <div class="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-white dark:bg-slate-900/40 p-4">
                      <div class="space-y-2">
                        <div
                          v-for="header in headersArray"
                          :key="header.key"
                          class="flex items-start gap-2 font-mono text-sm"
                        >
                          <span class="text-emerald-600 dark:text-emerald-400 font-medium min-w-50">{{ header.key }}:</span>
                          <span class="text-slate-600 dark:text-slate-400 flex-1 break-all">{{ maskValue(header.key, header.value) }}</span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <div
                    v-else
                    class="mt-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    No request headers recorded
                  </div>
                </template>

                <!-- Response Tab -->
                <template #response>
                  <template v-if="issue.responseBody">
                    <div class="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-white dark:bg-slate-900/40 relative">
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
                    No response data recorded
                  </div>
                </template>
              </UTabs>
            </template>

            <!-- Task: Description prominently displayed -->
            <template v-if="isTask">
              <div class="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-900/50 p-6">
                <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p
                  v-if="issue.description"
                  class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap"
                >
                  {{ issue.description }}
                </p>
                <p
                  v-else
                  class="text-sm text-slate-400 dark:text-slate-500 italic"
                >
                  No description provided
                </p>
              </div>
            </template>
          </div>

          <!-- Right Column: Metadata Sidebar -->
          <div class="space-y-6">
            <div class="rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950 p-5 space-y-5">
              <h3 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Metadata
              </h3>

              <!-- Type -->
              <div class="space-y-1">
                <span class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</span>
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
                <span class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created</span>
                <p class="text-sm font-medium text-slate-900 dark:text-white">
                  {{ formatDate(issue.createdAt) }}
                </p>
              </div>

              <!-- Last Updated -->
              <div class="space-y-1">
                <span class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</span>
                <p class="text-sm font-medium text-slate-900 dark:text-white">
                  {{ lastUpdated }}
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
                Edit Details
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UContainer>
  </div>
</template>
