<script setup lang="ts">
import type { Comment } from '~~/shared/schemas/issue-comment'

const props = defineProps<{
  projectId: string
  issueId: string
}>()

const toast = useToast()
const { profile } = useProfile()

const projectId = computed(() => props.projectId)
const issueId = computed(() => props.issueId)

const { data: commentsResponse, refresh } = useComments(projectId, issueId)

const comments = computed<Comment[]>(() => commentsResponse.value?.data ?? [])

const newComment = ref('')
const submitting = ref(false)
const inputFocused = ref(false)

const canSubmit = computed(() => {
  const trimmed = newComment.value.trim()
  return trimmed.length >= 1 && trimmed.length <= 2000 && !submitting.value
})

const charCountColor = computed(() => {
  const len = newComment.value.length
  if (len >= 1900) return 'text-red-500 dark:text-red-400'
  if (len >= 1500) return 'text-amber-500 dark:text-amber-400'
  return 'text-slate-400 dark:text-slate-500'
})

async function submitComment() {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    await $fetch(`/api/projects/${props.projectId}/issues/${props.issueId}/comments`, {
      method: 'POST',
      body: { content: newComment.value.trim() }
    })
    newComment.value = ''
    await refresh()
  } catch (err: unknown) {
    const error = err as { data?: { statusMessage?: string } }
    toast.add({
      title: 'Error',
      description: error.data?.statusMessage || 'Failed to add comment',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

const deletingId = ref<number | null>(null)

async function deleteComment(commentId: number) {
  deletingId.value = commentId
  try {
    await $fetch(`/api/projects/${props.projectId}/issues/${props.issueId}/comments/${commentId}`, {
      method: 'DELETE'
    })
    await refresh()
    toast.add({
      title: 'Comment deleted',
      color: 'success'
    })
  } catch (err: unknown) {
    const error = err as { data?: { statusMessage?: string } }
    toast.add({
      title: 'Error',
      description: error.data?.statusMessage || 'Failed to delete comment',
      color: 'error'
    })
  } finally {
    deletingId.value = null
  }
}

function getDisplayName(comment: Comment) {
  return comment.authorName || comment.authorEmail
}

function getInitials(comment: Comment) {
  const name = comment.authorName || comment.authorEmail
  if (!name) return '?'
  const parts = name.trim().split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const avatarPalette = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
]

function getAvatarColor(authorId: string) {
  let hash = 0
  for (let i = 0; i < authorId.length; i++) {
    hash = ((hash << 5) - hash) + authorId.charCodeAt(i)
    hash |= 0
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}

function isOwnComment(comment: Comment) {
  return profile.value?.id === comment.authorId
}

const currentUserInitials = computed(() => {
  const p = profile.value
  if (!p) return '?'
  const name = p.name || p.email
  const parts = name.trim().split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const currentUserAvatarColor = computed(() => {
  return profile.value ? getAvatarColor(profile.value.id) : avatarPalette[0]
})
</script>

<template>
  <div>
    <!-- Section Header -->
    <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
      <UIcon
        name="i-lucide-message-square-text"
        class="size-4 text-slate-500 dark:text-slate-400"
      />
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
        Comments
      </h3>
      <span class="text-xs text-slate-400 dark:text-slate-500">
        ({{ comments.length }})
      </span>
    </div>

    <!-- Empty State -->
    <div
      v-if="comments.length === 0"
      class="flex items-start gap-4 mb-6"
    >
      <div class="shrink-0 size-10" />
      <div class="flex-1 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 py-8 text-center">
        <UIcon
          name="i-lucide-message-circle"
          class="size-5 text-slate-300 dark:text-slate-600 mx-auto mb-1.5"
        />
        <p class="text-sm text-slate-400 dark:text-slate-500">
          No comments yet
        </p>
      </div>
    </div>

    <!-- Comment Thread -->
    <div
      v-else
      class="space-y-4 mb-6"
    >
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex items-start gap-4 group"
      >
        <!-- Avatar -->
        <div
          class="shrink-0 flex items-center justify-center size-10 rounded-full text-xs font-semibold"
          :class="getAvatarColor(comment.authorId)"
        >
          {{ getInitials(comment) }}
        </div>

        <!-- Comment Card -->
        <div class="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <!-- Card Header -->
          <div class="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <span class="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
              {{ getDisplayName(comment) }}
            </span>
            <span class="text-xs text-slate-400 dark:text-slate-500 shrink-0">
              commented {{ useTimeAgo(comment.createdAt).value }}
            </span>
            <!-- Delete menu -->
            <div
              v-if="isOwnComment(comment)"
              class="ml-auto shrink-0"
            >
              <UPopover>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-ellipsis"
                  class="opacity-0 group-hover:opacity-100 transition-opacity size-6"
                />
                <template #content>
                  <div class="p-1">
                    <UButton
                      variant="ghost"
                      color="error"
                      icon="i-lucide-trash-2"
                      size="xs"
                      :loading="deletingId === comment.id"
                      class="w-full justify-start"
                      @click="deleteComment(comment.id)"
                    >
                      Delete comment
                    </UButton>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>
          <!-- Card Body -->
          <div class="px-4 py-3 bg-white dark:bg-slate-900/40">
            <p class="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
              {{ comment.content }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Composer -->
    <div class="flex items-start gap-4">
      <!-- Current user avatar -->
      <div
        class="shrink-0 flex items-center justify-center size-10 rounded-full text-xs font-semibold"
        :class="currentUserAvatarColor"
      >
        {{ currentUserInitials }}
      </div>

      <!-- Input Card -->
      <div
        class="flex-1 min-w-0 rounded-lg border overflow-hidden transition-colors"
        :class="inputFocused
          ? 'border-primary-500 dark:border-primary-400'
          : 'border-slate-200 dark:border-slate-700'"
      >
        <div class="bg-white dark:bg-slate-900/40">
          <UTextarea
            v-model="newComment"
            placeholder="Leave a comment..."
            :rows="4"
            :maxlength="2000"
            autoresize
            variant="none"
            class="w-full"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
          />
        </div>
        <div class="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
          <span
            class="text-[11px] tabular-nums transition-colors"
            :class="charCountColor"
          >
            {{ newComment.length > 0 ? `${newComment.length} / 2,000` : '' }}
          </span>
          <UButton
            :disabled="!canSubmit"
            :loading="submitting"
            size="sm"
            color="primary"
            @click="submitComment"
          >
            Comment
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
