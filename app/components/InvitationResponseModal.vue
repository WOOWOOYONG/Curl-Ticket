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
  'responded': []
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
    const message = error instanceof Error ? error.message : '操作失敗'
    const fetchError = error as { data?: { statusMessage?: string } }
    toast.add({
      title: fetchError.data?.statusMessage || message,
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
        專案邀請
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
            專案名稱：{{ invitation.projectName }}
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
          接受邀請
        </UButton>
      </div>
    </template>
  </UModal>
</template>
