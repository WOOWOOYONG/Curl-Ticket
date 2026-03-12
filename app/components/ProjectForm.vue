<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreateProjectInput } from '~~/shared/schemas/project'
import { environments } from '~~/shared/constants'
import { createProjectSchema } from '~~/shared/schemas/project'

type ProjectFormMode = 'create' | 'edit'

const props = withDefaults(defineProps<{
  title: string
  description: string
  submitLabel: string
  loading?: boolean
  mode?: ProjectFormMode
  backTo?: string
}>(), {
  loading: false,
  mode: 'create',
  backTo: '/'
})

const emit = defineEmits<{
  submit: []
}>()

const state = defineModel<CreateProjectInput>('state', { required: true })

const isEditMode = computed(() => props.mode === 'edit')
const keyDescription = computed(() => isEditMode.value
  ? 'Project key is read-only to keep existing issue IDs stable.'
  : '2-10 uppercase letters and numbers only (e.g., PROJ, API01)')
const submitIcon = computed(() => isEditMode.value ? 'i-heroicons-pencil-square' : 'i-heroicons-check')

const environmentOptions = environments.map(env => ({
  label: env,
  value: env
}))

function onSubmit(_event: FormSubmitEvent<CreateProjectInput>) {
  emit('submit')
}
</script>

<template>
  <UContainer class="max-w-2xl py-4">
    <div class="mb-4">
      <NuxtLink
        :to="backTo"
        class="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors group hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <span class="transition-transform group-hover:-translate-x-0.5">&larr;</span>
        <span>Back</span>
      </NuxtLink>
    </div>

    <UCard class="shadow-lg">
      <template #header>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            {{ title }}
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ description }}
          </p>
        </div>
      </template>

      <UForm
        :schema="createProjectSchema"
        :state="state"
        class="flex flex-col gap-6"
        @submit="onSubmit"
      >
        <UFormField
          label="Project Name"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="My Awesome Project"
            size="lg"
            icon="i-heroicons-cube"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Project Key"
          name="key"
          :description="keyDescription"
          required
        >
          <UInput
            v-model="state.key"
            placeholder="PROJ"
            size="lg"
            icon="i-heroicons-key"
            class="w-full"
            :readonly="isEditMode"
            @input="state.key = state.key.toUpperCase()"
          />
        </UFormField>

        <UFormField
          label="Description (Optional)"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            placeholder="Brief description of the project..."
            :rows="4"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Environments"
          name="environments"
          description="Select which environments this project will use"
          required
        >
          <div class="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4">
            <label
              v-for="option in environmentOptions"
              :key="option.value"
              class="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 bg-white p-3 transition-all hover:border-primary hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
              :class="{
                'border-primary ring-2 ring-primary/20 bg-primary/5': state.environments.includes(option.value)
              }"
            >
              <UCheckbox
                :model-value="state.environments.includes(option.value)"
                @update:model-value="(checked) => {
                  if (checked) {
                    state.environments.push(option.value)
                  }
                  else {
                    const index = state.environments.indexOf(option.value)
                    if (index > -1) {
                      state.environments.splice(index, 1)
                    }
                  }
                }"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ option.label }}
              </span>
            </label>
          </div>
        </UFormField>

        <div class="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="outline"
            :to="backTo"
            size="lg"
            class="w-full sm:w-auto"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
            size="lg"
            class="w-full sm:w-auto"
            :icon="submitIcon"
          >
            {{ submitLabel }}
          </UButton>
        </div>
      </UForm>
    </UCard>
  </UContainer>
</template>
