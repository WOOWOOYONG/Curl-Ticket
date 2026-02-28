import type { Issue } from '~~/shared/schemas/issue'

export interface IssueResponse {
  data: Issue
  friendlyId: string
}
