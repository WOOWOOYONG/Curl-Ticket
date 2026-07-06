<script setup lang="ts">
import { Environment, HttpMethod, IssueStatus, IssueType } from '~~/shared/constants'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ApiBugFormState } from '~/components/ApiBugForm.vue'
import type { TaskFormState } from '~/components/TaskForm.vue'
import { issueTypeTabs } from '~/constants/issue'
import type { IssueResponse } from '~/types/issue'
import { formatJson } from '~/utils/issue'
import { createApiBugValidationSchema, createTaskValidationSchema } from '~/utils/validation'

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit'
  }>(),
  {
    mode: 'create'
  }
)

const isEditMode = computed(() => props.mode === 'edit')

const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const projectId = computed(() => route.params.id as string)
const issueId = computed(() => route.params.issueId as string | undefined)

const { data: projectResponse } = await useProject(projectId)
const project = computed(() => projectResponse.value?.data)

const { data: membersResponse } = await useProjectMembers(projectId)
const assigneeOptions = computed(() => {
  const members = membersResponse.value?.data ?? []
  return members.map((member) => ({
    label: member.name || member.email || member.userId,
    value: member.userId
  }))
})

const emptyIssueResponse = ref<IssueResponse | null>(null)
const emptyIssueStatus = ref<'idle' | 'pending' | 'success' | 'error'>('success')

const issueFetch = isEditMode.value
  ? await useFetch<IssueResponse>(
      () => `/api/projects/${projectId.value}/issues/${issueId.value}`,
      {
        key: () => getIssueCacheKey(projectId.value, issueId.value || '')
      }
    )
  : { data: emptyIssueResponse, status: emptyIssueStatus }

const issueResponse = issueFetch.data
const issueStatus = issueFetch.status
const issue = computed(() => issueResponse.value?.data)
const isLoadingIssue = computed(() => isEditMode.value && issueStatus.value === 'pending')
const isIssueMissing = computed(
  () => isEditMode.value && issueStatus.value !== 'pending' && !issue.value
)

type IssueData = IssueResponse['data']

function createEmptyApiBugState(): ApiBugFormState {
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
    status: IssueStatus.Open,
    assigneeId: null
  }
}

function createEmptyTaskState(): TaskFormState {
  return {
    title: '',
    description: '',
    status: IssueStatus.Open,
    assigneeId: null
  }
}

const initialIssueType = isEditMode.value
  ? (issue.value?.issueType ?? IssueType.ApiBug)
  : route.query.type === IssueType.Task
    ? IssueType.Task
    : IssueType.ApiBug
const activeIssueType = ref<IssueType>(initialIssueType)

const apiBugState = ref<ApiBugFormState>(createEmptyApiBugState())
const taskState = ref<TaskFormState>(createEmptyTaskState())

const curlInput = ref('')
const responseBodyInput = ref('')

const apiBugFormRef = ref<{
  isParsed: boolean
  clearCurl: () => void
  initParsedState: (v: boolean) => void
} | null>(null)

const loading = ref(false)
const isInitialized = ref(!isEditMode.value)
const initialApiBugState = ref<ApiBugFormState | null>(null)
const initialTaskState = ref<TaskFormState | null>(null)
const initialRawCurl = ref('')

function initializeFormFromIssue(currentIssue: IssueData) {
  activeIssueType.value = currentIssue.issueType ?? IssueType.ApiBug

  if (activeIssueType.value === IssueType.Task) {
    const nextState: TaskFormState = {
      title: currentIssue.title ?? '',
      description: currentIssue.description ?? '',
      status: currentIssue.status ?? IssueStatus.Open,
      assigneeId: currentIssue.assigneeId ?? null
    }
    Object.assign(taskState.value, nextState)
    initialTaskState.value = { ...nextState }
    return
  }

  const nextState: ApiBugFormState = {
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
    status: currentIssue.status ?? IssueStatus.Open,
    assigneeId: currentIssue.assigneeId ?? null
  }
  Object.assign(apiBugState.value, nextState)
  initialApiBugState.value = { ...nextState }
  const nextRawCurl = currentIssue.rawCurl ?? ''
  curlInput.value = nextRawCurl
  initialRawCurl.value = nextRawCurl
  responseBodyInput.value = formatJson(currentIssue.responseBody)
}

if (isEditMode.value && issue.value) {
  initializeFormFromIssue(issue.value)
  isInitialized.value = true
}

watch(issue, (currentIssue) => {
  if (!isEditMode.value || !currentIssue || isInitialized.value) return

  initializeFormFromIssue(currentIssue)
  isInitialized.value = true
})

watch(curlInput, (value) => {
  apiBugState.value.rawCurl = value.trim() ? value : null
})

const activeSchema = computed(() => {
  return activeIssueType.value === IssueType.Task
    ? createTaskValidationSchema(t)
    : createApiBugValidationSchema(t)
})

const activeState = computed(() => {
  return activeIssueType.value === IssueType.Task ? taskState.value : apiBugState.value
})

const assigneeSelectValue = computed<string | undefined>({
  get: () => activeState.value.assigneeId ?? undefined,
  set: (value) => {
    activeState.value.assigneeId = value ?? null
  }
})

const formRef = ref<{ clear: (path?: string) => void } | null>(null)

watch(
  () => apiBugState.value.url,
  (newUrl) => {
    if (newUrl) {
      formRef.value?.clear('url')
    }
  }
)

const submitLabel = computed(() =>
  isEditMode.value ? t('projects.saveChanges') : t('issues.createIssue')
)
const submitIcon = computed(() => (isEditMode.value ? 'i-lucide-save' : 'i-lucide-plus'))
function discardChanges() {
  if (activeIssueType.value === IssueType.Task) {
    const baseState =
      isEditMode.value && initialTaskState.value ? initialTaskState.value : createEmptyTaskState()
    Object.assign(taskState.value, baseState)
  } else {
    const baseState =
      isEditMode.value && initialApiBugState.value
        ? initialApiBugState.value
        : createEmptyApiBugState()
    Object.assign(apiBugState.value, baseState)
    curlInput.value = isEditMode.value ? initialRawCurl.value : ''
    responseBodyInput.value = formatJson(baseState.responseBody)
    apiBugFormRef.value?.initParsedState(Boolean(curlInput.value))
  }
}

async function onSubmit(event: FormSubmitEvent<Record<string, unknown>>) {
  loading.value = true

  try {
    if (isEditMode.value && !issueId.value) {
      throw new Error('Issue ID is required')
    }

    const endpoint = isEditMode.value
      ? `/api/projects/${projectId.value}/issues/${issueId.value}`
      : `/api/projects/${projectId.value}/issues`

    let body: Record<string, unknown>

    if (isEditMode.value) {
      body = {
        ...activeSchema.value.parse(event.data),
        assigneeId: activeState.value.assigneeId ?? null
      }
    } else if (activeIssueType.value === IssueType.Task) {
      body = {
        ...event.data,
        issueType: IssueType.Task,
        projectId: projectId.value
      }
    } else {
      const rawCurl = curlInput.value.trim()
      body = {
        ...event.data,
        issueType: IssueType.ApiBug,
        projectId: projectId.value,
        rawCurl: rawCurl || null
      }
    }

    const response = await $fetch<IssueResponse>(endpoint, {
      method: isEditMode.value ? 'PATCH' : 'POST',
      body
    })

    toast.add({
      title: t(isEditMode.value ? 'issues.issueUpdated' : 'issues.issueCreated'),
      description: t(isEditMode.value ? 'issues.issueUpdatedHint' : 'issues.issueCreatedHint', {
        id: response.friendlyId
      }),
      color: 'success'
    })

    // Issues 列表已依篩選/分頁參數分成多個 cache entry，用前綴 predicate 一次清除所有變體
    clearNuxtData((key) => key.startsWith(getIssuesCacheKey(projectId.value)))
    clearNuxtData(getProjectCacheKey(projectId.value))
    clearNuxtData(PROJECTS_CACHE_KEY)
    if (isEditMode.value && issueId.value) {
      clearNuxtData(getIssueCacheKey(projectId.value, issueId.value))
    }

    navigateTo(
      isEditMode.value
        ? `/projects/${projectId.value}/issues/${issueId.value}`
        : `/projects/${projectId.value}?type=${activeIssueType.value}`
    )
  } catch (err: unknown) {
    const fallback = isEditMode.value ? t('issues.updateFailed') : t('issues.createFailed')
    const message = err instanceof Error ? err.message : fallback
    toast.add({
      title: t('common.error'),
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
            class="mb-4 size-16 text-gray-400"
          />
          <h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {{ $t('issues.notFound') }}
          </h2>
          <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {{ $t('issues.notFoundHint') }}
          </p>
          <UButton
            :to="`/projects/${projectId}`"
            variant="outline"
            icon="i-lucide-arrow-left"
          >
            {{ $t('issues.backToProject') }}
          </UButton>
        </div>
      </template>
      <template v-else>
        <div class="mb-6">
          <NuxtLink
            :to="
              isEditMode
                ? `/projects/${projectId}/issues/${issueId}`
                : `/projects/${projectId}?type=${activeIssueType}`
            "
            class="group inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-4 transition-transform group-hover:-translate-x-0.5"
            />
            <span>
              <template v-if="isEditMode">{{ $t('issues.backToIssue') }}</template>
              <template v-else
                >{{ $t('common.back') }} {{ project?.name || $t('nav.projects') }}</template
              >
            </span>
          </NuxtLink>
        </div>

        <div
          v-if="!isEditMode"
          class="mb-6"
        >
          <UTabs
            :items="issueTypeTabs"
            :model-value="activeIssueType"
            @update:model-value="
              activeIssueType = $event as (typeof IssueType)[keyof typeof IssueType]
            "
          />
        </div>

        <UForm
          ref="formRef"
          :schema="activeSchema"
          :state="activeState"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('issues.assignee')"
            name="assigneeId"
            class="mb-6 w-48"
          >
            <USelectMenu
              v-model="assigneeSelectValue"
              :items="assigneeOptions"
              :placeholder="$t('issues.unassigned')"
              value-key="value"
              clear
              class="w-full"
            />
          </UFormField>

          <ApiBugForm
            v-if="activeIssueType === IssueType.ApiBug"
            ref="apiBugFormRef"
            v-model:state="apiBugState"
            :is-edit-mode="isEditMode"
            :curl-input="curlInput"
            :response-body-input="responseBodyInput"
            @update:curl-input="curlInput = $event"
            @update:response-body-input="responseBodyInput = $event"
          />

          <TaskForm
            v-else
            v-model:state="taskState"
            :is-edit-mode="isEditMode"
          />

          <div class="mt-6 flex items-center justify-between rounded-xl p-4">
            <span class="text-xs text-gray-400">
              <template v-if="activeIssueType === IssueType.ApiBug && apiBugFormRef?.isParsed">
                <UIcon
                  name="i-lucide-check"
                  class="mr-1 inline size-3"
                />
                {{ $t('issues.parsedFromCurl') }}
              </template>
            </span>
            <div class="flex gap-3">
              <UButton
                color="neutral"
                variant="outline"
                @click="discardChanges"
              >
                {{ $t('common.discard') }}
              </UButton>
              <UButton
                type="submit"
                :loading="loading"
                :icon="submitIcon"
                size="lg"
              >
                {{ submitLabel }}
              </UButton>
            </div>
          </div>
        </UForm>
      </template>
    </UContainer>
  </div>
</template>
