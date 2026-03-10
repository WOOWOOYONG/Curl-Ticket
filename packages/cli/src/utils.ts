import { IssueStatus } from '../../../shared/constants.js'

const STATUS_ALIASES: Record<string, IssueStatus> = {
  'open': IssueStatus.Open,
  'in-progress': IssueStatus.InProgress,
  'in progress': IssueStatus.InProgress,
  'done': IssueStatus.Done,
  'close': IssueStatus.Close
}

const VALID_STATUS_INPUTS = ['Open', 'in-progress', 'Done', 'Close']

export function normalizeStatus(status: string): IssueStatus {
  const normalized = STATUS_ALIASES[status.toLowerCase()]
  if (!normalized) {
    throw new Error(`無效的狀態值，合法值為：${VALID_STATUS_INPUTS.join(', ')}`)
  }
  return normalized
}

export function parseIssueId(issueId: string): { type: 'id', value: string } | { type: 'number', value: number } {
  if (/^\d+$/.test(issueId)) {
    return { type: 'id', value: issueId }
  }
  const match = issueId.match(/^[A-Z]+-(\d+)$/i)
  if (match) {
    return { type: 'number', value: parseInt(match[1], 10) }
  }
  throw new Error(`無效的 issue ID 格式：${issueId}。請使用數字 ID 或 friendly ID（如 CT-42）。`)
}
