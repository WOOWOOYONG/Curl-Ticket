<script setup lang="ts">
import { createProjectSchema } from '~~/shared/schemas/project'
import type { CreateProjectInput } from '~~/shared/schemas/project'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Environment } from '~~/shared/constants'
import { environments } from '~~/shared/constants'

definePageMeta({
  layout: 'header-only'
})

const supabase = useSupabaseClient()
const toast = useToast()

const loading = ref(false)
const state = reactive<CreateProjectInput>({
  name: '',
  key: '',
  description: null,
  environments: [] as Environment[]
})

const environmentOptions = environments.map(env => ({
  label: env,
  value: env,
  checked: computed({
    get: () => state.environments.includes(env),
    set: (checked: boolean) => {
      if (checked) {
        state.environments.push(env)
      } else {
        const index = state.environments.indexOf(env)
        if (index > -1) {
          state.environments.splice(index, 1)
        }
      }
    }
  })
}))

async function onSubmit(event: FormSubmitEvent<CreateProjectInput>) {
  loading.value = true

  try {
    const { error } = await supabase
      .from('projects')
      .insert(event.data)

    if (error) throw error

    toast.add({
      title: 'Success',
      description: 'Project created successfully',
      color: 'success'
    })

    navigateTo('/')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create project'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-2xl pt-4">
    <div class="mb-4">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors group"
      >
        <span class="group-hover:-translate-x-0.5 transition-transform">&larr;</span>
        <span>Back to Projects</span>
      </NuxtLink>
    </div>

    <UCard class="shadow-lg">
      <template #header>
        <div class="space-y-2">
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Create New Project
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Set up a new project with custom environments
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
          description="2-10 uppercase letters and numbers only (e.g., PROJ, API01)"
          required
        >
          <UInput
            v-model="state.key"
            placeholder="PROJ"
            size="lg"
            icon="i-heroicons-key"
            class="w-full"
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
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <label
              v-for="option in environmentOptions"
              :key="option.value"
              class="flex items-center gap-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer transition-all hover:border-primary hover:shadow-sm"
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

        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <UButton
            color="neutral"
            variant="outline"
            to="/"
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
            icon="i-heroicons-check"
          >
            Create Project
          </UButton>
        </div>
      </UForm>
    </UCard>
  </UContainer>
</template>
