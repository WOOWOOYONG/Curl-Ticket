import type { Ref, ComputedRef } from 'vue'
import type { ProjectWithStats } from '~~/shared/schemas'

interface ProjectResponse {
  data: ProjectWithStats
}

/**
 * 取得專案資料
 * @param projectId - 專案 ID (Ref 或 ComputedRef)
 */
export function useProject(projectId: Ref<string> | ComputedRef<string>) {
  return useFetch<ProjectResponse>(() => `/api/projects/${projectId.value}`, {
    key: `project-${projectId.value}`
  })
}
