import type { Ref, ComputedRef } from 'vue'

export interface ProjectMember {
  userId: string
  name: string | null
  email: string
  createdAt: string
}

interface ProjectMembersResponse {
  data: ProjectMember[]
}

export const getProjectMembersCacheKey = (id: string) => `project-members-${id}`

export function useProjectMembers(projectId: Ref<string> | ComputedRef<string>) {
  return useFetch<ProjectMembersResponse>(() => `/api/projects/${projectId.value}/members`, {
    key: getProjectMembersCacheKey(projectId.value)
  })
}
