import type { Ref, ComputedRef } from 'vue'
import type { Comment } from '~~/shared/schemas/issue-comment'

interface CommentsResponse {
  data: Comment[]
}

export const getCommentsCacheKey = (projectId: string, issueId: string) =>
  `project-${projectId}-issue-${issueId}-comments`

export function useComments(
  projectId: Ref<string> | ComputedRef<string>,
  issueId: Ref<string> | ComputedRef<string>
) {
  return useFetch<CommentsResponse>(
    () => `/api/projects/${projectId.value}/issues/${issueId.value}/comments`,
    {
      key: () => getCommentsCacheKey(projectId.value, issueId.value)
    }
  )
}
