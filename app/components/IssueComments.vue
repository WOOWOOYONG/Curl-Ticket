<script setup lang="ts">
import { getInitials, getAvatarColor } from '~~/app/utils/avatar'
import { commentToolbarItems, COMMENT_MAX_LENGTH_DISPLAY } from '~~/app/composables/useCommentCrud'

interface EditorInstance {
  isEmpty: boolean
  chain(): { focus(): { clearContent(): { run(): void } } }
}

const props = defineProps<{
  projectId: string
  issueId: string
}>()

const { profile } = useProfile()

const projectId = computed(() => props.projectId)
const issueId = computed(() => props.issueId)
const editorRef = useTemplateRef<{ editor: EditorInstance }>('editorRef')

const {
  comments,
  newComment,
  submitting,
  canSubmit,
  charCountColor,
  submitComment,
  editingId,
  editContent,
  saving,
  canSaveEdit,
  startEdit,
  cancelEdit,
  saveEdit,
  deletingId,
  deleteTargetId,
  confirmDelete,
  deleteComment
} = useCommentCrud(projectId, issueId, editorRef)

function isOwnComment(authorId: string) {
  return profile.value?.id === authorId
}

const currentUserAvatarUrl = computed(() => profile.value?.avatarUrl ?? null)

const currentUserInitials = computed(() => {
  const p = profile.value
  if (!p) return '?'
  return getInitials(p.name || p.email)
})

const currentUserAvatarColor = computed(() => {
  return profile.value ? getAvatarColor(profile.value.id) : ''
})
</script>

<template>
  <div>
    <!-- Section Header -->
    <div class="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
      <UIcon
        name="i-lucide-message-square-text"
        class="size-4 text-slate-500 dark:text-slate-400"
      />
      <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
        {{ $t('comments.title') }}
      </h3>
      <span class="text-xs text-slate-400 dark:text-slate-500"> ({{ comments.length }}) </span>
    </div>

    <!-- Empty State -->
    <div
      v-if="comments.length === 0"
      class="mb-6 flex items-start gap-4"
    >
      <div class="size-10 shrink-0" />
      <div
        class="flex-1 rounded-lg border border-dashed border-slate-200 py-8 text-center dark:border-slate-700"
      >
        <UIcon
          name="i-lucide-message-circle"
          class="mx-auto mb-1.5 size-5 text-slate-300 dark:text-slate-600"
        />
        <p class="text-sm text-slate-400 dark:text-slate-500">
          {{ $t('comments.noComments') }}
        </p>
      </div>
    </div>

    <!-- Comment Thread -->
    <div
      v-else
      class="mb-6 space-y-4"
    >
      <CommentCard
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :is-own="isOwnComment(comment.authorId)"
        :editing="editingId === comment.id"
        :edit-content="editContent"
        :saving="saving"
        :can-save-edit="canSaveEdit"
        :deleting-id="deletingId"
        :toolbar-items="commentToolbarItems"
        @start-edit="startEdit"
        @cancel-edit="cancelEdit"
        @save-edit="saveEdit"
        @confirm-delete="confirmDelete"
        @update:edit-content="editContent = $event"
      />
    </div>

    <!-- Composer -->
    <div class="flex items-start gap-4">
      <!-- Current user avatar -->
      <ClientOnly>
        <img
          v-if="currentUserAvatarUrl"
          :src="currentUserAvatarUrl"
          :alt="currentUserInitials"
          class="size-10 shrink-0 rounded-full object-cover"
          referrerpolicy="no-referrer"
        >
        <div
          v-else
          class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="currentUserAvatarColor"
        >
          {{ currentUserInitials }}
        </div>
        <template #fallback>
          <div
            class="size-10 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800"
          />
        </template>
      </ClientOnly>

      <!-- Editor Card -->
      <div
        class="focus-within:border-primary-500 dark:focus-within:border-primary-400 min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 transition-colors dark:border-slate-700"
      >
        <div class="bg-white dark:bg-slate-900/40">
          <ClientOnly>
            <UEditor
              ref="editorRef"
              v-model="newComment"
              content-type="html"
              :placeholder="$t('comments.placeholder')"
              class="comment-editor"
              :image="false"
              :mention="false"
              :ui="{ content: 'min-h-24 px-4 py-3' }"
            >
              <template #default="{ editor }">
                <UEditorToolbar
                  :editor="editor"
                  :items="commentToolbarItems"
                  class="border-b border-slate-200 px-2.5 py-1 dark:border-slate-700"
                />
              </template>
            </UEditor>
          </ClientOnly>
        </div>
        <div
          class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
        >
          <span
            class="text-[11px] tabular-nums transition-colors"
            :class="charCountColor"
          >
            {{
              newComment.length > 0 ? `${newComment.length} / ${COMMENT_MAX_LENGTH_DISPLAY}` : ''
            }}
          </span>
          <UButton
            :disabled="!canSubmit"
            :loading="submitting"
            size="sm"
            color="primary"
            @click="submitComment"
          >
            {{ $t('comments.submit') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <ConfirmModal
      :open="deleteTargetId !== null"
      :title="$t('comments.deleteComment')"
      :description="$t('comments.deleteConfirm')"
      :confirm-label="$t('common.delete')"
      :loading="deletingId !== null"
      :on-confirm="deleteComment"
      :on-cancel="
        () => {
          deleteTargetId = null
        }
      "
      @update:open="
        (val: boolean) => {
          if (!val) deleteTargetId = null
        }
      "
    />
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.comment-editor :deep(.tiptap) {
  @apply text-sm leading-relaxed text-slate-700 dark:text-slate-300;
}

.comment-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  @apply text-slate-400 dark:text-slate-500;
}
</style>
