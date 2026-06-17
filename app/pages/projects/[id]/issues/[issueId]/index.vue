<script setup lang="ts">
import {
  IssueStatusColor,
  IssueStatusLabel,
  IssueTypeLabel,
  IssueTypeIcon,
  IssueTypeColor
} from '~/constants/issue'
import { buildCurlCommand } from '~/utils/issue'
import type { IssueResponse, PublicShare } from '~/types/issue'
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
const { formatRelative } = useRelativeTime()

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
const publicShare = computed<PublicShare>(
  () =>
    issueResponse.value?.publicShare ?? {
      enabled: false,
      sharedAt: null,
      shareUrl: null
    }
)

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

// Last updated relative time
const lastUpdated = computed(() => {
  if (!issue.value?.updatedAt) return ''
  return formatRelative(issue.value.updatedAt)
})

// Copy functions
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
    copyToClipboard(curlCmd, { description: t('issues.curlCopied') })
  }
}

watch(selectedStatus, async (nextStatus) => {
  if (!nextStatus || !issue.value) return
  if (nextStatus === issue.value.status) return
  await updateIssueStatus(nextStatus)
})

// Delete issue
const showDeleteModal = ref(false)
const deleteLoading = ref(false)
const showShareModal = ref(false)
const shareLoading = ref(false)
const shareAction = ref<'enable' | 'regenerate' | 'disable'>('enable')

const shareModalTitle = computed(() => {
  if (shareAction.value === 'disable') return t('issues.publicShare.disable')
  if (shareAction.value === 'regenerate') return t('issues.publicShare.regenerate')
  return t('issues.publicShare.enable')
})

const shareModalDescription = computed(() => {
  if (shareAction.value === 'disable') return t('issues.publicShare.disableConfirm')
  return t('issues.publicShare.enableConfirm')
})

const shareConfirmColor = computed<'error' | 'primary'>(() =>
  shareAction.value === 'disable' ? 'error' : 'primary'
)

function openShareModal(action: 'enable' | 'regenerate' | 'disable') {
  shareAction.value = action
  showShareModal.value = true
}

const shareMenuItems = computed(() => [
  {
    label: t('issues.publicShare.regenerate'),
    icon: 'i-lucide-refresh-cw',
    onSelect: () => openShareModal('regenerate')
  },
  { type: 'separator' as const },
  {
    label: t('issues.publicShare.disable'),
    icon: 'i-lucide-link-2-off',
    color: 'error' as const,
    onSelect: () => openShareModal('disable')
  }
])

function copyShareLink() {
  if (!publicShare.value.shareUrl) return
  copyToClipboard(publicShare.value.shareUrl, { description: t('issues.publicShare.linkCopied') })
}

function setPublicShare(nextPublicShare: PublicShare) {
  if (!issueResponse.value) return
  issueResponse.value = {
    ...issueResponse.value,
    publicShare: nextPublicShare
  }
}

async function confirmShareChange() {
  shareLoading.value = true
  try {
    const nextPublicShare = await $fetch<PublicShare>(
      `/api/projects/${projectId.value}/issues/${issueId.value}/share`,
      {
        method: shareAction.value === 'disable' ? 'DELETE' : 'POST'
      }
    )

    setPublicShare(nextPublicShare)
    toast.add({
      title:
        shareAction.value === 'disable'
          ? t('issues.publicShare.disabled')
          : t('issues.publicShare.enabled'),
      color: 'success'
    })
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({
      title: t('common.error'),
      description: error.data?.message || t('issues.publicShare.updateFailed'),
      color: 'error'
    })
  } finally {
    shareLoading.value = false
    showShareModal.value = false
  }
}

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
            <IssueReadOnlyDetails :issue="issue" />

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

              <div
                v-if="isApiBug"
                class="space-y-3 border-t border-slate-200/70 pt-5 dark:border-slate-800/70"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {{ $t('issues.publicShare.title') }}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <UBadge
                      :color="publicShare.enabled ? 'success' : 'neutral'"
                      variant="subtle"
                    >
                      {{
                        publicShare.enabled
                          ? $t('issues.publicShare.enabledStatus')
                          : $t('issues.publicShare.disabledStatus')
                      }}
                    </UBadge>
                    <UDropdownMenu
                      v-if="publicShare.enabled && publicShare.shareUrl"
                      :items="shareMenuItems"
                    >
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-ellipsis-vertical"
                        :aria-label="$t('issues.publicShare.manage')"
                      />
                    </UDropdownMenu>
                  </div>
                </div>

                <template v-if="publicShare.enabled && publicShare.shareUrl">
                  <UInput
                    :model-value="publicShare.shareUrl"
                    readonly
                    size="sm"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-lucide-copy"
                        :aria-label="$t('common.copy')"
                        @click="copyShareLink"
                      />
                    </template>
                  </UInput>
                </template>

                <UButton
                  v-else
                  color="primary"
                  variant="soft"
                  icon="i-lucide-link"
                  block
                  @click="openShareModal('enable')"
                >
                  {{ $t('issues.publicShare.enable') }}
                </UButton>
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

    <ConfirmModal
      v-model:open="showShareModal"
      :title="shareModalTitle"
      :description="shareModalDescription"
      :confirm-label="shareModalTitle"
      :confirm-color="shareConfirmColor"
      :loading="shareLoading"
      :on-confirm="confirmShareChange"
      :on-cancel="
        () => {
          showShareModal = false
        }
      "
    />
  </div>
</template>
