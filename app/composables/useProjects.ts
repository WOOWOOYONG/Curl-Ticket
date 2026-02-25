import type { ProjectWithStats } from '~~/shared/schemas'
import type { PaginationMeta } from '~~/shared/types'

type ProjectListItem = ProjectWithStats & {
  lastUpdated: string | null
}

interface ProjectsResponse {
  data: ProjectListItem[]
  pagination: PaginationMeta
  summary: {
    totalProjects: number
    totalIssues: number
    openIssues: number
  }
}

export interface UseProjectsOptions {
  page?: number
  pageSize?: number
  search?: string
}

export const PROJECTS_CACHE_KEY = 'projects-list'

/**
 * 取得專案列表（支援分頁與搜尋）
 * @param options - 分頁與搜尋選項 (Ref<UseProjectsOptions>)
 */
export function useProjects(options: Ref<UseProjectsOptions>) {
  return useFetch<ProjectsResponse>(() => {
    const { page = 1, pageSize = 12, search } = options.value
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (search) params.set('search', search)
    return `/api/projects?${params.toString()}`
  }, {
    key: PROJECTS_CACHE_KEY,
    watch: [options],
    deep: true
  })
}
