import type { Ref, ComputedRef } from 'vue'
import type { IssueListItem } from '~~/shared/schemas'
import type { IssueStatus, Environment, IssueType, HttpMethod } from '~~/shared/constants'
import type { PaginationMeta } from '~~/shared/types'

interface IssuesResponse {
  data: IssueListItem[]
  pagination: PaginationMeta
}

export interface UseIssuesOptions {
  page?: number
  pageSize?: number
  status?: IssueStatus
  environment?: Environment
  issueType?: IssueType
  method?: HttpMethod
  search?: string
}

/** Issues 列表的 cache key 前綴（同一專案的所有篩選/分頁變體共用此前綴，供失效時用 predicate 一次清除）。 */
export const getIssuesCacheKey = (projectId: string) => `project-${projectId}-issues`
export const getIssueCacheKey = (projectId: string, issueId: string) =>
  `project-${projectId}-issue-${issueId}`

/**
 * 取得專案的 Issues 列表
 * @param projectId - 專案 ID (Ref 或 ComputedRef)
 * @param options - 分頁與篩選選項 (Ref<UseIssuesOptions>)
 */
export function useIssues(
  projectId: Ref<string> | ComputedRef<string>,
  options: Ref<UseIssuesOptions>
) {
  const buildQuery = () => {
    const {
      page = 1,
      pageSize = 20,
      status,
      environment,
      issueType,
      method,
      search
    } = options.value
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))

    if (status) params.set('status', status)
    if (environment) params.set('environment', environment)
    if (issueType) params.set('issueType', issueType)
    if (method) params.set('method', method)
    if (search) params.set('search', search)

    return params.toString()
  }

  return useFetch<IssuesResponse>(() => `/api/projects/${projectId.value}/issues?${buildQuery()}`, {
    // key 隨 projectId + 篩選/分頁參數變動，讓每種組合各有獨立 cache entry，避免互相覆蓋或 SSR 還原錯誤資料
    key: () => `${getIssuesCacheKey(projectId.value)}?${buildQuery()}`,
    watch: [projectId, options],
    deep: true
  })
}
