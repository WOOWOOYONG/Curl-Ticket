<script setup lang="ts">
import type { CreateProjectInput } from '~~/shared/schemas/project'

definePageMeta({
  layout: 'header-only'
})

const toast = useToast()
const loading = ref(false)
const state = ref<CreateProjectInput>({
  name: '',
  key: '',
  description: null,
  environments: []
})

function normalizeDescription(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function onSubmit() {
  loading.value = true

  try {
    await $fetch('/api/projects', {
      method: 'POST',
      body: {
        name: state.value.name,
        key: state.value.key,
        description: normalizeDescription(state.value.description),
        environments: [...state.value.environments]
      } satisfies CreateProjectInput
    })

    toast.add({
      title: 'Success',
      description: 'Project created successfully',
      color: 'success'
    })

    await navigateTo('/')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create project'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })

    loading.value = false
  }
}
</script>

<template>
  <ProjectForm
    v-model:state="state"
    title="Create New Project"
    description="Set up a new project with custom environments"
    submit-label="Create Project"
    :loading="loading"
    @submit="onSubmit"
  />
</template>
