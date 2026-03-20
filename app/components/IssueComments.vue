<script setup lang="ts">
import type { Comment } from '~~/shared/schemas/issue-comment'
import type { EditorToolbarItem } from '@nuxt/ui'
import { isHtmlContent } from '~~/shared/utils/html'

interface EditorInstance {
  isEmpty: boolean
  chain(): { focus(): { clearContent(): { run(): void } } }
}

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
const editorRef = useTemplateRef<{ editor: EditorInstance }>('editorRef')

const MAX_LENGTH = 5000
const MAX_LENGTH_DISPLAY = MAX_LENGTH.toLocaleString()

const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } }
  ],
  [
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Inline Code' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' } }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Bullet List' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Ordered List' } }
  ],
  [
    { kind: 'blockquote', icon: 'i-lucide-quote', tooltip: { text: 'Blockquote' } },
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]

const isEditorEmpty = computed((): boolean => {
  return editorRef.value?.editor?.isEmpty ?? true
})

const canSubmit = computed((): boolean => {
  return !isEditorEmpty.value && newComment.value.length <= MAX_LENGTH && !submitting.value
})

const charCountColor = computed(() => {
  const len = newComment.value.length
  if (len >= 4750) return 'text-red-500 dark:text-red-400'
  if (len >= 4500) return 'text-amber-500 dark:text-amber-400'
  return 'text-slate-400 dark:text-slate-500'
})

async function submitComment() {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    await $fetch(`/api/projects/${props.projectId}/issues/${props.issueId}/comments`, {
      method: 'POST',
      body: { content: newComment.value }
    })
    editorRef.value?.editor?.chain().focus().clearContent().run()
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

const editingId = ref<number | null>(null)
const editContent = ref('')
const saving = ref(false)

function startEdit(comment: Comment) {
  editingId.value = comment.id
  editContent.value = comment.content
}

function cancelEdit() {
  editingId.value = null
  editContent.value = ''
}

async function saveEdit() {
  if (!editingId.value || saving.value) return

  saving.value = true
  try {
    await $fetch(`/api/projects/${props.projectId}/issues/${props.issueId}/comments/${editingId.value}`, {
      method: 'PATCH',
      body: { content: editContent.value }
    })
    editingId.value = null
    editContent.value = ''
    await refresh()
  } catch (err: unknown) {
    const error = err as { data?: { statusMessage?: string } }
    toast.add({
      title: 'Error',
      description: error.data?.statusMessage || 'Failed to update comment',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const deletingId = ref<number | null>(null)
const deleteTargetId = ref<number | null>(null)

function confirmDelete(commentId: number) {
  deleteTargetId.value = commentId
}

async function deleteComment() {
  if (!deleteTargetId.value) return

  deletingId.value = deleteTargetId.value
  try {
    await $fetch(`/api/projects/${props.projectId}/issues/${props.issueId}/comments/${deleteTargetId.value}`, {
      method: 'DELETE'
    })
    deleteTargetId.value = null
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
              <template v-if="comment.updatedAt">
                edited {{ useTimeAgo(comment.updatedAt).value }}
              </template>
              <template v-else>
                commented {{ useTimeAgo(comment.createdAt).value }}
              </template>
            </span>
            <!-- Actions menu -->
            <div
              v-if="isOwnComment(comment) && editingId !== comment.id"
              class="ml-auto shrink-0"
            >
              <UPopover>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-ellipsis"
                  class="size-6"
                />
                <template #content>
                  <div class="w-48 py-1">
                    <button
                      type="button"
                      class="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      @click="startEdit(comment)"
                    >
                      <UIcon
                        name="i-lucide-pencil"
                        class="size-4 text-slate-500 dark:text-slate-400"
                      />
                      Edit comment
                    </button>
                    <button
                      type="button"
                      class="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      :disabled="deletingId === comment.id"
                      @click="confirmDelete(comment.id)"
                    >
                      <UIcon
                        name="i-lucide-trash-2"
                        class="size-4"
                      />
                      Delete comment
                    </button>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>
          <!-- Card Body — Edit Mode -->
          <div
            v-if="editingId === comment.id"
            class="bg-white dark:bg-slate-900/40"
          >
            <ClientOnly>
              <UEditor
                v-model="editContent"
                content-type="html"
                class="comment-editor"
                :image="false"
                :mention="false"
                :ui="{ content: 'min-h-24 px-4 py-3' }"
              >
                <template #default="{ editor }">
                  <UEditorToolbar
                    :editor="editor"
                    :items="toolbarItems"
                    class="px-2.5 py-1 border-b border-slate-200 dark:border-slate-700"
                  />
                </template>
              </UEditor>
            </ClientOnly>
            <div class="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700">
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                :disabled="saving"
                @click="cancelEdit"
              >
                Cancel
              </UButton>
              <UButton
                size="sm"
                color="primary"
                :loading="saving"
                @click="saveEdit"
              >
                Save
              </UButton>
            </div>
          </div>
          <!-- Card Body — Read Mode -->
          <div
            v-else
            class="px-4 py-3 bg-white dark:bg-slate-900/40"
          >
            <!-- Rich text (HTML) comment -->
            <div
              v-if="isHtmlContent(comment.content)"
              class="comment-content prose prose-sm prose-slate dark:prose-invert max-w-none wrap-break-word"
              v-html="comment.content"
            />
            <!-- Plain text comment (backward compat) -->
            <p
              v-else
              class="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap wrap-break-word"
            >
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

      <!-- Editor Card -->
      <div class="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:border-primary-500 dark:focus-within:border-primary-400 transition-colors">
        <div class="bg-white dark:bg-slate-900/40">
          <ClientOnly>
            <UEditor
              ref="editorRef"
              v-model="newComment"
              content-type="html"
              placeholder="Leave a comment..."
              class="comment-editor"
              :image="false"
              :mention="false"
              :ui="{ content: 'min-h-24 px-4 py-3' }"
            >
              <template #default="{ editor }">
                <UEditorToolbar
                  :editor="editor"
                  :items="toolbarItems"
                  class="px-2.5 py-1 border-b border-slate-200 dark:border-slate-700"
                />
              </template>
            </UEditor>
          </ClientOnly>
        </div>
        <div class="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
          <span
            class="text-[11px] tabular-nums transition-colors"
            :class="charCountColor"
          >
            {{ newComment.length > 0 ? `${newComment.length} / ${MAX_LENGTH_DISPLAY}` : '' }}
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

    <!-- Delete confirmation modal -->
    <ConfirmModal
      :open="deleteTargetId !== null"
      title="Delete comment"
      description="Are you sure you want to delete this comment? This action cannot be undone."
      confirm-label="Delete"
      :loading="deletingId !== null"
      :on-confirm="deleteComment"
      :on-cancel="() => { deleteTargetId = null }"
      @update:open="(val: boolean) => { if (!val) deleteTargetId = null }"
    />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.comment-content :deep(pre) {
  @apply bg-slate-100 dark:bg-slate-800 rounded-md p-3 overflow-x-auto text-sm;
}

.comment-content :deep(code) {
  @apply bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 text-sm font-mono;
}

.comment-content :deep(pre code) {
  @apply bg-transparent p-0;
}

.comment-content :deep(blockquote) {
  @apply border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400;
}

.comment-content :deep(a) {
  @apply text-primary-600 dark:text-primary-400 underline;
}

.comment-content :deep(ul) {
  @apply list-disc pl-5;
}

.comment-content :deep(ol) {
  @apply list-decimal pl-5;
}

.comment-editor :deep(.tiptap) {
  @apply text-sm leading-relaxed text-slate-700 dark:text-slate-300;
}

.comment-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  @apply text-slate-400 dark:text-slate-500;
}
</style>
