<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { createIssueSchema, type CreateIssueInput } from '~~/shared/schemas/issue'
import { environments, Environment, HttpMethod, IssueStatus } from '~~/shared/constants'
import { getHttpMethodColor } from '~/constants/http'
import type { Environment as EnvironmentType } from '~~/shared/constants'

const issueFormSchema = createIssueSchema.omit({ projectId: true })

definePageMeta({
  layout: 'header-only',
  ssr: false
})

const route = useRoute()
const toast = useToast()
const { copyToClipboard } = useCopy()
const projectId = computed(() => route.params.id as string)

const curlPlaceholderText = `curl -X POST https://api.example.com/v1/issues \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token...' \
  `

// Fetch project info
const { data: projectResponse } = await useProject(projectId)
const project = computed(() => projectResponse.value?.data)

// Form state
const loading = ref(false)
const curlInput = ref('')
const parseError = ref<string | null>(null)
const isParsed = ref(false)

type IssueFormState = Omit<CreateIssueInput, 'projectId'>

const state = reactive<IssueFormState>({
  title: '',
  description: '',
  method: HttpMethod.GET,
  url: '',
  environment: Environment.Dev,
  requestHeaders: null,
  requestBody: null,
  responseStatus: null,
  responseBody: null,
  status: IssueStatus.Open
})

// Headers as array for display
const headersArray = computed(() => {
  if (!state.requestHeaders) return []
  return Object.entries(state.requestHeaders).map(([key, value]) => ({ key, value }))
})

// Collapsible sections state
const headersExpanded = ref(false)
const requestBodyExpanded = ref(true)

// Calculate payload size
const payloadSize = computed(() => {
  if (!state.requestBody) return null
  const str = typeof state.requestBody === 'string'
    ? state.requestBody
    : JSON.stringify(state.requestBody)
  const bytes = new Blob([str]).size
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
})

// Calculate request body lines for line numbers
const requestBodyLines = computed(() => {
  if (!state.requestBody) return []
  const formatted = formatJson(state.requestBody)
  return formatted.split('\n')
})

// Mask sensitive header values
function maskValue(key: string, value: string): string {
  const sensitiveKeys = ['authorization', 'x-api-key', 'api-key', 'token', 'secret']
  if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
    const prefix = value.split(' ')[0]
    if (prefix && value.length > prefix.length + 6) {
      return `${prefix} ${'*'.repeat(6)}`
    }
    return '*'.repeat(6)
  }
  return value
}

// Copy URL to clipboard
function copyUrl() {
  if (!state.url) return
  copyToClipboard(state.url, { description: 'URL copied to clipboard' })
}

// Copy request body to clipboard
function copyRequestBody() {
  if (!state.requestBody) return
  copyToClipboard(formatJson(state.requestBody), { description: 'Request body copied to clipboard' })
}

// Options
const environmentOptions = environments.map(env => ({
  label: env,
  value: env
}))

// Check if form is ready to submit
const isReadyToCreate = computed(() => {
  return state.title.trim() && state.url.trim() && state.method
})

// Auto-detect environment from URL
function detectEnvironment(url: string): EnvironmentType {
  try {
    const urlObj = new URL(url)
    const host = urlObj.hostname.toLowerCase()

    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
      return Environment.Local
    }
    if (host.includes('staging') || host.includes('stg')) {
      return Environment.Staging
    }
    if (host.includes('dev') || host.includes('development')) {
      return Environment.Dev
    }
    if (host.includes('prod') || host.includes('production') || !host.includes('.')) {
      return Environment.Prod
    }
  } catch {
    // Invalid URL, keep default
  }
  return Environment.Dev
}

// Parse cURL command
const parsing = ref(false)

async function parseCurl() {
  parseError.value = null

  if (!curlInput.value.trim()) {
    parseError.value = 'Please enter a cURL command'
    return
  }

  parsing.value = true

  try {
    interface ParsedCurl {
      url: string
      method: string
      headers: Record<string, string> | null
      body: unknown
    }

    const response = await $fetch<{ data: ParsedCurl }>('/api/curl/parse', {
      method: 'POST',
      body: { curl: curlInput.value }
    })

    const parsed = response.data

    // Fill form with parsed data
    state.url = parsed.url || ''
    state.method = (parsed.method || HttpMethod.GET) as typeof state.method
    state.requestHeaders = parsed.headers || null
    state.requestBody = parsed.body || null
    state.environment = detectEnvironment(state.url) as typeof state.environment
    isParsed.value = true

    toast.add({
      title: 'Parsed successfully',
      description: 'cURL command has been parsed and form fields are filled.',
      color: 'success'
    })
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    parseError.value = error.data?.message || 'Failed to parse cURL command'
  } finally {
    parsing.value = false
  }
}

function clearCurl() {
  curlInput.value = ''
  parseError.value = null
  isParsed.value = false
}

function discardChanges() {
  state.title = ''
  state.description = ''
  state.method = HttpMethod.GET
  state.url = ''
  state.environment = Environment.Dev
  state.requestHeaders = null
  state.requestBody = null
  state.responseStatus = null
  state.responseBody = null
  isParsed.value = false
}

// Format JSON for display
function formatJson(data: unknown): string {
  if (!data) return ''
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// Parse JSON input
function parseJsonInput(value: string): unknown {
  if (!value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

// Submit form
async function onSubmit(event: FormSubmitEvent<IssueFormState>) {
  loading.value = true

  try {
    const response = await $fetch(`/api/projects/${projectId.value}/issues`, {
      method: 'POST',
      body: event.data
    })

    toast.add({
      title: 'Issue created',
      description: `Issue ${response.friendlyId} has been created successfully.`,
      color: 'success'
    })

    navigateTo(`/projects/${projectId.value}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create issue'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen">
    <UContainer class="max-w-7xl py-6">
      <!-- Back link -->
      <div class="mb-6">
        <NuxtLink
          :to="`/projects/${projectId}`"
          class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors group"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4 group-hover:-translate-x-0.5 transition-transform"
          />
          <span>Back to {{ project?.name || 'Project' }}</span>
        </NuxtLink>
      </div>
      <UForm
        :schema="issueFormSchema"
        :state="state"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left Panel: cURL Input -->
          <div class="space-y-6">
            <UCard
              :ui="{
                root: 'overflow-hidden',
                header: 'bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800',
                body: 'p-0'
              }"
            >
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="flex items-center justify-center size-7 rounded-full bg-primary text-white text-sm font-semibold">
                      1
                    </span>
                    <h2 class="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-sm">
                      Input cURL Command
                    </h2>
                  </div>
                  <UButton
                    v-if="curlInput"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-trash-2"
                    @click="clearCurl"
                  >
                    Clear
                  </UButton>
                </div>
              </template>

              <!-- cURL Input Area -->
              <div class="bg-gray-900 dark:bg-gray-950 p-4">
                <textarea
                  v-model="curlInput"
                  :placeholder="curlPlaceholderText"
                  rows="12"
                  class="w-full bg-transparent text-green-400 font-mono text-sm resize-none focus:outline-none placeholder:text-gray-600"
                />
              </div>

              <!-- Parse Button -->
              <div class="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <UAlert
                  v-if="parseError"
                  color="error"
                  variant="soft"
                  :title="parseError"
                  icon="i-lucide-alert-circle"
                  class="mb-4"
                />
                <UButton
                  block
                  size="lg"
                  :disabled="!curlInput.trim()"
                  :loading="parsing"
                  icon="i-lucide-zap"
                  @click="parseCurl"
                >
                  Parse and Extract
                </UButton>
              </div>
            </UCard>

            <!-- Response Section -->
            <UCard
              :ui="{
                header: 'bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
              }"
            >
              <template #header>
                <div class="flex items-center gap-3">
                  <UIcon
                    name="i-lucide-arrow-down-left"
                    class="size-5 text-gray-500"
                  />
                  <h2 class="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-sm">
                    Response (Optional)
                  </h2>
                </div>
              </template>

              <div class="space-y-4">
                <UFormField
                  label="Status Code"
                  name="responseStatus"
                >
                  <UInput
                    v-model.number="state.responseStatus"
                    type="number"
                    placeholder="e.g., 400, 500"
                    :min="100"
                    :max="599"
                  />
                </UFormField>

                <UFormField
                  label="Response Body"
                  name="responseBody"
                >
                  <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                    <div class="bg-gray-100 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                      <span class="text-xs font-medium text-gray-500 uppercase">JSON</span>
                    </div>
                    <textarea
                      :value="formatJson(state.responseBody)"
                      placeholder="{&quot;error&quot;: &quot;Something went wrong&quot;}"
                      rows="5"
                      class="w-full p-3 bg-white dark:bg-gray-950 font-mono text-sm resize-none focus:outline-none"
                      @input="state.responseBody = parseJsonInput(($event.target as HTMLTextAreaElement).value)"
                    />
                  </div>
                </UFormField>
              </div>
            </UCard>
          </div>

          <!-- Right Panel: Extracted Details -->
          <div class="space-y-6">
            <UCard
              :ui="{
                root: 'overflow-hidden',
                header: 'bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'
              }"
            >
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="flex items-center justify-center size-7 rounded-full bg-primary text-white text-sm font-semibold">
                      2
                    </span>
                    <h2 class="font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-sm">
                      Extracted Issue Details
                    </h2>
                  </div>
                  <UBadge
                    v-if="isReadyToCreate"
                    color="success"
                    variant="subtle"
                    class="gap-1"
                  >
                    <UIcon
                      name="i-lucide-check-circle"
                      class="size-3"
                    />
                    Ready to Create
                  </UBadge>
                  <UBadge
                    v-else
                    color="neutral"
                    variant="subtle"
                  >
                    Incomplete
                  </UBadge>
                </div>
              </template>

              <div class="space-y-6">
                <!-- Title -->
                <UFormField
                  label="Issue Title"
                  name="title"
                  required
                  class="w-full"
                >
                  <UInput
                    v-model="state.title"
                    placeholder="Brief description of the issue"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>

                <!-- Environment (editable) -->
                <UFormField
                  label="Environment"
                  name="environment"
                  required
                >
                  <USelect
                    v-model="state.environment"
                    :items="environmentOptions"
                    size="lg"
                    class="w-1/4"
                  />
                </UFormField>

                <!-- Request Preview (read-only) -->
                <div
                  v-if="state.url"
                  class="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  <!-- Header -->
                  <div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Request Preview</span>
                    <UBadge
                      color="neutral"
                      variant="outline"
                      size="xs"
                    >
                      Read Only
                    </UBadge>
                  </div>

                  <!-- Method + URL -->
                  <div class="p-4 bg-white dark:bg-gray-950">
                    <div class="flex items-center gap-3">
                      <UBadge
                        :color="getHttpMethodColor(state.method)"
                        variant="subtle"
                        class="font-mono font-semibold"
                      >
                        {{ state.method }}
                      </UBadge>
                      <span class="flex-1 font-mono text-sm text-gray-900 dark:text-white truncate">
                        {{ state.url }}
                      </span>
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-copy"
                        @click="copyUrl"
                      />
                    </div>
                  </div>

                  <!-- Payload Size -->
                  <div
                    v-if="payloadSize"
                    class="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
                  >
                    <div class="flex items-center gap-2.5">
                      <span class="text-sm font-medium text-gray-600 dark:text-gray-300">Payload Size</span>
                      <UBadge
                        color="info"
                        variant="subtle"
                        size="sm"
                      >
                        {{ payloadSize }}
                      </UBadge>
                    </div>
                  </div>

                  <!-- Headers (collapsible) -->
                  <div
                    v-if="headersArray.length > 0"
                    class="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
                  >
                    <button
                      type="button"
                      class="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      @click="headersExpanded = !headersExpanded"
                    >
                      <UIcon
                        :name="headersExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="size-3"
                      />
                      Request Headers
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        {{ headersArray.length }}
                      </UBadge>
                    </button>
                    <div
                      v-if="headersExpanded"
                      class="mt-3 space-y-1.5 pl-5"
                    >
                      <div
                        v-for="header in headersArray"
                        :key="header.key"
                        class="font-mono text-sm"
                      >
                        <span class="text-teal-600 dark:text-teal-400">{{ header.key }}:</span>
                        <span class="text-gray-500 dark:text-gray-400 ml-1">{{ maskValue(header.key, header.value) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Request Body (collapsible) -->
                  <div
                    v-if="state.requestBody"
                    class="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
                  >
                    <div class="flex items-center justify-between">
                      <button
                        type="button"
                        class="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        @click="requestBodyExpanded = !requestBodyExpanded"
                      >
                        <UIcon
                          :name="requestBodyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                          class="size-3"
                        />
                        Request Body
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
                      class="mt-3 rounded-lg overflow-hidden border border-gray-700"
                    >
                      <div class="bg-gray-900 dark:bg-gray-950 p-4 relative">
                        <div class="absolute left-0 top-0 bottom-0 w-10 bg-gray-800 dark:bg-gray-900 flex flex-col items-center pt-4 text-xs text-gray-500 font-mono select-none">
                          <template
                            v-for="(_, index) in requestBodyLines"
                            :key="index"
                          >
                            <span class="h-5 leading-5">{{ index + 1 }}</span>
                          </template>
                        </div>
                        <pre class="w-full pl-8 bg-transparent text-blue-400 font-mono text-sm overflow-x-auto"><code>{{ formatJson(state.requestBody) }}</code></pre>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- No URL placeholder -->
                <div
                  v-else
                  class="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center"
                >
                  <UIcon
                    name="i-lucide-link"
                    class="size-8 text-gray-300 dark:text-gray-600 mx-auto mb-2"
                  />
                  <p class="text-sm text-gray-400">
                    Parse a cURL command to see request preview
                  </p>
                </div>

                <!-- Description -->
                <UFormField
                  label="Description (Optional)"
                  name="description"
                  class="w-full"
                >
                  <UTextarea
                    v-model="state.description"
                    placeholder="Describe the expected behavior vs actual behavior..."
                    :rows="3"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <!-- Footer Actions -->
              <template #footer>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-400">
                    <template v-if="isParsed">
                      <UIcon
                        name="i-lucide-check"
                        class="size-3 inline mr-1"
                      />
                      Parsed from cURL
                    </template>
                  </span>
                  <div class="flex gap-3">
                    <UButton
                      color="neutral"
                      variant="outline"
                      @click="discardChanges"
                    >
                      Discard
                    </UButton>
                    <UButton
                      type="submit"
                      :loading="loading"
                      :disabled="!isReadyToCreate"
                      icon="i-lucide-plus"
                      size="lg"
                    >
                      Create Issue
                    </UButton>
                  </div>
                </div>
              </template>
            </UCard>
          </div>
        </div>
      </UForm>
    </UContainer>
  </div>
</template>
