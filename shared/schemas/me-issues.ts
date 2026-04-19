import { z } from 'zod'
import { environments, issueStatuses, IssueStatus } from '../constants'
import type { PaginationMeta } from '../types'

export const myIssuesSortFields = ['updatedAt', 'createdAt', 'status'] as const
export type MyIssuesSortField = (typeof myIssuesSortFields)[number]

export const myIssuesOrderValues = ['asc', 'desc'] as const
export type MyIssuesOrder = (typeof myIssuesOrderValues)[number]

/** Coerce a single-or-array query param into string[] */
const statusArraySchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined
  return Array.isArray(val) ? val : [val]
}, z.array(z.enum(issueStatuses)).optional())

export const myIssuesQuerySchema = z.object({
  status: statusArraySchema,
  projectId: z.uuid().optional(),
  environment: z.enum(environments).optional(),
  search: z.string().optional(),
  sort: z.enum(myIssuesSortFields).default('updatedAt'),
  order: z.enum(myIssuesOrderValues).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
})

export type MyIssuesQuery = z.infer<typeof myIssuesQuerySchema>

export interface MyIssueProjectRef {
  id: string
  key: string
  name: string
}

export interface MyIssueListItem {
  id: number
  issueNumber: number
  title: string
  status: (typeof issueStatuses)[number]
  environment: string | null
  assigneeId: string | null
  updatedAt: string
  createdAt: string
  project: MyIssueProjectRef
}

export interface MyIssuesSummary {
  open: number
  inProgress: number
  done: number
  close: number
  total: number
}

export const EMPTY_MY_ISSUES_SUMMARY: MyIssuesSummary = {
  open: 0,
  inProgress: 0,
  done: 0,
  close: 0,
  total: 0
}

export interface MyIssuesResponse {
  data: MyIssueListItem[]
  pagination: PaginationMeta
  summary: MyIssuesSummary
}

export const ISSUE_STATUS_SUMMARY_KEY: Record<
  (typeof issueStatuses)[number],
  keyof MyIssuesSummary
> = {
  [IssueStatus.Open]: 'open',
  [IssueStatus.InProgress]: 'inProgress',
  [IssueStatus.Done]: 'done',
  [IssueStatus.Close]: 'close'
}
