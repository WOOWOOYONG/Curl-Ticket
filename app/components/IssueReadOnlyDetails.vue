<script setup lang="ts">
import { getHttpMethodColor } from '~/constants/http'
import { EnvironmentColor } from '~/constants/issue'
import { formatJson, maskValue, toHeadersArray } from '~/utils/issue'
import type { Issue, PublicIssue } from '~~/shared/schemas/issue'

const props = defineProps<{
  issue: Issue | PublicIssue
}>()

const { t } = useI18n()
const { copyToClipboard } = useCopy()

const headersArray = computed(() => toHeadersArray(props.issue.requestHeaders))

const tabItems = computed(() => [
  { label: t('issues.requestBody'), slot: 'request-body' as const },
  { label: t('issues.requestHeaders'), slot: 'headers' as const },
  { label: t('issues.response'), slot: 'response' as const }
])

function copyUrl() {
  if (!props.issue.url) return
  copyToClipboard(props.issue.url, { description: t('issues.urlCopied') })
}

function copyRequestBody() {
  if (!props.issue.requestBody) return
  copyToClipboard(formatJson(props.issue.requestBody), {
    description: t('issues.requestBodyCopied')
  })
}

function copyResponseBody() {
  if (!props.issue.responseBody) return
  copyToClipboard(formatJson(props.issue.responseBody), {
    description: t('issues.responseBodyCopied')
  })
}
</script>

<template>
  <div class="space-y-6">
    <IssueDescriptionCard :description="issue.description" />

    <template v-if="issue.method && issue.url">
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
        <code class="min-w-0 flex-1 truncate font-mono text-sm text-slate-900 dark:text-white">
          {{ issue.url }}
        </code>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-copy"
          :aria-label="$t('common.copy')"
          @click="copyUrl"
        />
      </div>

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

      <UTabs
        :items="tabItems"
        variant="link"
      >
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
                :aria-label="$t('common.copy')"
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
                :aria-label="$t('common.copy')"
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
  </div>
</template>
