import { createInterface } from 'node:readline'
import { IssueStatus, issueTypes, COMMENT_MAX_LENGTH } from '#shared/constants.js'
import type { IssueType } from '#shared/constants.js'

export function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer: string) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const STATUS_ALIASES: Record<string, IssueStatus> = {
  open: IssueStatus.Open,
  'in-progress': IssueStatus.InProgress,
  'in progress': IssueStatus.InProgress,
  done: IssueStatus.Done,
  close: IssueStatus.Close
}

export const VALID_STATUS_INPUTS = ['Open', 'in-progress', 'Done', 'Close'] as const

export function normalizeStatus(status: string): IssueStatus {
  const normalized = STATUS_ALIASES[status.toLowerCase()]
  if (!normalized) {
    throw new ValidationError(`Invalid status. Valid values: ${VALID_STATUS_INPUTS.join(', ')}`)
  }
  return normalized
}

export function parseIssueId(
  issueId: string
): { type: 'id'; value: string } | { type: 'number'; value: number } {
  if (/^\d+$/.test(issueId)) {
    return { type: 'id', value: issueId }
  }
  const match = issueId.match(/^[A-Z]+-(\d+)$/i)
  if (match) {
    return { type: 'number', value: parseInt(match[1], 10) }
  }
  throw new ValidationError(
    `Invalid issue ID format: ${issueId}. Use a numeric ID or friendly ID (e.g. CT-42).`
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateProjectId(projectId: string): void {
  if (!UUID_RE.test(projectId)) {
    throw new ValidationError(`Invalid projectId: "${projectId}" is not a valid UUID.`)
  }
}

export function validateCommentContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new ValidationError('Comment content cannot be empty.')
  }
  if (content.length > COMMENT_MAX_LENGTH) {
    throw new ValidationError(`Comment content cannot exceed ${COMMENT_MAX_LENGTH} characters.`)
  }
}

export function normalizeType(type: string): IssueType {
  const lower = type.toLowerCase().replace(/-/g, '_')
  const valid = issueTypes as readonly string[]
  if (!valid.includes(lower)) {
    throw new ValidationError(`Invalid type "${type}". Valid values: ${issueTypes.join(', ')}`)
  }
  return lower as IssueType
}
