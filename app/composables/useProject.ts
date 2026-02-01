import type { MaybeRef } from 'vue'
import type { ProjectWithStats } from '~~/shared/schemas'

interface ProjectResponse {
  data: ProjectWithStats
}

/**
 * 取得專案資料
 * @param projectId - 專案 ID (string 或 Ref<string>)
 */
export function useProject(projectId: MaybeRef<string>) {
  const id = toRef(projectId)

  return useFetch<ProjectResponse>(() => `/api/projects/${id.value}`, {
    key: `project-${id.value}`
  })
}
