<script setup lang="ts">
import type { IssueStatus } from '~~/shared/constants'

export interface TaskFormState {
  title: string
  description: string | null | undefined
  status: typeof IssueStatus[keyof typeof IssueStatus]
}

const state = defineModel<TaskFormState>('state', { required: true })

defineProps<{
  isEditMode: boolean
}>()
</script>

<template>
  <UCard
    :ui="{
      root: 'overflow-hidden shadow-lg',
      header: 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 border-b border-gray-200 dark:border-gray-800'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-8 rounded-lg bg-primary/10 dark:bg-primary/20">
            <UIcon
              name="i-lucide-check-square"
              class="size-4 text-primary"
            />
          </div>
          <div>
            <h2 class="font-semibold text-gray-900 dark:text-white text-base">
              Task Details
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Describe the task to be done
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
          {{ isEditMode ? 'Ready to Save' : 'Ready to Create' }}
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
          Incomplete
        </UBadge>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Title -->
      <UFormField
        label="Task Title"
        name="title"
        required
        class="w-full"
      >
        <UInput
          v-model="state.title"
          placeholder="What needs to be done?"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <!-- Description -->
      <UFormField
        label="Description (Optional)"
        name="description"
        class="w-full"
      >
        <UTextarea
          v-model="state.description"
          placeholder="Add details, context, or acceptance criteria..."
          :rows="6"
          class="w-full"
        />
      </UFormField>
    </div>
  </UCard>
</template>
