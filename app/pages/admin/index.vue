<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
})

const { copyToClipboard } = useCopy()

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
      title: '錯誤',
      description: '產生邀請碼失敗',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function copyCode(code: string) {
  copyToClipboard(code, {
    title: '已複製',
    description: '邀請碼已複製到剪貼簿'
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

      <div class="relative z-10 flex flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 rounded-full border border-violet-100/80 bg-violet-50/80 px-3 py-1 text-[11px] font-semibold uppercase text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
              <span class="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Admin
            </div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              邀請管理
            </h1>
          </div>
          <UButton
            icon="i-lucide-plus"
            size="lg"
            :loading="creating"
            class="shadow-sm shadow-emerald-500/20"
            @click="createInvitationCode"
          >
            產生邀請碼
          </UButton>
        </header>

        <section class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              邀請碼列表
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
              class="font-mono text-xs"
            >
              {{ codes.length }} 筆
            </UBadge>
          </div>

          <div
            v-if="codes.length === 0"
            class="rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-10 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
          >
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <UIcon
                name="i-lucide-ticket"
                class="size-6"
              />
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
              尚無邀請碼
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              點擊上方按鈕產生邀請碼，提供給需要註冊的使用者
            </p>
          </div>

          <div
            v-else
            class="flex flex-col gap-3"
          >
            <div
              v-for="code in codes"
              :key="code.id"
              class="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-3">
                    <code class="text-lg font-bold tracking-widest text-slate-700 dark:text-slate-300">
                      {{ code.code }}
                    </code>
                    <UBadge
                      :color="code.isUsed ? 'neutral' : 'success'"
                      variant="subtle"
                      class="text-xs shrink-0"
                    >
                      {{ code.isUsed ? '已使用' : '可使用' }}
                    </UBadge>
                  </div>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    建立於 {{ formatDateTime(code.createdAt) }}
                    <template v-if="code.usedAt">
                      &middot; 使用於 {{ formatDateTime(code.usedAt) }}
                    </template>
                    <template v-if="code.expiresAt">
                      &middot; 過期時間 {{ formatDateTime(code.expiresAt) }}
                    </template>
                  </p>
                </div>
                <UButton
                  v-if="!code.isUsed"
                  icon="i-lucide-copy"
                  variant="soft"
                  color="neutral"
                  size="sm"
                  @click="copyCode(code.code)"
                >
                  複製邀請碼
                </UButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </UDashboardPanel>
</template>
