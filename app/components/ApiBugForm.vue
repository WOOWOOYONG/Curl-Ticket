<script setup lang="ts">
import { environments, HttpMethod, Environment } from '~~/shared/constants'
import type { IssueStatus } from '~~/shared/constants'
import { getHttpMethodColor } from '~/constants/http'
import {
  maskValue,
  formatJson,
  detectEnvironment,
  toHeadersArray,
  formatPayloadSize
} from '~/utils/issue'

export interface ApiBugFormState {
  title: string
  description: string | null | undefined
  rawCurl: string | null | undefined
  method: HttpMethod
  url: string
  environment: Environment
  requestHeaders: Record<string, string> | null | undefined
  requestBody: unknown
  responseStatus: number | null | undefined
  responseBody: unknown
  status: IssueStatus
  assigneeId: string | null
}

const state = defineModel<ApiBugFormState>('state', { required: true })

const props = defineProps<{
  isEditMode: boolean
  curlInput: string
  responseBodyInput: string
}>()

const emit = defineEmits<{
  'update:curlInput': [value: string]
  'update:responseBodyInput': [value: string]
}>()

const toast = useToast()
const { copyToClipboard } = useCopy()
const { t } = useI18n()

const curlPlaceholderText = `curl -X POST https://api.example.com/v1/issues \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token...' \
  `

const localCurlInput = computed({
  get: () => props.curlInput,
  set: (val: string) => emit('update:curlInput', val)
})

const localResponseBodyInput = computed({
  get: () => props.responseBodyInput,
  set: (val: string) => emit('update:responseBodyInput', val)
})

// 重置 parse 帶入的欄位
function resetParsedState() {
  isParsed.value = false
  parseError.value = null
  state.value.url = ''
  state.value.method = HttpMethod.GET
  state.value.requestHeaders = null
  state.value.requestBody = null
  state.value.environment = Environment.Dev
}

// 監聯 cURL 輸入：清空時一併重置 parsed 欄位（含編輯模式）
watch(localCurlInput, (value) => {
  if (!value.trim() && (isParsed.value || state.value.url)) {
    resetParsedState()
  }
})

// Headers as array for display
const headersArray = computed(() => toHeadersArray(state.value.requestHeaders))

// Collapsible sections state
const headersExpanded = ref(false)
const requestBodyExpanded = ref(true)
const responseExpanded = ref(false)

// Calculate payload size
const payloadSize = computed(() => formatPayloadSize(state.value.requestBody))

const requestBodyFormatted = computed(() => formatJson(state.value.requestBody))

// Copy URL to clipboard
function copyUrl() {
  if (!state.value.url) return
  copyToClipboard(state.value.url, { description: 'URL copied to clipboard' })
}

// Copy request body to clipboard
function copyRequestBody() {
  if (!state.value.requestBody) return
  copyToClipboard(formatJson(state.value.requestBody), {
    description: 'Request body copied to clipboard'
  })
}

// Options
const environmentOptions = environments.map((env) => ({
  label: env,
  value: env
}))

// Parse cURL command
const parseError = ref<string | null>(null)
const parsing = ref(false)
const isParsed = ref(false)

async function parseCurl() {
  parseError.value = null

  if (!localCurlInput.value.trim()) {
    parseError.value = t('apiBug.parseEmpty')
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
      body: { curl: localCurlInput.value }
    })

    const parsed = response.data

    // Fill form with parsed data
    state.value.url = parsed.url || ''
    state.value.method = (parsed.method || HttpMethod.GET) as HttpMethod
    state.value.requestHeaders = parsed.headers || null
    state.value.requestBody = parsed.body || null
    state.value.environment = detectEnvironment(state.value.url)
    isParsed.value = true

    toast.add({
      title: t('apiBug.parsedSuccess'),
      description: t('apiBug.parsedHint'),
      color: 'success'
    })
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    parseError.value = error.data?.message || t('apiBug.parseFailed')
  } finally {
    parsing.value = false
  }
}

function clearCurl() {
  localCurlInput.value = ''
  resetParsedState()
}

// Sync response body input with state
function handleResponseBodyInput(value: string) {
  if (!value.trim()) {
    state.value.responseBody = null
    return
  }
  try {
    state.value.responseBody = JSON.parse(value)
  } catch {
    state.value.responseBody = value
  }
}

function handleResponseBodyBlur() {
  if (!localResponseBodyInput.value.trim()) {
    state.value.responseBody = null
    return
  }
  try {
    const parsed = JSON.parse(localResponseBodyInput.value)
    localResponseBodyInput.value = JSON.stringify(parsed, null, 2)
    state.value.responseBody = parsed
  } catch {
    // Keep as-is if not valid JSON
  }
}

// Initialize isParsed for edit mode
function initParsedState(hasCurl: boolean) {
  isParsed.value = hasCurl
}

defineExpose({ isParsed, clearCurl, initParsedState })
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <!-- Left Panel: cURL Input -->
    <div class="space-y-6">
      <div class="overflow-hidden rounded-xl border border-gray-200 shadow-lg dark:border-gray-800">
        <!-- Terminal Header -->
        <div
          class="bg-linear-to-r from-gray-800 to-gray-900 px-4 py-3 dark:from-gray-900 dark:to-gray-950"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="size-3 rounded-full bg-red-500" />
                <span class="size-3 rounded-full bg-yellow-500" />
                <span class="size-3 rounded-full bg-green-500" />
              </div>
              <div class="ml-2 flex items-center gap-2">
                <UIcon
                  name="i-lucide-terminal"
                  class="size-4 text-gray-400"
                />
                <span class="text-sm font-medium text-gray-300">
                  {{ t('apiBug.curlInput') }}
                </span>
              </div>
            </div>
            <UButton
              v-if="localCurlInput"
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-trash-2"
              class="text-gray-400"
              @click="clearCurl"
            >
              {{ t('common.clear') }}
            </UButton>
          </div>
        </div>

        <!-- cURL Input Area -->
        <div class="relative bg-gray-900 p-4 dark:bg-gray-900">
          <div class="absolute top-4 left-4 font-mono text-sm text-emerald-400 select-none">$</div>
          <textarea
            v-model="localCurlInput"
            :placeholder="curlPlaceholderText"
            rows="12"
            class="w-full resize-none bg-transparent pl-5 font-mono text-sm leading-relaxed text-emerald-300 placeholder:text-gray-600 focus:outline-none"
          />
        </div>

        <!-- Parse Button -->
        <div
          class="border-t border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-gray-900/50"
        >
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
            :disabled="!localCurlInput.trim()"
            :loading="parsing"
            icon="i-lucide-zap"
            class="font-semibold"
            @click="parseCurl"
          >
            {{ t('apiBug.parseAndExtract') }}
          </UButton>
        </div>
      </div>

      <!-- Response Section (Collapsible) -->
      <div class="overflow-hidden rounded-xl border border-gray-200 shadow-md dark:border-gray-800">
        <button
          type="button"
          class="hover:to-gray-150 dark:hover:to-gray-850 flex w-full items-center justify-between bg-linear-to-r from-gray-50 to-gray-100 px-4 py-3.5 transition-all hover:from-gray-100 dark:from-gray-900 dark:to-gray-900/80 dark:hover:from-gray-800"
          @click="responseExpanded = !responseExpanded"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 dark:bg-amber-500/20"
            >
              <UIcon
                name="i-lucide-reply"
                class="size-4 text-amber-600 dark:text-amber-400"
              />
            </div>
            <div class="text-left">
              <span class="block text-sm font-semibold text-gray-900 dark:text-white">
                {{ t('apiBug.responseSection') }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('apiBug.responseHint') }}
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
          class="space-y-5 border-t border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
        >
          <UFormField
            :label="t('issues.statusCode')"
            name="responseStatus"
          >
            <UInput
              v-model.number="state.responseStatus"
              inputmode="numeric"
              pattern="[0-9]*"
              class="w-1/4"
              :placeholder="t('apiBug.statusCodePlaceholder')"
            />
          </UFormField>

          <UFormField
            :label="t('apiBug.responseLabel')"
            name="responseBody"
          >
            <JsonCodeBlock
              v-model="localResponseBodyInput"
              placeholder='{"error": "Something went wrong"}'
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
          header:
            'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 border-b border-gray-200 dark:border-gray-800'
        }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="bg-primary/10 dark:bg-primary/20 flex size-8 items-center justify-center rounded-lg"
              >
                <UIcon
                  name="i-lucide-file-text"
                  class="text-primary size-4"
                />
              </div>
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ t('apiBug.issueDetails') }}
                </h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t('apiBug.fillInfo') }}
                </p>
              </div>
            </div>
            <UBadge
              v-if="state.title.trim() && state.url.trim()"
              color="success"
              variant="subtle"
              class="gap-1.5 px-3 py-1"
            >
              <UIcon
                name="i-lucide-check-circle"
                class="size-3.5"
              />
              {{ isEditMode ? t('apiBug.readyToSave') : t('apiBug.readyToCreate') }}
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
              {{ t('apiBug.incomplete') }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Title -->
          <UFormField
            :label="t('apiBug.issueTitle')"
            name="title"
            required
            class="w-full"
          >
            <UInput
              v-model="state.title"
              :placeholder="t('apiBug.issueTitlePlaceholder')"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <!-- Environment (editable) -->
          <UFormField
            :label="t('issues.environment')"
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
          <UFormField name="url">
            <div
              v-if="state.url"
              class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <!-- Header -->
              <div
                class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{
                  t('apiBug.requestPreview')
                }}</span>
                <UBadge
                  color="neutral"
                  variant="outline"
                  size="xs"
                >
                  {{ t('apiBug.readOnly') }}
                </UBadge>
              </div>

              <!-- Method + URL -->
              <div class="bg-white p-4 dark:bg-gray-900">
                <div class="flex items-center gap-3">
                  <UBadge
                    :color="getHttpMethodColor(state.method)"
                    variant="subtle"
                    class="font-mono font-semibold"
                  >
                    {{ state.method }}
                  </UBadge>
                  <span class="flex-1 truncate font-mono text-sm text-gray-900 dark:text-white">
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
                class="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div class="flex items-center gap-2.5">
                  <span class="text-sm font-medium text-gray-600 dark:text-gray-300">{{
                    t('apiBug.payloadSize')
                  }}</span>
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
                class="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <button
                  type="button"
                  class="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase transition-colors hover:text-gray-700 dark:hover:text-gray-300"
                  @click="headersExpanded = !headersExpanded"
                >
                  <UIcon
                    :name="headersExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                    class="size-3"
                  />
                  {{ t('issues.requestHeaders') }}
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
                    <span class="ml-1 text-gray-500 dark:text-gray-400">{{
                      maskValue(header.key, header.value)
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Request Body (collapsible) -->
              <div
                v-if="state.requestBody"
                class="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div class="flex items-center justify-between">
                  <button
                    type="button"
                    class="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase transition-colors hover:text-gray-700 dark:hover:text-gray-300"
                    @click="requestBodyExpanded = !requestBodyExpanded"
                  >
                    <UIcon
                      :name="
                        requestBodyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'
                      "
                      class="size-3"
                    />
                    {{ t('issues.requestBody') }}
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
              class="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-800"
            >
              <UIcon
                name="i-lucide-link"
                class="mx-auto mb-2 size-8 text-gray-300 dark:text-gray-600"
              />
              <p class="text-sm text-gray-400">
                {{ t('apiBug.parsePrompt') }}
              </p>
            </div>
          </UFormField>

          <!-- Description -->
          <UFormField
            :label="t('apiBug.descriptionOptional')"
            name="description"
            class="w-full"
          >
            <UTextarea
              v-model="state.description"
              :placeholder="t('apiBug.descriptionPlaceholder')"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>
    </div>
  </div>
</template>
