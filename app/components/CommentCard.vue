<script setup lang="ts">
import type { Comment } from '~~/shared/schemas/issue-comment'
import type { EditorToolbarItem } from '@nuxt/ui'
import { isHtmlContent } from '~~/shared/utils/html'
import { getInitials, getAvatarColor } from '~~/app/utils/avatar'

const props = defineProps<{
  comment: Comment
  isOwn: boolean
  editing: boolean
  editContent: string
  saving: boolean
  canSaveEdit: boolean
  deletingId: number | null
  toolbarItems: EditorToolbarItem[][]
}>()

const emit = defineEmits<{
  'start-edit': [comment: Comment]
  'cancel-edit': []
  'save-edit': []
  'confirm-delete': [commentId: number]
  'update:editContent': [value: string]
}>()

const localEditContent = computed({
  get: () => props.editContent,
  set: (val: string) => emit('update:editContent', val)
})

function getDisplayName(comment: Comment) {
  return comment.authorName || comment.authorEmail
}
</script>

<template>
  <div class="group flex items-start gap-4">
    <!-- Avatar -->
    <div
      class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      :class="getAvatarColor(comment.authorId)"
    >
      {{ getInitials(getDisplayName(comment)) }}
    </div>

    <!-- Comment Card -->
    <div
      class="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
    >
      <!-- Card Header -->
      <div
        class="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60"
      >
        <span class="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">
          {{ getDisplayName(comment) }}
        </span>
        <span class="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          <template v-if="comment.updatedAt">
            edited {{ useTimeAgo(comment.updatedAt).value }}
          </template>
          <template v-else> commented {{ useTimeAgo(comment.createdAt).value }} </template>
        </span>
        <!-- Actions menu -->
        <div
          v-if="isOwn && !editing"
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
                  class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  @click="emit('start-edit', comment)"
                >
                  <UIcon
                    name="i-lucide-pencil"
                    class="size-4 text-slate-500 dark:text-slate-400"
                  />
                  {{ $t('comments.editComment') }}
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-slate-100 dark:text-red-400 dark:hover:bg-slate-800"
                  :disabled="deletingId === comment.id"
                  @click="emit('confirm-delete', comment.id)"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="size-4"
                  />
                  {{ $t('comments.deleteComment') }}
                </button>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
      <!-- Card Body — Edit Mode -->
      <div
        v-if="editing"
        class="bg-white dark:bg-slate-900/40"
      >
        <ClientOnly>
          <UEditor
            v-model="localEditContent"
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
                class="border-b border-slate-200 px-2.5 py-1 dark:border-slate-700"
              />
            </template>
          </UEditor>
        </ClientOnly>
        <div
          class="flex items-center justify-end gap-2 border-t border-slate-200 px-3 py-2.5 dark:border-slate-700"
        >
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            :disabled="saving"
            @click="emit('cancel-edit')"
          >
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            size="sm"
            color="primary"
            :disabled="!canSaveEdit"
            :loading="saving"
            @click="emit('save-edit')"
          >
            {{ $t('common.save') }}
          </UButton>
        </div>
      </div>
      <!-- Card Body — Read Mode -->
      <div
        v-else
        class="bg-white px-4 py-3 dark:bg-slate-900/40"
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
          class="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap text-slate-700 dark:text-slate-300"
        >
          {{ comment.content }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.comment-content :deep(pre) {
  @apply overflow-x-auto rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-800;
}

.comment-content :deep(code) {
  @apply rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm dark:bg-slate-800;
}

.comment-content :deep(pre code) {
  @apply bg-transparent p-0;
}

.comment-content :deep(blockquote) {
  @apply border-l-4 border-slate-300 pl-4 text-slate-600 italic dark:border-slate-600 dark:text-slate-400;
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
