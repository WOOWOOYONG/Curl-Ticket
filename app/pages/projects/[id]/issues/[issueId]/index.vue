<script setup lang="ts">
import { getHttpMethodColor } from '~/constants/http'
import { IssueStatusColor, IssueStatusIcon, getHttpStatusCodeColor } from '~/constants/issue'
import { maskValue, formatJson, getJsonLines } from '~/utils/issue'
import type { Issue } from '~~/shared/schemas/issue'

definePageMeta({
  layout: 'header-only',
  ssr: false
})

const route = useRoute()
const { copyToClipboard } = useCopy()

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
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <UContainer class="max-w-7xl py-6">
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
        <div class="mb-8">
          <!-- Back Link -->
          <NuxtLink
            :to="`/projects/${projectId}`"
            class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors group mb-6"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4 group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Back to Issues</span>
          </NuxtLink>

          <!-- Title Section -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-3">
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
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {{ issue.title }}
              </h1>
              <p
                v-if="issue.description"
                class="text-gray-600 dark:text-gray-400 leading-relaxed"
              >
                {{ issue.description }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :to="`/projects/${projectId}/issues/${issueId}/edit`"
                color="neutral"
                variant="outline"
                icon="i-lucide-pencil"
              >
                Edit Issue
              </UButton>
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
                header: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700'
              }"
            >
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700">
                    <UIcon
                      name="i-lucide-arrow-up-right"
                      class="size-5 text-primary"
                    />
                  </div>
                  <h2 class="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-sm">
                    HTTP Request
                  </h2>
                </div>
              </template>

              <div class="space-y-4">
                <!-- Method + URL -->
                <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <UBadge
                    :color="getHttpMethodColor(issue.method)"
                    variant="subtle"
                    class="font-mono font-bold text-sm px-3 py-1.5"
                  >
                    {{ issue.method }}
                  </UBadge>
                  <code class="flex-1 text-sm text-gray-900 dark:text-white font-mono truncate">
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
                  class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    @click="requestHeadersExpanded = !requestHeadersExpanded"
                  >
                    <div class="flex items-center gap-2">
                      <UIcon
                        :name="requestHeadersExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-4 text-gray-500 transition-transform"
                      />
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
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
                    class="p-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800"
                  >
                    <div class="space-y-2">
                      <div
                        v-for="header in headersArray"
                        :key="header.key"
                        class="flex items-start gap-2 font-mono text-sm"
                      >
                        <span class="text-teal-600 dark:text-teal-400 font-medium min-w-[200px]">{{ header.key }}:</span>
                        <span class="text-gray-600 dark:text-gray-400 flex-1 break-all">{{ maskValue(header.key, header.value) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Request Body -->
                <div
                  v-if="issue.requestBody"
                  class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      @click="requestBodyExpanded = !requestBodyExpanded"
                    >
                      <UIcon
                        :name="requestBodyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-4 text-gray-500"
                      />
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
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
                    class="bg-gray-900 dark:bg-gray-950 relative"
                  >
                    <div class="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 dark:bg-gray-900 flex flex-col items-center pt-4 text-xs text-gray-500 font-mono select-none border-r border-gray-700">
                      <span
                        v-for="(_, index) in getJsonLines(issue.requestBody)"
                        :key="index"
                        class="h-5 leading-5"
                      >{{ index + 1 }}</span>
                    </div>
                    <pre class="p-4 pl-14 overflow-x-auto"><code class="text-sm font-mono text-emerald-400">{{ formatJson(issue.requestBody) }}</code></pre>
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
                header: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700'
              }"
            >
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700">
                    <UIcon
                      name="i-lucide-info"
                      class="size-5 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <h2 class="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-sm">
                    Metadata
                  </h2>
                </div>
              </template>

              <div class="space-y-4">
                <!-- Status -->
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    Status
                  </label>
                  <UBadge
                    :color="IssueStatusColor[issue.status]"
                    variant="soft"
                    class="gap-1.5 px-3 py-2"
                  >
                    <UIcon
                      :name="IssueStatusIcon[issue.status]"
                      class="size-3.5"
                    />
                    {{ issue.status }}
                  </UBadge>
                </div>

                <!-- Environment -->
                <div>
                  <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
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
                <div class="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500 dark:text-gray-400">Created</span>
                    <time class="font-mono text-gray-900 dark:text-white">
                      {{ formatDate(issue.createdAt) }}
                    </time>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500 dark:text-gray-400">Updated</span>
                    <time class="font-mono text-gray-900 dark:text-white">
                      {{ formatDate(issue.updatedAt) }}
                    </time>
                  </div>
                </div>
              </div>
            </UCard>

            <!-- Response Card -->
            <UCard
              :ui="{
                header: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700'
              }"
            >
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700">
                    <UIcon
                      name="i-lucide-arrow-down-left"
                      class="size-5 text-orange-500"
                    />
                  </div>
                  <h2 class="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-sm">
                    HTTP Response
                  </h2>
                </div>
              </template>

              <div class="space-y-4">
                <!-- Response Status Code -->
                <div
                  v-if="issue.responseStatus"
                  class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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
                  class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <button
                      type="button"
                      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      @click="responseBodyExpanded = !responseBodyExpanded"
                    >
                      <UIcon
                        :name="responseBodyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-4 text-gray-500"
                      />
                      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
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
                    class="bg-gray-900 dark:bg-gray-950 relative"
                  >
                    <div class="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 dark:bg-gray-900 flex flex-col items-center pt-4 text-xs text-gray-500 font-mono select-none border-r border-gray-700">
                      <span
                        v-for="(_, index) in getJsonLines(issue.responseBody)"
                        :key="index"
                        class="h-5 leading-5"
                      >{{ index + 1 }}</span>
                    </div>
                    <pre class="p-4 pl-14 overflow-x-auto"><code class="text-sm font-mono text-rose-400">{{ formatJson(issue.responseBody) }}</code></pre>
                  </div>
                </div>

                <!-- No Response Data -->
                <div
                  v-if="!issue.responseStatus && !issue.responseBody"
                  class="text-center py-8"
                >
                  <UIcon
                    name="i-lucide-inbox"
                    class="size-12 text-gray-300 dark:text-gray-700 mx-auto mb-3"
                  />
                  <p class="text-sm text-gray-500 dark:text-gray-400">
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
/* Smooth expand/collapse animations */
button {
  transition: all 0.2s ease;
}

/* Code block styling enhancements */
pre {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

pre::-webkit-scrollbar {
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: transparent;
}

pre::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
