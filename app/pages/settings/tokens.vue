<script setup lang="ts">
import type { Token, CreateTokenResponse } from '~~/shared/schemas/api-token'

const toast = useToast()
const { copyToClipboard } = useCopy()
const { t } = useI18n()

const { data: tokens, refresh } = await useFetch<Token[]>('/api/tokens')

// ── Create modal ──
const showCreateModal = ref(false)
const createForm = reactive({ name: '', expiresInDays: null as number | null })
const createError = ref<string | null>(null)
const isCreating = ref(false)

// ── Token display modal（建立成功後顯示明碼）──
const newToken = ref<CreateTokenResponse | null>(null)
const showTokenModal = ref(false)
const hasCopied = ref(false)

// ── Revoke confirm modal ──
const revokeTarget = ref<Token | null>(null)
const isRevoking = ref(false)
const showRevokeModal = computed({
  get: () => revokeTarget.value !== null,
  set: (val) => {
    if (!val) revokeTarget.value = null
  }
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
    hasCopied.value = false
    showCreateModal.value = false
    showTokenModal.value = true
    createForm.name = ''
    createForm.expiresInDays = null
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    createError.value = err?.data?.message ?? t('tokens.createFailed')
  } finally {
    isCreating.value = false
  }
}

async function confirmRevoke() {
  if (!revokeTarget.value) return
  isRevoking.value = true
  try {
    await $fetch(`/api/tokens/${revokeTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('tokens.revoked'), color: 'success' })
    revokeTarget.value = null
    await refresh()
  } catch {
    toast.add({ title: t('tokens.revokeFailed'), color: 'error' })
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

function copyToken() {
  copyToClipboard(newToken.value?.token ?? '', { title: t('tokens.tokenCopied') })
  hasCopied.value = true
}

function closeTokenModal() {
  showTokenModal.value = false
  newToken.value = null
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          {{ $t('tokens.title') }}
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ $t('tokens.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('tokens.createToken')"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Token list -->
    <UCard v-if="tokens && tokens.length > 0">
      <ul class="divide-y divide-slate-200 dark:divide-slate-700">
        <li
          v-for="token in tokens"
          :key="token.id"
          class="flex items-start justify-between gap-4 py-4"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ token.name }}</span>
              <UBadge
                v-if="isExpired(token.expiresAt)"
                :label="$t('tokens.expired')"
                color="error"
                variant="soft"
                size="xs"
              />
            </div>
            <code class="font-mono text-xs text-slate-500 dark:text-slate-400"
              >{{ token.prefix }}…</code
            >
            <div class="mt-1 flex gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span>{{ $t('tokens.createdAt') }}：{{ formatDate(token.createdAt) }}</span>
              <span>{{ $t('tokens.lastUsedAt') }}：{{ formatDate(token.lastUsedAt) }}</span>
              <span>{{ $t('tokens.expiresAt') }}：{{ formatDate(token.expiresAt) }}</span>
            </div>
          </div>
          <UButton
            :label="$t('tokens.revoke')"
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
          class="mx-auto mb-3 h-10 w-10 opacity-40"
        />
        <p class="text-sm">
          {{ $t('tokens.noTokens') }}
        </p>
        <p class="mt-1 text-xs">
          {{ $t('tokens.noTokensHint') }}
        </p>
      </div>
    </UCard>

    <!-- Create token modal -->
    <UModal
      v-model:open="showCreateModal"
      :title="$t('tokens.createToken')"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField
            :label="$t('tokens.name')"
            required
          >
            <UInput
              v-model="createForm.name"
              :placeholder="$t('tokens.namePlaceholder')"
              class="w-full"
              maxlength="100"
            />
          </UFormField>
          <UFormField :label="$t('tokens.expiresInDays')">
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
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="showCreateModal = false"
          />
          <UButton
            :label="$t('common.create')"
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
      :title="$t('tokens.tokenCreated')"
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
          <UFormField :label="$t('tokens.yourToken')">
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
                @click="copyToken"
              />
            </div>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            :label="$t('common.close')"
            :disabled="!hasCopied"
            @click="closeTokenModal"
          />
        </div>
      </template>
    </UModal>

    <!-- Revoke confirm modal -->
    <ConfirmModal
      v-model:open="showRevokeModal"
      :title="$t('tokens.revoke')"
      :description="$t('tokens.revokeConfirm', { name: revokeTarget?.name })"
      :confirm-label="$t('tokens.revoke')"
      :loading="isRevoking"
      :on-confirm="confirmRevoke"
      :on-cancel="
        () => {
          revokeTarget = null
        }
      "
    />
  </div>
</template>
