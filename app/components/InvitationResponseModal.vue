<script setup lang="ts">
const props = defineProps<{
  open: boolean
  invitation: {
    projectInvitationId: string | null
    projectName: string | null
    content: string | null
  } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  responded: []
}>()

const loading = ref(false)

async function respond() {
  if (!props.invitation?.projectInvitationId) return

  loading.value = true
  try {
    await $fetch(`/api/project-invitations/${props.invitation.projectInvitationId}/respond`, {
      method: 'POST',
      body: { accept: true }
    })
    emit('responded')
    emit('update:open', false)
  } catch (error: unknown) {
    const toast = useToast()
    const { t } = useI18n()
    const message = error instanceof Error ? error.message : t('invitation.failed')
    const fetchError = error as { data?: { message?: string } }
    toast.add({
      title: fetchError.data?.message || message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ $t('invitation.title') }}
      </h3>
    </template>

    <template #body>
      <div
        v-if="invitation"
        class="space-y-4"
      >
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ invitation.content }}
        </p>
        <div
          v-if="invitation.projectName"
          class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-slate-900 dark:text-white">
            {{ $t('invitation.projectName', { name: invitation.projectName }) }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          :loading="loading"
          @click="respond"
        >
          {{ $t('invitation.accept') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
