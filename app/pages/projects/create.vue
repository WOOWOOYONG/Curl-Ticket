<script setup lang="ts">
import type { CreateProjectInput } from '~~/shared/schemas/project'

definePageMeta({
  layout: 'header-only'
})

const { t } = useI18n()
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
      title: t('common.success'),
      description: t('projects.projectCreated'),
      color: 'success'
    })

    await navigateTo('/')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('projects.createFailed')
    const fetchError = err as { data?: { message?: string } }
    toast.add({
      title: t('common.error'),
      description: fetchError.data?.message || message,
      color: 'error'
    })

    loading.value = false
  }
}
</script>

<template>
  <ProjectForm
    v-model:state="state"
    :title="$t('projects.createNewProject')"
    :description="$t('projects.createDescription')"
    :submit-label="$t('projects.createProject')"
    :loading="loading"
    @submit="onSubmit"
  />
</template>
