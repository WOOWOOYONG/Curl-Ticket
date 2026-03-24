<script setup lang="ts">
import { InvitationStatusColor, type BadgeColor } from '~/constants/invitation'
import type { InvitationStatus } from '~~/shared/constants'
import type { ProjectMember } from '~~/shared/schemas/project'
import { createProjectInvitationSchema, type CreateProjectInvitationInput, type ProjectInvitation } from '~~/shared/schemas/project-invitation'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  ssr: false
})

const route = useRoute()
const { t } = useI18n()
const toast = useToast()
const projectId = computed(() => route.params.id as string)
const user = useSupabaseUser()

const { data: response, status } = await useProject(projectId)
const project = computed(() => response.value?.data)
const isOwner = computed(() => project.value?.ownerId === user.value?.sub)

// 成員列表
const { data: membersResponse, refresh: refreshMembers } = useFetch<{ data: ProjectMember[] }>(
  () => `/api/projects/${projectId.value}/members`,
  { key: `project-members-${projectId.value}` }
)
const members = computed(() => membersResponse.value?.data ?? [])

// 邀請列表
const { data: invitationsResponse, refresh: refreshInvitations } = useFetch<{ data: ProjectInvitation[] }>(
  () => `/api/projects/${projectId.value}/invitations`,
  { key: `project-invitations-${projectId.value}` }
)
const invitations = computed(() => invitationsResponse.value?.data ?? [])

// 邀請表單
const inviteState = ref<CreateProjectInvitationInput>({ email: '' })
const inviteLoading = ref(false)

async function sendInvitation(event: FormSubmitEvent<CreateProjectInvitationInput>) {
  inviteLoading.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/invitations`, {
      method: 'POST',
      body: event.data
    })
    toast.add({ title: t('members.invitationSent'), color: 'success' })
    inviteState.value.email = ''
    refreshInvitations()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('members.invitationFailed')
    const fetchError = error as { data?: { statusMessage?: string } }
    toast.add({
      title: fetchError.data?.statusMessage || message,
      color: 'error'
    })
  } finally {
    inviteLoading.value = false
  }
}

// 移除成員
const removeTarget = ref<{ userId: string, name: string } | null>(null)
const removingMember = ref(false)

function confirmRemoveMember(member: ProjectMember) {
  removeTarget.value = { userId: member.userId, name: member.name || member.email || member.userId }
}

async function removeMember() {
  const target = removeTarget.value
  if (!target) return

  removingMember.value = true
  try {
    await $fetch(`/api/projects/${projectId.value}/members/${target.userId}`, {
      method: 'DELETE'
    })
    toast.add({ title: t('members.memberRemoved'), color: 'success' })
    removeTarget.value = null
    refreshMembers()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('members.removeFailed')
    const fetchError = error as { data?: { statusMessage?: string } }
    toast.add({
      title: fetchError.data?.statusMessage || message,
      color: 'error'
    })
  } finally {
    removingMember.value = false
  }
}

function getStatusColor(status: InvitationStatus): BadgeColor {
  return InvitationStatusColor[status]
}
</script>

<template>
  <UDashboardPanel>
    <div class="relative isolate flex-1 min-h-full overflow-hidden">
      <div class="page-bg">
        <div class="page-bg-blob-left -top-28 -left-32" />
        <div class="page-bg-blob-right-compact top-12 -right-40" />
        <div class="page-bg-radial" />
        <div class="page-bg-grid" />
      </div>

      <div class="relative z-10 flex flex-1 min-h-0 flex-col items-center p-6 sm:p-8 lg:p-10">
        <div class="w-full max-w-xl flex flex-col gap-6">
          <!-- Loading State -->
          <template v-if="status === 'pending'">
            <USkeleton class="h-10 w-48" />
            <USkeleton class="h-64 rounded-2xl" />
          </template>

          <!-- Not Found / Not Owner -->
          <template v-else-if="!project || !isOwner">
            <div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-white/70 py-16 text-center shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
              <div class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
                <UIcon
                  name="i-lucide-alert-circle"
                  class="size-6"
                />
              </div>
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ $t('members.accessDenied') }}
              </h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {{ $t('members.accessDeniedHint') }}
              </p>
              <UButton
                :to="`/projects/${projectId}`"
                variant="outline"
                class="mt-6"
              >
                {{ $t('members.backToProject') }}
              </UButton>
            </div>
          </template>

          <!-- Content -->
          <template v-else>
            <header class="flex items-start gap-3">
              <NuxtLink
                :to="`/projects/${projectId}`"
                class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white/80 text-slate-500 transition hover:-translate-x-0.5 hover:text-slate-900 dark:border-white/10 dark:bg-gray-900/60 dark:text-slate-300"
              >
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-4"
                />
              </NuxtLink>
              <div class="space-y-0.5">
                <h1 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {{ $t('members.title', { name: project.name }) }}
                </h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  {{ $t('members.subtitle') }}
                </p>
              </div>
            </header>

            <!-- 邀請成員 -->
            <section class="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
              <h2 class="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                {{ $t('members.inviteMembers') }}
              </h2>
              <UForm
                :schema="createProjectInvitationSchema"
                :state="inviteState"
                class="flex items-start gap-2"
                @submit="sendInvitation"
              >
                <UFormField
                  name="email"
                  class="flex-1"
                >
                  <UInput
                    v-model="inviteState.email"
                    type="email"
                    :placeholder="$t('members.emailPlaceholder')"
                    class="w-full"
                  />
                </UFormField>
                <UButton
                  type="submit"
                  :loading="inviteLoading"
                >
                  {{ $t('members.sendInvitation') }}
                </UButton>
              </UForm>

              <!-- Pending invitations -->
              <div
                v-if="invitations.length > 0"
                class="mt-5"
              >
                <h3 class="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {{ $t('members.invitationHistory') }}
                </h3>
                <div class="divide-y divide-slate-100 rounded-lg border border-slate-200/70 dark:divide-white/5 dark:border-white/10">
                  <div
                    v-for="inv in invitations"
                    :key="inv.id"
                    class="flex items-center justify-between px-3 py-2.5"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {{ inv.email }}
                      </p>
                      <p class="text-xs text-slate-400">
                        {{ formatDateTime(inv.createdAt) }}
                      </p>
                    </div>
                    <UBadge
                      :color="getStatusColor(inv.status)"
                      variant="subtle"
                      class="ml-3 shrink-0 text-xs"
                    >
                      {{ inv.status }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </section>

            <!-- 成員列表 -->
            <section class="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/60">
              <h2 class="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                {{ $t('members.memberList') }}
              </h2>
              <div class="divide-y divide-slate-100 rounded-lg border border-slate-200/70 dark:divide-white/5 dark:border-white/10">
                <div
                  v-for="member in members"
                  :key="member.userId"
                  class="flex items-center justify-between px-3 py-2.5"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {{ member.name || member.email }}
                    </p>
                    <p class="truncate text-xs text-slate-400">
                      {{ member.email }}
                    </p>
                  </div>
                  <div class="ml-3 flex shrink-0 items-center gap-2">
                    <UBadge
                      v-if="member.userId === project.ownerId"
                      color="primary"
                      variant="subtle"
                      class="text-xs"
                    >
                      {{ $t('members.owner') }}
                    </UBadge>
                    <UButton
                      v-if="member.userId !== user?.sub && member.userId !== project.ownerId"
                      color="error"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-user-minus"
                      @click="confirmRemoveMember(member)"
                    >
                      {{ $t('members.removeMember') }}
                    </UButton>
                  </div>
                </div>
              </div>
            </section>
          </template>
        </div>
      </div>
    </div>

    <!-- Remove member confirmation modal -->
    <ConfirmModal
      :open="removeTarget !== null"
      :title="$t('common.remove')"
      :description="$t('members.removeConfirm', { name: removeTarget?.name })"
      :confirm-label="$t('common.remove')"
      :loading="removingMember"
      :on-confirm="removeMember"
      :on-cancel="() => { removeTarget = null }"
      @update:open="(val: boolean) => { if (!val) removeTarget = null }"
    />
  </UDashboardPanel>
</template>
