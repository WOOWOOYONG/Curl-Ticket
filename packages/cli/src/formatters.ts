import { IssueType, CurlNoiseHeaders } from '#shared/constants.js'
import type { IssueSummary, IssueDetail, CommentItem, Pagination } from './types.js'

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

function formatAssignee(issue: IssueSummary): string {
  if (issue.assignee?.name) return issue.assignee.name
  if (issue.assignee?.email) return issue.assignee.email
  return 'Unassigned'
}

export function formatIssueSummary(issue: IssueSummary): string {
  const friendlyId = `${issue.projectKey}-${issue.issueNumber}`
  const assignee = formatAssignee(issue)
  if (issue.issueType === IssueType.Task) {
    return `#${friendlyId} [${issue.status}] (Task) [${assignee}] 「${issue.title}」`
  }
  const endpoint = `${issue.method} ${issue.url}`
  const status = issue.responseStatus ?? '-'
  return `#${friendlyId} [${issue.status}] ${endpoint} → ${status} [${assignee}] 「${issue.title}」`
}

export function formatIssueDetail(issue: IssueDetail, friendlyId: string): string {
  const isApiBug = issue.issueType === IssueType.ApiBug
  const errorMsg = isApiBug ? extractErrorMessage(issue.responseBody) : null
  const assigneeDisplay = issue.assignee?.name ?? issue.assignee?.email ?? 'Unassigned'

  const fields: [string, string | number | null | undefined][] = [
    [`# ${friendlyId}`, issue.title],
    ['Type', isApiBug ? 'API Bug' : 'Task'],
    ['Status', issue.status],
    ['Assignee', assigneeDisplay],
    ['Endpoint', isApiBug && issue.method && issue.url ? `${issue.method} ${issue.url}` : null],
    ['Environment', isApiBug ? issue.environment : null],
    ['Response Status', isApiBug ? issue.responseStatus : null],
    ['Error', errorMsg && truncate(errorMsg, 300)],
    ['cURL', isApiBug && issue.rawCurl ? truncate(simplifyCurl(issue.rawCurl), 500) : null],
    ['Description', issue.description && truncate(issue.description, 300)]
  ]

  return fields
    .filter(([, value]) => value != null)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}

export function extractErrorMessage(responseBody: unknown): string | null {
  if (responseBody == null) return null

  let obj: unknown = responseBody

  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj)
    } catch {
      return truncate(obj as string, 200)
    }
  }

  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>
    for (const key of ['message', 'error', 'statusMessage']) {
      if (typeof record[key] === 'string') {
        return record[key]
      }
    }
    const dataMsg = (record.data as Record<string, unknown>)?.message
    if (typeof dataMsg === 'string') {
      return dataMsg
    }
    return truncate(JSON.stringify(obj), 200)
  }

  return String(obj)
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function formatCommentSummary(comment: CommentItem): string {
  const author = comment.authorName ?? comment.authorEmail
  const date = new Date(comment.createdAt).toLocaleString()
  const content = stripHtml(comment.content)
  return `[#${comment.id}] ${author} (${date}):\n  ${truncate(content, 300)}`
}

export function formatCommentDetail(comment: CommentItem): string {
  const author = comment.authorName ?? comment.authorEmail
  const created = new Date(comment.createdAt).toLocaleString()
  const content = stripHtml(comment.content)

  const fields: [string, string | number | null][] = [
    ['Comment', `#${comment.id}`],
    ['Author', author],
    ['Created', created],
    ['Updated', comment.updatedAt ? new Date(comment.updatedAt).toLocaleString() : null],
    ['Content', content]
  ]

  return fields
    .filter(([, value]) => value != null)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n')
}

export function formatPagination(pagination: Pagination): string {
  if (pagination.totalPages <= 1) return ''
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(start + pagination.pageSize - 1, pagination.total)
  return `Showing ${start}-${end} of ${pagination.total} (page ${pagination.page}/${pagination.totalPages})`
}

export function simplifyCurl(rawCurl: string): string {
  let result = rawCurl

  for (const header of CurlNoiseHeaders) {
    // Match -H 'header: value' or -H "header: value"
    const pattern = new RegExp(`\\s+-H\\s+['"]${header}:\\s*[^'"]*['"]`, 'gi')
    result = result.replace(pattern, '')
  }

  // Remove sec-* headers
  result = result.replace(/\s+-H\s+['"]sec-[^'"]*['"]/gi, '')

  // Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim()

  return result
}
