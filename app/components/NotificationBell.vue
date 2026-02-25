<script setup lang="ts">
import { NotificationType, InvitationStatus } from '~~/shared/constants'
import { PROJECTS_CACHE_KEY } from '~/composables/useProjects'

const { notifications, unreadCount, refresh, markAsRead } = useNotifications()

const popoverOpen = ref(false)

// Invitation modal state
const invitationModalOpen = ref(false)
const selectedInvitation = ref<{
  projectInvitationId: string | null
  projectName: string | null
  content: string | null
} | null>(null)

function handleNotificationClick(notification: typeof notifications.value[number]) {
  if (notification.type === NotificationType.ProjectInvite) {
    if (notification.projectInvitationId && notification.invitationStatus === InvitationStatus.Pending) {
      selectedInvitation.value = {
        projectInvitationId: notification.projectInvitationId,
        projectName: notification.projectName,
        content: notification.content
      }
      invitationModalOpen.value = true
      popoverOpen.value = false
      if (!notification.isRead) {
        markAsRead(notification.id)
      }
      return
    }

    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    popoverOpen.value = false
  } else if (notification.issueId) {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    popoverOpen.value = false
  }
}

function onInvitationResponded() {
  refresh()
  void refreshNuxtData(PROJECTS_CACHE_KEY)
}
</script>

<template>
  <UPopover
    v-model:open="popoverOpen"
    :ui="{ content: 'w-80' }"
  >
    <button class="relative flex items-center justify-center rounded-md p-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
      <UIcon
        name="i-lucide-bell"
        class="size-5"
      />
      <span
        v-if="unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <template #content>
      <div class="max-h-80 overflow-y-auto">
        <div class="border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <h4 class="text-sm font-semibold text-slate-900 dark:text-white">
            通知
          </h4>
        </div>

        <div
          v-if="notifications.length === 0"
          class="px-4 py-8 text-center text-sm text-slate-400"
        >
          暫無通知
        </div>

        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="cursor-pointer border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
          :class="{ 'bg-blue-50/50 dark:bg-blue-500/5': !notification.isRead }"
          @click="handleNotificationClick(notification)"
        >
          <div class="flex items-start gap-2">
            <UIcon
              :name="notification.type === NotificationType.ProjectInvite ? 'i-lucide-user-plus' : 'i-lucide-info'"
              class="mt-0.5 size-4 shrink-0"
              :class="notification.isRead ? 'text-slate-400' : 'text-blue-500'"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900 dark:text-white">
                {{ notification.title }}
              </p>
              <p
                v-if="notification.content"
                class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400"
              >
                {{ notification.content }}
              </p>
              <p
                v-if="notification.type === NotificationType.ProjectInvite && notification.invitationStatus === InvitationStatus.Pending"
                class="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                點擊查看邀請
              </p>
            </div>
            <span
              v-if="!notification.isRead"
              class="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>

  <InvitationResponseModal
    v-model:open="invitationModalOpen"
    :invitation="selectedInvitation"
    @responded="onInvitationResponded"
  />
</template>
