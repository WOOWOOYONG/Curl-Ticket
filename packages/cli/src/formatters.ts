import { IssueType, CurlNoiseHeaders } from '../../../shared/constants.js'
import type { IssueSummary, IssueDetail } from './types.js'

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function formatIssueSummary(issue: IssueSummary): string {
  const friendlyId = `${issue.projectKey}-${issue.issueNumber}`
  if (issue.issueType === IssueType.Task) {
    return `#${friendlyId} [${issue.status}] (Task) 「${issue.title}」`
  }
  const endpoint = `${issue.method} ${issue.url}`
  const status = issue.responseStatus ?? '-'
  return `#${friendlyId} [${issue.status}] ${endpoint} → ${status} 「${issue.title}」`
}

export function formatIssueDetail(issue: IssueDetail, friendlyId: string): string {
  const isApiBug = issue.issueType === IssueType.ApiBug
  const errorMsg = isApiBug ? extractErrorMessage(issue.responseBody) : null

  const fields: [string, string | number | null | undefined][] = [
    [`# ${friendlyId}`, issue.title],
    ['類型', isApiBug ? 'API Bug' : 'Task'],
    ['狀態', issue.status],
    ['端點', isApiBug && issue.method && issue.url ? `${issue.method} ${issue.url}` : null],
    ['環境', isApiBug ? issue.environment : null],
    ['回應狀態碼', isApiBug ? issue.responseStatus : null],
    ['錯誤訊息', errorMsg && truncate(errorMsg, 300)],
    ['cURL', isApiBug && issue.rawCurl ? truncate(simplifyCurl(issue.rawCurl), 500) : null],
    ['描述', issue.description && truncate(issue.description, 300)]
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

export function simplifyCurl(rawCurl: string): string {
  let result = rawCurl

  for (const header of CurlNoiseHeaders) {
    // Match -H 'header: value' or -H "header: value"
    const pattern = new RegExp(
      `\\s+-H\\s+['"]${header}:\\s*[^'"]*['"]`,
      'gi'
    )
    result = result.replace(pattern, '')
  }

  // Remove sec-* headers
  result = result.replace(
    /\s+-H\s+['"]sec-[^'"]*['"]/gi,
    ''
  )

  // Collapse multiple spaces
  result = result.replace(/\s{2,}/g, ' ').trim()

  return result
}
