import type { Ref, ComputedRef } from 'vue'
import type { ProjectWithStats } from '~~/shared/schemas'

interface ProjectResponse {
  data: ProjectWithStats
}

export const getProjectCacheKey = (id: string) => `project-${id}`

/**
 * 取得專案資料
 * @param projectId - 專案 ID (Ref 或 ComputedRef)
 */
export function useProject(projectId: Ref<string> | ComputedRef<string>) {
  return useFetch<ProjectResponse>(() => `/api/projects/${projectId.value}`, {
    // key 隨 projectId 響應變動，避免專案間切換時沿用舊 cache
    key: () => getProjectCacheKey(projectId.value)
  })
}
