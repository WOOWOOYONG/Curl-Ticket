<script setup lang="ts">
import type { PublicIssueResponse } from '~/types/issue'

definePageMeta({
  layout: 'header-only'
})

const route = useRoute()
const { formatRelative } = useRelativeTime()

const token = computed(() => route.params.token as string)

const { data: issueResponse, status } = await useFetch<PublicIssueResponse>(
  () => `/api/public/issues/${token.value}`,
  {
    key: `public-issue-${token.value}`
  }
)

const issue = computed(() => issueResponse.value?.data)
const lastUpdated = computed(() => {
  if (!issue.value?.updatedAt) return ''
  return formatRelative(issue.value.updatedAt)
})

const FALLBACK_TITLE = 'Curl Ticket'
const OG_DESCRIPTION_MAX = 160

const seoTitle = computed(() => {
  if (!issue.value) return FALLBACK_TITLE
  return `${issue.value.friendlyId} · ${issue.value.title}`
})

const seoDescription = computed(() => {
  if (!issue.value) return ''
  const raw = issue.value.description?.trim() || `${issue.value.method} ${issue.value.url}`
  return raw.length > OG_DESCRIPTION_MAX ? `${raw.slice(0, OG_DESCRIPTION_MAX - 1)}…` : raw
})

useSeoMeta({
  title: seoTitle,
  ogTitle: seoTitle,
  description: seoDescription,
  ogDescription: seoDescription,
  ogType: 'article',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <UContainer class="max-w-5xl py-8">
      <template v-if="status === 'pending'">
        <div class="space-y-6">
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-64 w-full rounded-lg" />
          <USkeleton class="h-64 w-full rounded-lg" />
        </div>
      </template>

      <template v-else-if="!issue">
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <UIcon
            name="i-lucide-alert-circle"
            class="mb-4 size-16 text-slate-400"
          />
          <h1 class="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
            {{ $t('publicIssue.notFound') }}
          </h1>
          <p class="max-w-md text-sm text-slate-500 dark:text-slate-400">
            {{ $t('publicIssue.notFoundHint') }}
          </p>
        </div>
      </template>

      <template v-else>
        <div class="mb-8 space-y-4 border-b border-slate-200/70 pb-6 dark:border-slate-800/70">
          <div class="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span class="font-mono font-medium text-slate-700 dark:text-slate-300">
              {{ $t('issues.issueId') }} {{ issue.friendlyId }}
            </span>
            <UBadge
              color="neutral"
              variant="subtle"
              icon="i-lucide-eye"
            >
              {{ $t('publicIssue.readOnly') }}
            </UBadge>
          </div>

          <div class="space-y-3">
            <h1
              class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
            >
              {{ issue.title }}
            </h1>
            <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              <span>{{ $t('issues.created') }} {{ formatDate(issue.createdAt) }}</span>
              <span>{{ $t('issues.lastUpdated') }} {{ lastUpdated }}</span>
            </div>
          </div>
        </div>

        <IssueReadOnlyDetails :issue="issue" />
      </template>
    </UContainer>
  </div>
</template>
