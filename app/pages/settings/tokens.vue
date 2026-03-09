<script setup lang="ts">
import type { Token, CreateTokenResponse } from '~~/shared/schemas/api-token'

const toast = useToast()
const { copyToClipboard } = useCopy()

const { data: tokens, refresh } = await useFetch<Token[]>('/api/tokens')

// ── Create modal ──
const showCreateModal = ref(false)
const createForm = reactive({ name: '', expiresInDays: null as number | null })
const createError = ref<string | null>(null)
const isCreating = ref(false)

// ── Token display modal（建立成功後顯示明碼）──
const newToken = ref<CreateTokenResponse | null>(null)
const showTokenModal = ref(false)

// ── Revoke confirm modal ──
const revokeTarget = ref<Token | null>(null)
const isRevoking = ref(false)
const showRevokeModal = computed({
  get: () => revokeTarget.value !== null,
  set: (val) => { if (!val) revokeTarget.value = null }
})

async function createToken() {
  createError.value = null
  isCreating.value = true
  try {
    const result = await $fetch<CreateTokenResponse>('/api/tokens', {
      method: 'POST',
      body: {
        name: createForm.name,
        expiresInDays: createForm.expiresInDays ?? undefined
      }
    })
    newToken.value = result
    showCreateModal.value = false
    showTokenModal.value = true
    createForm.name = ''
    createForm.expiresInDays = null
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    createError.value = err?.data?.statusMessage ?? '建立失敗，請稍後再試'
  } finally {
    isCreating.value = false
  }
}

async function confirmRevoke() {
  if (!revokeTarget.value) return
  isRevoking.value = true
  try {
    await $fetch(`/api/tokens/${revokeTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Token 已撤銷', color: 'success' })
    revokeTarget.value = null
    await refresh()
  } catch {
    toast.add({ title: '撤銷失敗，請稍後再試', color: 'error' })
  } finally {
    isRevoking.value = false
  }
}

function formatDate(date: string | Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function isExpired(expiresAt: string | Date | null) {
  return expiresAt ? new Date(expiresAt) < new Date() : false
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">
          API Tokens
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          供 CLI 工具或外部整合存取 Curl Ticket 的長效憑證
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="新增 Token"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Token list -->
    <UCard v-if="tokens && tokens.length > 0">
      <ul class="divide-y divide-slate-200 dark:divide-slate-700">
        <li
          v-for="token in tokens"
          :key="token.id"
          class="flex items-start justify-between py-4 gap-4"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{ token.name }}</span>
              <UBadge
                v-if="isExpired(token.expiresAt)"
                label="已過期"
                color="error"
                variant="soft"
                size="xs"
              />
            </div>
            <code class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ token.prefix }}…</code>
            <div class="flex gap-4 mt-1 text-xs text-slate-400 dark:text-slate-500">
              <span>建立：{{ formatDate(token.createdAt) }}</span>
              <span>最後使用：{{ formatDate(token.lastUsedAt) }}</span>
              <span>到期：{{ formatDate(token.expiresAt) }}</span>
            </div>
          </div>
          <UButton
            label="撤銷"
            color="error"
            variant="ghost"
            size="sm"
            @click="revokeTarget = token"
          />
        </li>
      </ul>
    </UCard>

    <UCard v-else>
      <div class="py-10 text-center text-slate-500 dark:text-slate-400">
        <UIcon
          name="i-lucide-key"
          class="w-10 h-10 mx-auto mb-3 opacity-40"
        />
        <p class="text-sm">
          尚無 API Token
        </p>
        <p class="text-xs mt-1">
          點擊「新增 Token」以建立第一組憑證
        </p>
      </div>
    </UCard>

    <!-- Create token modal -->
    <UModal
      v-model:open="showCreateModal"
      title="新增 API Token"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField
            label="名稱"
            required
          >
            <UInput
              v-model="createForm.name"
              placeholder="如：Claude Code - MacBook"
              class="w-full"
              maxlength="100"
            />
          </UFormField>
          <UFormField label="有效天數（留空為永不過期）">
            <UInput
              v-model.number="createForm.expiresInDays"
              type="number"
              placeholder="1–365"
              class="w-full"
              :min="1"
              :max="365"
            />
          </UFormField>
          <p
            v-if="createError"
            class="text-sm text-red-500"
          >
            {{ createError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="ghost"
            @click="showCreateModal = false"
          />
          <UButton
            label="建立"
            :loading="isCreating"
            :disabled="!createForm.name.trim()"
            @click="createToken"
          />
        </div>
      </template>
    </UModal>

    <!-- Show created token modal -->
    <UModal
      v-model:open="showTokenModal"
      title="Token 已建立"
      :dismissible="false"
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            icon="i-lucide-triangle-alert"
            color="warning"
            variant="soft"
            :description="newToken?.message"
          />
          <UFormField label="你的 API Token">
            <div class="flex gap-2">
              <UInput
                :model-value="newToken?.token"
                readonly
                class="flex-1 font-mono text-xs"
              />
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                @click="copyToClipboard(newToken?.token ?? '', { title: 'Token 已複製' })"
              />
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="關閉"
            @click="showTokenModal = false; newToken = null"
          />
        </div>
      </template>
    </UModal>

    <!-- Revoke confirm modal -->
    <UModal
      v-model:open="showRevokeModal"
      title="確認撤銷 Token"
    >
      <template #body>
        <p class="text-sm">
          確定要撤銷 <strong>{{ revokeTarget?.name }}</strong>？撤銷後立即生效，使用此 Token 的服務將無法繼續存取。
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="ghost"
            @click="revokeTarget = null"
          />
          <UButton
            label="確認撤銷"
            color="error"
            :loading="isRevoking"
            @click="confirmRevoke"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
