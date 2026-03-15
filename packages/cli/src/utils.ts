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
    throw new Error(`Invalid status. Valid values: ${VALID_STATUS_INPUTS.join(', ')}`)
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
  throw new Error(`Invalid issue ID format: ${issueId}. Use a numeric ID or friendly ID (e.g. CT-42).`)
}
