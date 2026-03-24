<script setup lang="ts">
const { t } = useI18n()
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  title?: string
  description: string
  confirmLabel?: string
  confirmColor?: 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
}>(), {
  title: 'Confirm',
  confirmLabel: 'Confirm',
  confirmColor: 'error',
  loading: false
})

function handleCancel() {
  if (props.onCancel) {
    props.onCancel()
  } else {
    open.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :prevent-close="loading"
  >
    <template #body>
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ description }}
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end w-full gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          :disabled="loading"
          @click="handleCancel"
        />
        <UButton
          :label="confirmLabel"
          :color="confirmColor"
          :loading="loading"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
