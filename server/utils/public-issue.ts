import { randomBytes } from 'node:crypto'
import type { issues } from '~~/server/database/schema'
import type { AssigneeSummary, PublicIssue } from '~~/shared/schemas/issue'
import { IssueType } from '~~/shared/constants'
import { maskHeaders } from '~~/shared/utils/headers'

export const SHARE_TOKEN_BYTES = 32

type IssueRow = typeof issues.$inferSelect

export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url')
}

export function canShareIssue(issue: Pick<IssueRow, 'issueType' | 'method' | 'url'>): boolean {
  return issue.issueType === IssueType.ApiBug && Boolean(issue.method) && Boolean(issue.url)
}

export function buildPublicShareStatus(
  issue: Pick<IssueRow, 'publicShareToken' | 'publicSharedAt'>,
  origin: string
) {
  return {
    enabled: Boolean(issue.publicShareToken),
    sharedAt: issue.publicSharedAt,
    shareUrl: issue.publicShareToken ? `${origin}/share/issues/${issue.publicShareToken}` : null
  }
}

export function buildProtectedIssueData(issue: IssueRow, assignee: AssigneeSummary | null) {
  const { publicShareToken: _publicShareToken, publicSharedAt: _publicSharedAt, ...data } = issue
  return { ...data, assignee }
}

type PublicIssueSource = Pick<
  IssueRow,
  | 'projectKey'
  | 'issueNumber'
  | 'title'
  | 'description'
  | 'method'
  | 'url'
  | 'environment'
  | 'requestHeaders'
  | 'requestBody'
  | 'responseStatus'
  | 'responseBody'
  | 'createdAt'
  | 'updatedAt'
>

export function buildPublicIssueDTO(issue: PublicIssueSource): PublicIssue {
  if (!issue.method || !issue.url) {
    throw new Error('Public issue is missing API request data')
  }

  return {
    friendlyId: `${issue.projectKey}-${issue.issueNumber}`,
    title: issue.title,
    description: issue.description,
    method: issue.method,
    url: issue.url,
    environment: issue.environment,
    requestHeaders: maskHeaders(issue.requestHeaders),
    requestBody: issue.requestBody,
    responseStatus: issue.responseStatus,
    responseBody: issue.responseBody,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt
  }
}
