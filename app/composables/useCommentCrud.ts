import type { Ref, ComputedRef } from 'vue'
import type { Comment } from '~~/shared/schemas/issue-comment'
import type { EditorToolbarItem } from '@nuxt/ui'

interface EditorInstance {
  isEmpty: boolean
  chain(): { focus(): { clearContent(): { run(): void } } }
}

export const COMMENT_MAX_LENGTH = 5000
export const COMMENT_MAX_LENGTH_DISPLAY = COMMENT_MAX_LENGTH.toLocaleString()

export const commentToolbarItems: EditorToolbarItem[][] = [
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

export function useCommentCrud(
  projectId: Ref<string> | ComputedRef<string>,
  issueId: Ref<string> | ComputedRef<string>,
  editorRef: Readonly<Ref<{ editor: EditorInstance } | null | undefined>>
) {
  const toast = useToast()
  const { data: commentsResponse, refresh } = useComments(projectId, issueId)

  const comments = computed<Comment[]>(() => commentsResponse.value?.data ?? [])

  // --- Composer ---
  const newComment = ref('')
  const submitting = ref(false)

  const isEditorEmpty = computed((): boolean => {
    return editorRef.value?.editor?.isEmpty ?? true
  })

  const canSubmit = computed((): boolean => {
    return !isEditorEmpty.value && newComment.value.length <= COMMENT_MAX_LENGTH && !submitting.value
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
      await $fetch(`/api/projects/${projectId.value}/issues/${issueId.value}/comments`, {
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

  // --- Edit ---
  const editingId = ref<number | null>(null)
  const editContent = ref('')
  const saving = ref(false)

  const canSaveEdit = computed((): boolean => {
    return editingId.value !== null && editContent.value.length <= COMMENT_MAX_LENGTH && !saving.value
  })

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

    if (editContent.value.length > COMMENT_MAX_LENGTH) {
      toast.add({
        title: 'Error',
        description: `Comment exceeds maximum length of ${COMMENT_MAX_LENGTH_DISPLAY} characters`,
        color: 'error'
      })
      return
    }

    saving.value = true
    try {
      await $fetch(`/api/projects/${projectId.value}/issues/${issueId.value}/comments/${editingId.value}`, {
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

  // --- Delete ---
  const deletingId = ref<number | null>(null)
  const deleteTargetId = ref<number | null>(null)

  function confirmDelete(commentId: number) {
    deleteTargetId.value = commentId
  }

  async function deleteComment() {
    if (!deleteTargetId.value) return

    deletingId.value = deleteTargetId.value
    try {
      await $fetch(`/api/projects/${projectId.value}/issues/${issueId.value}/comments/${deleteTargetId.value}`, {
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

  return {
    comments,
    refresh,
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
  }
}
