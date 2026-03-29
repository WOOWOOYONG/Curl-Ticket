<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreateProjectInput } from '~~/shared/schemas/project'
import { environments } from '~~/shared/constants'
import { createProjectSchema } from '~~/shared/schemas/project'

type ProjectFormMode = 'create' | 'edit'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    submitLabel: string
    loading?: boolean
    mode?: ProjectFormMode
    backTo?: string
  }>(),
  {
    loading: false,
    mode: 'create',
    backTo: '/'
  }
)

const emit = defineEmits<{
  submit: []
}>()

const state = defineModel<CreateProjectInput>('state', { required: true })

const { t } = useI18n()

const isEditMode = computed(() => props.mode === 'edit')
const keyDescription = computed(() =>
  isEditMode.value ? t('projects.form.keyDescriptionEdit') : t('projects.form.keyDescriptionCreate')
)
const submitIcon = computed(() =>
  isEditMode.value ? 'i-heroicons-pencil-square' : 'i-heroicons-check'
)

const environmentOptions = environments.map((env) => ({
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
        class="group inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <span class="transition-transform group-hover:-translate-x-0.5">&larr;</span>
        <span>{{ t('common.back') }}</span>
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
          :label="t('projects.form.name')"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            :placeholder="t('projects.form.namePlaceholder')"
            size="lg"
            icon="i-heroicons-cube"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('projects.form.key')"
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
          :label="t('projects.form.description')"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :placeholder="t('projects.form.descriptionPlaceholder')"
            :rows="4"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('projects.form.environments')"
          name="environments"
          :description="t('projects.form.environmentsHint')"
          required
        >
          <div
            class="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <label
              v-for="option in environmentOptions"
              :key="option.value"
              class="hover:border-primary flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 bg-white p-3 transition-all hover:shadow-sm dark:border-gray-700 dark:bg-gray-800"
              :class="{
                'border-primary ring-primary/20 bg-primary/5 ring-2': state.environments.includes(
                  option.value
                )
              }"
            >
              <UCheckbox
                :model-value="state.environments.includes(option.value)"
                @update:model-value="
                  (checked) => {
                    if (checked) {
                      state.environments.push(option.value)
                    } else {
                      const index = state.environments.indexOf(option.value)
                      if (index > -1) {
                        state.environments.splice(index, 1)
                      }
                    }
                  }
                "
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ option.label }}
              </span>
            </label>
          </div>
        </UFormField>

        <div
          class="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end dark:border-gray-800"
        >
          <UButton
            color="neutral"
            variant="outline"
            :to="backTo"
            size="lg"
            class="w-full sm:w-auto"
          >
            {{ t('common.cancel') }}
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
