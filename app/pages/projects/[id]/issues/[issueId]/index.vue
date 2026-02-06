<script setup lang="ts">
import { getHttpMethodColor } from '~/constants/http'
import { IssueStatusColor, IssueStatusIcon, getHttpStatusCodeColor } from '~/constants/issue'
import { maskValue, formatJson } from '~/utils/issue'
import type { Issue } from '~~/shared/schemas/issue'
import { issueStatuses } from '~~/shared/constants'
import type { IssueStatus } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only',
  ssr: false
})

const route = useRoute()
const { copyToClipboard } = useCopy()
const toast = useToast()

const projectId = computed(() => route.params.id as string)
const issueId = computed(() => route.params.issueId as string)

// Fetch issue data
interface IssueResponse {
  data: Issue
  friendlyId: string
}

const { data: issueResponse, status } = await useFetch<IssueResponse>(
  () => `/api/projects/${projectId.value}/issues/${issueId.value}`
)

const issue = computed<Issue | undefined>(() => issueResponse.value?.data)
const friendlyId = computed(() => issueResponse.value?.friendlyId)

const statusOptions = issueStatuses.map(status => ({
  label: status,
  value: status
}))
const selectedStatus = ref<IssueStatus | undefined>()
const updatingStatus = ref(false)

watch(issue, (currentIssue) => {
  if (!currentIssue) return
  selectedStatus.value = currentIssue.status
}, { immediate: true })

// Collapsible sections
const requestHeadersExpanded = ref(false)
const requestBodyExpanded = ref(true)
const responseBodyExpanded = ref(true)

// Headers as array
const headersArray = computed(() => {
  if (!issue.value?.requestHeaders) return []
  return Object.entries(issue.value.requestHeaders).map(([key, value]) => ({ key, value }))
})

// Format date
function formatDate(date: Date | string) {
  return useDateFormat(date, 'YYYY/MM/DD HH:mm').value
}

// Copy functions
function copyUrl() {
  if (!issue.value?.url) return
  copyToClipboard(issue.value.url, { description: 'URL copied to clipboard' })
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

async function updateIssueStatus(nextStatus: IssueStatus) {
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
      description: `Issue ${response.friendlyId} status is now ${response.data.status}.`,
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
              <USkeleton class="h-64 w-full rounded-lg" />
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
            :to="`/projects/${projectId}`"
            variant="outline"
            icon="i-lucide-arrow-left"
          >
            Back to Project
          </UButton>
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <!-- Header -->
        <div class="mb-8 space-y-4 border-b border-slate-200/70 dark:border-slate-800/70 pb-6">
          <!-- Back Link -->
          <NuxtLink
            :to="`/projects/${projectId}`"
            class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4 group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Back to Issues</span>
          </NuxtLink>

          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <UBadge
                  color="primary"
                  variant="subtle"
                  class="font-mono font-semibold text-sm px-3 py-1.5"
                >
                  {{ friendlyId }}
                </UBadge>
                <UBadge
                  :color="IssueStatusColor[issue.status]"
                  variant="soft"
                  class="gap-1.5 px-3 py-1.5"
                >
                  <UIcon
                    :name="IssueStatusIcon[issue.status]"
                    class="size-3.5"
                  />
                  {{ issue.status }}
                </UBadge>
                <UBadge
                  color="neutral"
                  variant="outline"
                  class="px-3 py-1.5"
                >
                  {{ issue.environment }}
                </UBadge>
              </div>
              <h1 class="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900 dark:text-white">
                {{ issue.title }}
              </h1>
              <p
                v-if="issue.description"
                class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl"
              >
                {{ issue.description }}
              </p>
            </div>
            <div class="flex flex-col items-start gap-3 lg:items-end">
              <UButton
                :to="`/projects/${projectId}/issues/${issueId}/edit`"
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
              >
                Edit Issue
              </UButton>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                <span class="uppercase tracking-[0.25em]">Created</span>
                <time class="ml-2 font-mono text-slate-900 dark:text-white">
                  {{ formatDate(issue.createdAt) }}
                </time>
                <span class="mx-2 text-slate-300 dark:text-slate-700">/</span>
                <span class="uppercase tracking-[0.25em]">Updated</span>
                <time class="ml-2 font-mono text-slate-900 dark:text-white">
                  {{ formatDate(issue.updatedAt) }}
                </time>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: Request Details -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Request Overview -->
            <UCard
              :ui="{
                root: 'rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950',
                header: 'bg-transparent border-b border-slate-200/60 dark:border-slate-800/70'
              }"
            >
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UIcon
                        name="i-lucide-arrow-up-right"
                        class="size-5"
                      />
                    </div>
                    <div>
                      <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        HTTP Request
                      </p>
                      <p class="text-sm font-medium text-slate-900 dark:text-white">
                        Payload overview
                      </p>
                    </div>
                  </div>
                </div>
              </template>

              <div class="space-y-5">
                <!-- Method + URL -->
                <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/50 p-4">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Method
                    </span>
                    <UBadge
                      :color="getHttpMethodColor(issue.method)"
                      variant="subtle"
                      class="font-mono font-bold text-sm px-3 py-1.5"
                    >
                      {{ issue.method }}
                    </UBadge>
                  </div>
                  <span class="hidden h-5 w-px bg-slate-200 dark:bg-slate-800 sm:block" />
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

                <!-- Request Headers -->
                <div
                  v-if="headersArray.length > 0"
                  class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-white/70 dark:bg-slate-900/40"
                >
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition-colors"
                    @click="requestHeadersExpanded = !requestHeadersExpanded"
                  >
                    <div class="flex items-center gap-2">
                      <UIcon
                        :name="requestHeadersExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-4 text-slate-500 transition-transform"
                      />
                      <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.18em]">
                        Request Headers
                      </span>
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        {{ headersArray.length }}
                      </UBadge>
                    </div>
                  </button>
                  <div
                    v-if="requestHeadersExpanded"
                    class="p-4 border-t border-slate-200/60 dark:border-slate-800/70"
                  >
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
                </div>

                <!-- Request Body -->
                <div
                  v-if="issue.requestBody"
                  class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-white/70 dark:bg-slate-900/40"
                >
                  <div class="flex items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/70">
                    <button
                      type="button"
                      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      @click="requestBodyExpanded = !requestBodyExpanded"
                    >
                      <UIcon
                        :name="requestBodyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-4 text-slate-500"
                      />
                      <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.18em]">
                        Request Body
                      </span>
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        JSON
                      </UBadge>
                    </button>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-copy"
                      @click="copyRequestBody"
                    />
                  </div>
                  <div
                    v-if="requestBodyExpanded"
                    class="p-4"
                  >
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
              </div>
            </UCard>
          </div>

          <!-- Right Column: Metadata & Response -->
          <div class="space-y-6">
            <!-- Metadata Card -->
            <UCard
              :ui="{
                root: 'rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950',
                header: 'bg-transparent border-b border-slate-200/60 dark:border-slate-800/70'
              }"
            >
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="flex size-10 items-center justify-center rounded-xl bg-slate-900/10 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    <UIcon
                      name="i-lucide-info"
                      class="size-5"
                    />
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Metadata
                    </p>
                    <p class="text-sm font-medium text-slate-900 dark:text-white">
                      Context & timeline
                    </p>
                  </div>
                </div>
              </template>

              <div class="space-y-4">
                <!-- Status -->
                <div class="rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/50 p-3">
                  <label class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-3 block">
                    Status
                  </label>
                  <div class="flex items-center gap-2">
                    <USelect
                      v-model="selectedStatus"
                      :items="statusOptions"
                      class="flex-1"
                      :disabled="updatingStatus"
                    />
                    <UIcon
                      v-if="updatingStatus"
                      name="i-lucide-loader-circle"
                      class="size-4 text-slate-500 animate-spin"
                    />
                  </div>
                </div>

                <!-- Environment -->
                <div class="rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/40 p-3">
                  <label class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em] mb-2 block">
                    Environment
                  </label>
                  <UBadge
                    color="neutral"
                    variant="outline"
                    class="px-3 py-2 text-sm"
                  >
                    {{ issue.environment }}
                  </UBadge>
                </div>

                <!-- Timestamps -->
                <div class="rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white/70 dark:bg-slate-900/40 p-3 space-y-3">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Created</span>
                    <time class="font-mono text-slate-900 dark:text-white">
                      {{ formatDate(issue.createdAt) }}
                    </time>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Updated</span>
                    <time class="font-mono text-slate-900 dark:text-white">
                      {{ formatDate(issue.updatedAt) }}
                    </time>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Response Card -->
            <UCard
              :ui="{
                root: 'rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950',
                header: 'bg-transparent border-b border-slate-200/60 dark:border-slate-800/70'
              }"
            >
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <UIcon
                      name="i-lucide-arrow-down-left"
                      class="size-5"
                    />
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      HTTP Response
                    </p>
                    <p class="text-sm font-medium text-slate-900 dark:text-white">
                      What came back
                    </p>
                  </div>
                </div>
              </template>

              <div class="space-y-4">
                <!-- Response Status Code -->
                <div
                  v-if="issue.responseStatus"
                  class="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/50"
                >
                  <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                    Status Code
                  </span>
                  <UBadge
                    :color="getHttpStatusCodeColor(issue.responseStatus)"
                    variant="subtle"
                    class="font-mono font-bold text-lg px-3 py-1.5"
                  >
                    {{ issue.responseStatus }}
                  </UBadge>
                </div>

                <!-- Response Body -->
                <div
                  v-if="issue.responseBody"
                  class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 overflow-hidden bg-white/70 dark:bg-slate-900/40"
                >
                  <div class="flex items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/70">
                    <button
                      type="button"
                      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      @click="responseBodyExpanded = !responseBodyExpanded"
                    >
                      <UIcon
                        :name="responseBodyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-4 text-slate-500"
                      />
                      <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-[0.18em]">
                        Response Body
                      </span>
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        JSON
                      </UBadge>
                    </button>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-copy"
                      @click="copyResponseBody"
                    />
                  </div>
                  <div
                    v-if="responseBodyExpanded"
                    class="p-4"
                  >
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

                <!-- No Response Data -->
                <div
                  v-if="!issue.responseStatus && !issue.responseBody"
                  class="text-center py-8 text-slate-500 dark:text-slate-400"
                >
                  <UIcon
                    name="i-lucide-inbox"
                    class="size-12 text-slate-300 dark:text-slate-700 mx-auto mb-3"
                  />
                  <p class="text-sm">
                    No response data recorded
                  </p>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </UContainer>
  </div>
</template>

<style scoped>
button {
  transition: all 0.2s ease;
}
</style>
