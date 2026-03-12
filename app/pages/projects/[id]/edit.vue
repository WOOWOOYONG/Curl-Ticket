<script setup lang="ts">
import type { CreateProjectInput, EditableProjectInput } from '~~/shared/schemas/project'
import { PROJECTS_CACHE_KEY } from '~/composables/useProjects'

definePageMeta({
  layout: 'header-only'
})

const route = useRoute()
const user = useSupabaseUser()
const toast = useToast()

const projectId = computed(() => route.params.id as string)
const { data: response, status } = await useProject(projectId)
const project = computed(() => response.value?.data)
const loading = ref(false)
const isInitialized = ref(false)
const state = ref<CreateProjectInput>({
  name: '',
  key: '',
  description: null,
  environments: []
})

watch(project, (currentProject) => {
  if (!currentProject || isInitialized.value) return

  state.value = {
    name: currentProject.name,
    key: currentProject.key,
    description: currentProject.description,
    environments: [...currentProject.environments]
  }

  isInitialized.value = true
}, { immediate: true })

function normalizeDescription(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

async function onSubmit() {
  const payload = {
    name: state.value.name,
    description: normalizeDescription(state.value.description),
    environments: [...state.value.environments]
  } satisfies EditableProjectInput

  loading.value = true

  try {
    await $fetch(`/api/projects/${projectId.value}`, {
      method: 'PATCH',
      body: payload
    })

    if (response.value?.data) {
      response.value = {
        data: {
          ...response.value.data,
          ...payload
        }
      }
    }

    toast.add({
      title: 'Success',
      description: 'Project updated successfully',
      color: 'success'
    })

    clearNuxtData(PROJECTS_CACHE_KEY)
    await navigateTo('/')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update project'
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
  <div class="min-h-screen">
    <template v-if="status === 'pending'">
      <UContainer class="max-w-2xl py-4">
        <USkeleton class="mb-4 h-6 w-24" />
        <USkeleton class="h-140 rounded-2xl" />
      </UContainer>
    </template>

    <template v-else-if="!project">
      <UContainer class="max-w-2xl py-4">
        <UCard class="shadow-lg">
          <div class="space-y-3 text-center">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Project not found
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              The project you want to edit does not exist or is no longer available.
            </p>
            <div class="flex justify-center pt-2">
              <UButton
                to="/"
                variant="outline"
              >
                Back to Projects
              </UButton>
            </div>
          </div>
        </UCard>
      </UContainer>
    </template>

    <template v-else-if="project.ownerId !== user?.sub">
      <UContainer class="max-w-2xl py-4">
        <UCard class="shadow-lg">
          <div class="space-y-3 text-center">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Owner access required
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Only the project owner can edit project details.
            </p>
            <div class="flex justify-center pt-2">
              <UButton
                :to="`/projects/${project.id}`"
                variant="outline"
              >
                Back to Project
              </UButton>
            </div>
          </div>
        </UCard>
      </UContainer>
    </template>

    <ProjectForm
      v-else
      v-model:state="state"
      mode="edit"
      title="Edit Project"
      description="Update your project name, description, and environments"
      submit-label="Save Changes"
      :back-to="`/projects/${project.id}`"
      :loading="loading"
      @submit="onSubmit"
    />
  </div>
</template>
