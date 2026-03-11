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
  const lines: string[] = []
  lines.push(`# ${friendlyId}: ${issue.title}`)
  lines.push(`類型: ${issue.issueType === IssueType.ApiBug ? 'API Bug' : 'Task'}`)
  lines.push(`狀態: ${issue.status}`)

  if (issue.issueType === IssueType.ApiBug) {
    if (issue.method && issue.url) {
      lines.push(`端點: ${issue.method} ${issue.url}`)
    }
    if (issue.environment) {
      lines.push(`環境: ${issue.environment}`)
    }
    if (issue.responseStatus) {
      lines.push(`回應狀態碼: ${issue.responseStatus}`)
    }

    const errorMsg = extractErrorMessage(issue.responseBody)
    if (errorMsg) {
      lines.push(`錯誤訊息: ${truncate(errorMsg, 300)}`)
    }

    if (issue.rawCurl) {
      lines.push(`cURL: ${truncate(simplifyCurl(issue.rawCurl), 500)}`)
    }
  }

  if (issue.description) {
    lines.push(`描述: ${truncate(issue.description, 300)}`)
  }

  return lines.join('\n')
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
