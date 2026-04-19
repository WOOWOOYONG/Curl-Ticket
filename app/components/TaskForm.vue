<script setup lang="ts">
import type { IssueStatus } from '~~/shared/constants'

export interface TaskFormState {
  title: string
  description: string | null | undefined
  status: IssueStatus
  assigneeId: string | null
}

const state = defineModel<TaskFormState>('state', { required: true })
const { t } = useI18n()

defineProps<{
  isEditMode: boolean
}>()
</script>

<template>
  <UCard
    :ui="{
      root: 'overflow-hidden shadow-lg',
      header:
        'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 border-b border-gray-200 dark:border-gray-800'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="bg-primary/10 dark:bg-primary/20 flex size-8 items-center justify-center rounded-lg"
          >
            <UIcon
              name="i-lucide-check-square"
              class="text-primary size-4"
            />
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900 dark:text-white">
              {{ t('task.details') }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ t('task.describe') }}
            </p>
          </div>
        </div>
        <UBadge
          v-if="state.title.trim()"
          color="success"
          variant="subtle"
          class="gap-1.5 px-3 py-1"
        >
          <UIcon
            name="i-lucide-check-circle"
            class="size-3.5"
          />
          {{ isEditMode ? t('task.readyToSave') : t('task.readyToCreate') }}
        </UBadge>
        <UBadge
          v-else
          color="neutral"
          variant="outline"
          class="gap-1.5 px-3 py-1"
        >
          <UIcon
            name="i-lucide-circle-dashed"
            class="size-3.5"
          />
          {{ t('task.incomplete') }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Title -->
      <UFormField
        :label="t('task.title')"
        name="title"
        required
        class="w-full"
      >
        <UInput
          v-model="state.title"
          :placeholder="t('task.titlePlaceholder')"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <!-- Description -->
      <UFormField
        :label="t('task.descriptionOptional')"
        name="description"
        class="w-full"
      >
        <UTextarea
          v-model="state.description"
          :placeholder="t('task.descriptionPlaceholder')"
          :rows="6"
          class="w-full"
        />
      </UFormField>
    </div>
  </UCard>
</template>
