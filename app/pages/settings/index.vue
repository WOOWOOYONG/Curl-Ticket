<script setup lang="ts">
import { FetchError } from 'ofetch'
import { PROFILE_NAME_MAX_LENGTH } from '~~/shared/constants'

const toast = useToast()
const supabase = useSupabaseClient()
const { profile, fetchProfile, clearProfile } = useProfile()
const { t } = useI18n()

// ── Profile edit ──
const nameInput = ref(profile.value?.name ?? '')
const isSaving = ref(false)

watch(
  () => profile.value?.name,
  (newName) => {
    if (newName && !isSaving.value) {
      nameInput.value = newName
    }
  }
)

async function updateName() {
  const trimmed = nameInput.value.trim()
  if (!trimmed || trimmed.length > PROFILE_NAME_MAX_LENGTH) return
  if (trimmed === profile.value?.name) return

  isSaving.value = true
  try {
    await $fetch('/api/auth/profile', {
      method: 'PATCH',
      body: { name: trimmed }
    })
    clearProfile()
    await fetchProfile()
    toast.add({ title: t('settings.profileUpdated'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.profileUpdateFailed'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

// ── Account deletion ──
const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const isDeleting = ref(false)
const deleteError = ref<string | null>(null)

const canConfirmDelete = computed(() => deleteConfirmText.value === 'DELETE')

async function deleteAccount() {
  if (!canConfirmDelete.value) return

  isDeleting.value = true
  deleteError.value = null

  try {
    await $fetch('/api/auth/profile', { method: 'DELETE' })
    clearProfile()
    supabase.auth.signOut().catch(() => {})
    navigateTo('/login')
  } catch (e) {
    if (!(e instanceof FetchError)) {
      deleteError.value = t('settings.deleteAccountFailed')
      return
    }
    const owned = e.data?.data?.ownedProjects as { name: string }[] | undefined
    deleteError.value = owned?.length
      ? `Please transfer or delete the following projects first: ${owned.map((p) => p.name).join(', ')}`
      : (e.statusMessage ?? 'Failed to delete account')
  } finally {
    isDeleting.value = false
  }
}

function openDeleteModal() {
  deleteConfirmText.value = ''
  deleteError.value = null
  showDeleteModal.value = true
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-8">
    <h1 class="mb-6 text-2xl font-bold">
      {{ $t('settings.profile') }}
    </h1>

    <!-- Profile Info -->
    <UCard class="mb-6">
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400">{{
            $t('settings.email')
          }}</label>
          <p class="text-sm">
            {{ profile?.email }}
          </p>
        </div>

        <div>
          <label
            for="display-name"
            class="mb-1 block text-sm font-medium text-gray-500 dark:text-gray-400"
            >{{ $t('settings.displayName') }}</label
          >
          <div class="flex gap-2">
            <UInput
              id="display-name"
              v-model="nameInput"
              :placeholder="$t('settings.displayNamePlaceholder')"
              :maxlength="PROFILE_NAME_MAX_LENGTH"
              class="flex-1"
            />
            <UButton
              :loading="isSaving"
              :disabled="!nameInput.trim() || nameInput.trim() === profile?.name"
              @click="updateName"
            >
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Danger Zone -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-red-600 dark:text-red-400">
          {{ $t('settings.dangerZone') }}
        </h2>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">
            {{ $t('settings.deleteAccount') }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.deleteAccountHint') }}
          </p>
        </div>
        <UButton
          color="error"
          variant="outline"
          @click="openDeleteModal"
        >
          {{ $t('common.delete') }}
        </UButton>
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-2 text-lg font-semibold">
            {{ $t('settings.deleteAccount') }}
          </h3>
          <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {{ $t('settings.deleteAccountConfirm') }}
            <i18n-t
              keypath="settings.deleteAccountConfirmType"
              tag="span"
            >
              <template #keyword>
                <strong>DELETE</strong>
              </template>
            </i18n-t>
          </p>

          <UAlert
            v-if="deleteError"
            color="error"
            :title="deleteError"
            class="mb-4"
          />

          <UInput
            v-model="deleteConfirmText"
            :placeholder="$t('settings.deleteAccountPlaceholder')"
            class="mb-4 w-full"
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="showDeleteModal = false"
            >
              {{ $t('common.cancel') }}
            </UButton>
            <UButton
              color="error"
              :disabled="!canConfirmDelete"
              :loading="isDeleting"
              @click="deleteAccount"
            >
              {{ $t('settings.deleteAccount') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
