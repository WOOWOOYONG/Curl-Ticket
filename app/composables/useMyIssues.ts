import type { Ref } from 'vue'
import type { IssueStatus, Environment } from '~~/shared/constants'
import type {
  MyIssueProjectRef,
  MyIssuesResponse,
  MyIssuesSortField,
  MyIssuesOrder
} from '~~/shared/schemas'

export interface UseMyIssuesOptions {
  page?: number
  pageSize?: number
  status?: IssueStatus[]
  projectId?: string
  environment?: Environment
  search?: string
  sort?: MyIssuesSortField
  order?: MyIssuesOrder
}

export const MY_ISSUES_CACHE_KEY = 'my-issues-list'
export const MY_ISSUES_SUMMARY_CACHE_KEY = 'my-issues-summary'
export const MY_ISSUES_PROJECTS_CACHE_KEY = 'my-issues-projects'

function buildMyIssuesUrl(options: UseMyIssuesOptions) {
  const params = new URLSearchParams()
  params.set('page', String(options.page ?? 1))
  params.set('pageSize', String(options.pageSize ?? 20))
  if (options.status?.length) {
    for (const s of options.status) params.append('status', s)
  }
  if (options.projectId) params.set('projectId', options.projectId)
  if (options.environment) params.set('environment', options.environment)
  if (options.search) params.set('search', options.search)
  if (options.sort) params.set('sort', options.sort)
  if (options.order) params.set('order', options.order)
  return `/api/me/issues?${params.toString()}`
}

/**
 * Fetch the caller's assigned issues across all accessible projects.
 */
export function useMyIssues(options: Ref<UseMyIssuesOptions>) {
  return useFetch<MyIssuesResponse>(() => buildMyIssuesUrl(options.value), {
    key: MY_ISSUES_CACHE_KEY,
    watch: [options],
    deep: true
  })
}

/**
 * Lightweight summary-only fetch for sidebar badge / dashboard block.
 * Pass an `enabled` ref to defer the call until a profile exists.
 */
export function useMyIssuesSummary(enabled?: Ref<boolean> | ComputedRef<boolean>) {
  return useFetch<MyIssuesResponse>('/api/me/issues?pageSize=1', {
    key: MY_ISSUES_SUMMARY_CACHE_KEY,
    immediate: enabled?.value ?? true,
    watch: enabled ? [enabled] : undefined
  })
}

/**
 * Distinct list of projects that have issues assigned to the caller.
 * Independent of pagination so filter dropdowns stay complete.
 */
export function useMyIssuesProjects() {
  return useFetch<MyIssueProjectRef[]>('/api/me/issues/projects', {
    key: MY_ISSUES_PROJECTS_CACHE_KEY
  })
}
