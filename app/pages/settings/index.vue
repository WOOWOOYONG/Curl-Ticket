<script setup lang="ts">
import { PROFILE_NAME_MAX_LENGTH } from '~~/shared/constants'

const toast = useToast()
const supabase = useSupabaseClient()
const { profile, fetchProfile, clearProfile } = useProfile()

// ── Profile edit ──
const nameInput = ref(profile.value?.name ?? '')
const isSaving = ref(false)

watch(() => profile.value?.name, (newName) => {
  if (newName && !isSaving.value) {
    nameInput.value = newName
  }
})

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
    toast.add({ title: 'Profile updated', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to update profile', color: 'error' })
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
    await supabase.auth.signOut()
    clearProfile()
    navigateTo('/login')
  } catch (e: unknown) {
    const err = e as { data?: { data?: { ownedProjects?: { id: string, name: string }[] } }, statusMessage?: string }
    const owned = err.data?.data?.ownedProjects
    if (owned?.length) {
      deleteError.value = `Please transfer or delete the following projects first: ${owned.map(p => p.name).join(', ')}`
    } else {
      deleteError.value = err.statusMessage ?? 'Failed to delete account'
    }
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
    <h1 class="text-2xl font-bold mb-6">
      Profile
    </h1>

    <!-- Profile Info -->
    <UCard class="mb-6">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
          <p class="text-sm">
            {{ profile?.email }}
          </p>
        </div>

        <div>
          <label
            for="display-name"
            class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
          >Display Name</label>
          <div class="flex gap-2">
            <UInput
              id="display-name"
              v-model="nameInput"
              placeholder="Enter your name"
              :maxlength="PROFILE_NAME_MAX_LENGTH"
              class="flex-1"
            />
            <UButton
              :loading="isSaving"
              :disabled="!nameInput.trim() || nameInput.trim() === profile?.name"
              @click="updateName"
            >
              Save
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Danger Zone -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-red-600 dark:text-red-400">
          Danger Zone
        </h2>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">
            Delete Account
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Delete your account. Your name will be preserved on historical records (comments, issues, etc.).
          </p>
        </div>
        <UButton
          color="error"
          variant="outline"
          @click="openDeleteModal"
        >
          Delete Account
        </UButton>
      </div>
    </UCard>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">
            Delete Account
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This action cannot be undone. Your account will be deactivated, but your name will be preserved on historical records.
            Type <strong>DELETE</strong> to confirm.
          </p>

          <UAlert
            v-if="deleteError"
            color="error"
            :title="deleteError"
            class="mb-4"
          />

          <UInput
            v-model="deleteConfirmText"
            placeholder="Type DELETE to confirm"
            class="mb-4"
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="showDeleteModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :disabled="!canConfirmDelete"
              :loading="isDeleting"
              @click="deleteAccount"
            >
              Delete Account
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
