<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
})

const { copyToClipboard } = useCopy()
const { t } = useI18n()

const { data: response, refresh } = await useFetch('/api/invitation-codes')
const codes = computed(() => response.value?.data ?? [])

const creating = ref(false)

async function createInvitationCode() {
  creating.value = true
  try {
    await $fetch('/api/invitation-codes', {
      method: 'POST',
      body: {}
    })
    await refresh()
  } catch {
    useToast().add({
      title: t('common.error'),
      description: t('admin.generateFailed'),
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function copyCode(code: string) {
  copyToClipboard(code, {
    title: t('admin.copied'),
    description: t('admin.copiedHint')
  })
}
</script>

<template>
  <UDashboardPanel>
    <div class="relative isolate min-h-full overflow-hidden">
      <div class="page-bg">
        <div class="page-bg-blob-left -top-32 -left-40" />
        <div class="page-bg-blob-right top-10 -right-48" />
        <div class="page-bg-radial" />
        <div class="page-bg-grid" />
      </div>

      <div class="relative z-10 flex flex-col items-center p-6 sm:p-8 lg:p-10">
        <div class="w-full max-w-2xl flex flex-col gap-6">
          <header class="flex items-end justify-between gap-4">
            <div class="space-y-2">
              <div class="inline-flex items-center gap-2 rounded-full border border-violet-100/80 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
                <span class="h-1.5 w-1.5 rounded-full bg-violet-500" />
                Admin
              </div>
              <h1 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {{ $t('admin.invitationCodes') }}
              </h1>
            </div>
            <UButton
              icon="i-lucide-plus"
              :loading="creating"
              class="shrink-0 shadow-sm shadow-emerald-500/20"
              @click="createInvitationCode"
            >
              {{ $t('admin.generateCode') }}
            </UButton>
          </header>

          <section class="flex flex-col gap-4">
            <div class="flex items-center gap-3">
              <UBadge
                color="neutral"
                variant="subtle"
                class="font-mono text-xs"
              >
                {{ $t('admin.totalCodes', { count: codes.length }) }}
              </UBadge>
            </div>

            <div
              v-if="codes.length === 0"
              class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 py-12 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
            >
              <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                <UIcon
                  name="i-lucide-ticket"
                  class="size-6"
                />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ $t('admin.noInvitationCodes') }}
              </h3>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {{ $t('admin.noInvitationCodesHint') }}
              </p>
            </div>

            <div
              v-else
              class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
            >
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-slate-200/70 dark:border-white/10">
                    <th class="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {{ $t('admin.code') }}
                    </th>
                    <th class="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {{ $t('admin.codeStatus') }}
                    </th>
                    <th class="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {{ $t('admin.createdAt') }}
                    </th>
                    <th class="px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {{ $t('admin.usedAt') }}
                    </th>
                    <th class="px-4 py-2.5 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                      {{ $t('admin.actions') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-white/5">
                  <tr
                    v-for="code in codes"
                    :key="code.id"
                  >
                    <td class="px-4 py-3">
                      <code class="text-sm font-bold tracking-widest text-slate-700 dark:text-slate-300">
                        {{ code.code }}
                      </code>
                    </td>
                    <td class="px-4 py-3">
                      <UBadge
                        :color="code.isUsed ? 'neutral' : 'success'"
                        variant="subtle"
                        class="text-xs"
                      >
                        {{ code.isUsed ? $t('admin.used') : $t('admin.available') }}
                      </UBadge>
                    </td>
                    <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {{ formatDateTime(code.createdAt) }}
                    </td>
                    <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {{ code.usedAt ? formatDateTime(code.usedAt) : '—' }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <UButton
                        v-if="!code.isUsed"
                        icon="i-lucide-copy"
                        variant="soft"
                        color="neutral"
                        size="xs"
                        @click="copyCode(code.code)"
                      >
                        {{ $t('common.copy') }}
                      </UButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>
