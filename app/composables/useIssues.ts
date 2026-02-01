import type { Ref, ComputedRef } from 'vue'
import type { IssueListItem } from '~~/shared/schemas'
import type { IssueStatus, Environment } from '~~/shared/constants'

interface IssuesResponse {
  data: IssueListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface UseIssuesOptions {
  page?: number
  pageSize?: number
  status?: IssueStatus
  environment?: Environment
}

/**
 * 取得專案的 Issues 列表
 * @param projectId - 專案 ID (Ref 或 ComputedRef)
 * @param options - 分頁與篩選選項 (Ref<UseIssuesOptions>)
 */
export function useIssues(
  projectId: Ref<string> | ComputedRef<string>,
  options: Ref<UseIssuesOptions>
) {
  return useFetch<IssuesResponse>(() => {
    const { page = 1, pageSize = 20, status, environment } = options.value
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))

    if (status) params.set('status', status)
    if (environment) params.set('environment', environment)

    return `/api/projects/${projectId.value}/issues?${params.toString()}`
  }, {
    watch: [projectId, options],
    deep: true
  })
}
