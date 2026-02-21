<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { createIssueSchema, type CreateIssueInput, type Issue } from '~~/shared/schemas/issue'
import { environments, Environment, HttpMethod, IssueStatus } from '~~/shared/constants'
import { getHttpMethodColor } from '~/constants/http'
import { maskValue, formatJson, detectEnvironment } from '~/utils/issue'

const issueFormSchema = createIssueSchema.omit({ projectId: true })

const props = withDefaults(defineProps<{
  mode?: 'create' | 'edit'
}>(), {
  mode: 'create'
})

const isEditMode = computed(() => props.mode === 'edit')

const route = useRoute()
const toast = useToast()
const { copyToClipboard } = useCopy()
const projectId = computed(() => route.params.id as string)
const issueId = computed(() => route.params.issueId as string | undefined)

const curlPlaceholderText = `curl -X POST https://api.example.com/v1/issues \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token...' \
  `

// Fetch project info
const { data: projectResponse } = await useProject(projectId)
const project = computed(() => projectResponse.value?.data)

interface IssueResponse {
  data: Issue
  friendlyId: string
}

const emptyIssueResponse = ref<IssueResponse | null>(null)
const emptyIssueStatus = ref<'idle' | 'pending' | 'success' | 'error'>('success')

const issueFetch = isEditMode.value
  ? await useFetch<IssueResponse>(() => `/api/projects/${projectId.value}/issues/${issueId.value}`)
  : { data: emptyIssueResponse, status: emptyIssueStatus }

const issueResponse = issueFetch.data
const issueStatus = issueFetch.status
const issue = computed(() => issueResponse.value?.data)
const isLoadingIssue = computed(() => isEditMode.value && issueStatus.value === 'pending')
const isIssueMissing = computed(() => isEditMode.value && issueStatus.value !== 'pending' && !issue.value)

// Form state
const loading = ref(false)
const curlInput = ref('')
const parseError = ref<string | null>(null)
const isParsed = ref(false)

// Response body input state
const responseBodyInput = ref('')

type IssueFormState = Omit<CreateIssueInput, 'projectId'>

function createDefaultState(): IssueFormState {
  return {
    title: '',
    description: '',
    rawCurl: null,
    method: HttpMethod.GET,
    url: '',
    environment: Environment.Dev,
    requestHeaders: null,
    requestBody: null,
    responseStatus: null,
    responseBody: null,
    status: IssueStatus.Open
  }
}

const state = ref<IssueFormState>(createDefaultState())
const initialState = ref<IssueFormState>(createDefaultState())
const isInitialized = ref(!isEditMode.value)
const initialRawCurl = ref('')

// Headers as array for display
const headersArray = computed(() => {
  if (!state.value.requestHeaders) return []
  return Object.entries(state.value.requestHeaders).map(([key, value]) => ({ key, value }))
})

function buildStateFromIssue(currentIssue: Issue): IssueFormState {
  return {
    title: currentIssue.title ?? '',
    description: currentIssue.description ?? '',
    rawCurl: currentIssue.rawCurl ?? null,
    method: currentIssue.method ?? HttpMethod.GET,
    url: currentIssue.url ?? '',
    environment: currentIssue.environment ?? Environment.Dev,
    requestHeaders: currentIssue.requestHeaders ?? null,
    requestBody: currentIssue.requestBody ?? null,
    responseStatus: currentIssue.responseStatus ?? null,
    responseBody: currentIssue.responseBody ?? null,
    status: currentIssue.status ?? IssueStatus.Open
  }
}

watch(issue, async (currentIssue) => {
  if (!isEditMode.value || !currentIssue || isInitialized.value) return
  const nextState = buildStateFromIssue(currentIssue)
  Object.assign(state.value, nextState)
  initialState.value = { ...nextState }
  const nextRawCurl = currentIssue.rawCurl ?? ''
  curlInput.value = nextRawCurl
  initialRawCurl.value = nextRawCurl
  isParsed.value = Boolean(nextRawCurl)
  // Initialize response body input and highlight
  responseBodyInput.value = formatJson(currentIssue.responseBody)
  isInitialized.value = true
}, { immediate: true })

watch(curlInput, (value) => {
  state.value.rawCurl = value.trim() ? value : null
})

// Sync response body input with state
function handleResponseBodyInput(value: string) {
  if (!value.trim()) {
    state.value.responseBody = null
    return
  }
  try {
    state.value.responseBody = JSON.parse(value)
  } catch {
    // Keep raw string if not valid JSON
    state.value.responseBody = value
  }
}

function handleResponseBodyBlur() {
  // Try to format JSON on blur
  if (!responseBodyInput.value.trim()) {
    state.value.responseBody = null
    return
  }
  try {
    const parsed = JSON.parse(responseBodyInput.value)
    responseBodyInput.value = JSON.stringify(parsed, null, 2)
    state.value.responseBody = parsed
  } catch {
    // Keep as-is if not valid JSON
  }
}

// Collapsible sections state
const headersExpanded = ref(false)
const requestBodyExpanded = ref(true)
const responseExpanded = ref(false)

// Calculate payload size
const payloadSize = computed(() => {
  if (!state.value.requestBody) return null
  const str = typeof state.value.requestBody === 'string'
    ? state.value.requestBody
    : JSON.stringify(state.value.requestBody)
  const bytes = new Blob([str]).size
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
})

const requestBodyFormatted = computed(() => formatJson(state.value.requestBody))

// Copy URL to clipboard
function copyUrl() {
  if (!state.value.url) return
  copyToClipboard(state.value.url, { description: 'URL copied to clipboard' })
}

// Copy request body to clipboard
function copyRequestBody() {
  if (!state.value.requestBody) return
  copyToClipboard(formatJson(state.value.requestBody), { description: 'Request body copied to clipboard' })
}

// Options
const environmentOptions = environments.map(env => ({
  label: env,
  value: env
}))

const submitLabel = computed(() => (isEditMode.value ? 'Save Changes' : 'Create Issue'))
const submitIcon = computed(() => (isEditMode.value ? 'i-lucide-save' : 'i-lucide-plus'))
const readyLabel = computed(() => (isEditMode.value ? 'Ready to Save' : 'Ready to Create'))

// Check if form is ready to submit
const isReadyToSubmit = computed(() => {
  if (isEditMode.value && !isInitialized.value) return false
  return Boolean(state.value.title.trim() && state.value.url.trim() && state.value.method)
})

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
    state.value.url = parsed.url || ''
    state.value.method = (parsed.method || HttpMethod.GET) as typeof state.value.method
    state.value.requestHeaders = parsed.headers || null
    state.value.requestBody = parsed.body || null
    state.value.environment = detectEnvironment(state.value.url)
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
  const baseState = isEditMode.value ? initialState.value : createDefaultState()
  Object.assign(state.value, baseState)
  curlInput.value = isEditMode.value ? initialRawCurl.value : ''
  responseBodyInput.value = formatJson(baseState.responseBody)
  parseError.value = null
  isParsed.value = isEditMode.value ? Boolean(curlInput.value) : false
}

// Submit form
async function onSubmit(event: FormSubmitEvent<IssueFormState>) {
  loading.value = true

  try {
    if (isEditMode.value && !issueId.value) {
      throw new Error('Issue ID is required')
    }

    const endpoint = isEditMode.value
      ? `/api/projects/${projectId.value}/issues/${issueId.value}`
      : `/api/projects/${projectId.value}/issues`

    const rawCurl = curlInput.value.trim()
    const response = await $fetch<IssueResponse>(endpoint, {
      method: isEditMode.value ? 'PATCH' : 'POST',
      body: {
        ...event.data,
        rawCurl: rawCurl ? rawCurl : null
      }
    })

    toast.add({
      title: isEditMode.value ? 'Issue updated' : 'Issue created',
      description: `Issue ${response.friendlyId} has been ${isEditMode.value ? 'updated' : 'created'} successfully.`,
      color: 'success'
    })

    navigateTo(isEditMode.value
      ? `/projects/${projectId.value}/issues/${issueId.value}`
      : `/projects/${projectId.value}`)
  } catch (err: unknown) {
    const fallback = isEditMode.value ? 'Failed to update issue' : 'Failed to create issue'
    const message = err instanceof Error ? err.message : fallback
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
      <template v-if="isLoadingIssue">
        <div class="space-y-6">
          <USkeleton class="h-8 w-48" />
          <USkeleton class="h-96 w-full rounded-lg" />
          <USkeleton class="h-96 w-full rounded-lg" />
        </div>
      </template>
      <template v-else-if="isIssueMissing">
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
      <template v-else>
        <!-- Back link -->
        <div class="mb-6">
          <NuxtLink
            :to="isEditMode ? `/projects/${projectId}/issues/${issueId}` : `/projects/${projectId}`"
            class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors group"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4 group-hover:-translate-x-0.5 transition-transform"
            />
            <span>
              Back to
              <template v-if="isEditMode">
                Issue
              </template>
              <template v-else>
                {{ project?.name || 'Project' }}
              </template>
            </span>
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
              <div class="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800">
                <!-- Terminal Header -->
                <div class="bg-linear-to-r from-gray-800 to-gray-900 dark:from-gray-900 dark:to-gray-950 px-4 py-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <!-- Terminal window dots -->
                      <div class="flex items-center gap-1.5">
                        <span class="size-3 rounded-full bg-red-500" />
                        <span class="size-3 rounded-full bg-yellow-500" />
                        <span class="size-3 rounded-full bg-green-500" />
                      </div>
                      <div class="flex items-center gap-2 ml-2">
                        <UIcon
                          name="i-lucide-terminal"
                          class="size-4 text-gray-400"
                        />
                        <span class="text-sm font-medium text-gray-300">
                          cURL Input
                        </span>
                      </div>
                    </div>
                    <UButton
                      v-if="curlInput"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-trash-2"
                      class="text-gray-400"
                      @click="clearCurl"
                    >
                      Clear
                    </UButton>
                  </div>
                </div>

                <!-- cURL Input Area -->
                <div class="bg-gray-900 dark:bg-gray-900 p-4 relative">
                  <!-- Prompt indicator -->
                  <div class="absolute left-4 top-4 text-emerald-400 font-mono text-sm select-none">
                    $
                  </div>
                  <textarea
                    v-model="curlInput"
                    :placeholder="curlPlaceholderText"
                    rows="12"
                    class="w-full pl-5 bg-transparent text-emerald-300 font-mono text-sm resize-none focus:outline-none placeholder:text-gray-600 leading-relaxed"
                  />
                </div>

                <!-- Parse Button -->
                <div class="p-4 bg-gray-100 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
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
                    class="font-semibold"
                    @click="parseCurl"
                  >
                    Parse and Extract
                  </UButton>
                </div>
              </div>

              <!-- Response Section (Collapsible) -->
              <div class="rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3.5 bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 hover:from-gray-100 hover:to-gray-150 dark:hover:from-gray-800 dark:hover:to-gray-850 transition-all"
                  @click="responseExpanded = !responseExpanded"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center size-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                      <UIcon
                        name="i-lucide-arrow-down-left"
                        class="size-4 text-amber-600 dark:text-amber-400"
                      />
                    </div>
                    <div class="text-left">
                      <span class="font-semibold text-gray-900 dark:text-white text-sm block">
                        Response
                      </span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        Optional - Add response details
                      </span>
                    </div>
                  </div>
                  <UIcon
                    :name="responseExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    class="size-5 text-gray-400"
                  />
                </button>

                <div
                  v-if="responseExpanded"
                  class="p-5 space-y-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                >
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
                    label="Response"
                    name="responseBody"
                  >
                    <JsonCodeBlock
                      v-model="responseBodyInput"
                      placeholder="{&quot;error&quot;: &quot;Something went wrong&quot;}"
                      :rows="8"
                      @input="handleResponseBodyInput"
                      @blur="handleResponseBodyBlur"
                    />
                  </UFormField>
                </div>
              </div>
            </div>

            <!-- Right Panel: Extracted Details -->
            <div class="space-y-6">
              <UCard
                :ui="{
                  root: 'overflow-hidden shadow-lg',
                  header: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 border-b border-gray-200 dark:border-gray-800'
                }"
              >
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center justify-center size-8 rounded-lg bg-primary/10 dark:bg-primary/20">
                        <UIcon
                          name="i-lucide-file-text"
                          class="size-4 text-primary"
                        />
                      </div>
                      <div>
                        <h2 class="font-semibold text-gray-900 dark:text-white text-base">
                          Issue Details
                        </h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          Fill in the extracted information
                        </p>
                      </div>
                    </div>
                    <UBadge
                      v-if="isReadyToSubmit"
                      color="success"
                      variant="subtle"
                      class="gap-1.5 px-3 py-1"
                    >
                      <UIcon
                        name="i-lucide-check-circle"
                        class="size-3.5"
                      />
                      {{ readyLabel }}
                    </UBadge>
                    <UBadge
                      v-else
                      color="neutral"
                      variant="outline"
                      class="gap-1.5 px-3 py-1"
                    >
                      <UIcon
                        name="i-lucide-circle-dashed"
                        class="size-3.5"
                      />
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
                    <div class="p-4 bg-white dark:bg-gray-900">
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
                        class="mt-3"
                      >
                        <JsonCodeBlock
                          :content="requestBodyFormatted"
                          read-only
                          :show-header="false"
                          line-number-offset-class="pl-10"
                          line-number-padding-top-class="pt-4"
                          content-padding-class="p-4"
                        />
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
                        :disabled="!isReadyToSubmit"
                        :icon="submitIcon"
                        size="lg"
                      >
                        {{ submitLabel }}
                      </UButton>
                    </div>
                  </div>
                </template>
              </UCard>
            </div>
          </div>
        </UForm>
      </template>
    </UContainer>
  </div>
</template>
