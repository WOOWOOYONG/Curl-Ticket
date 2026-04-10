import type { IssueType, IssueStatus } from '#shared/constants.js'

export interface Project {
  id: string
  name: string
  key: string
  description: string | null
  ownerId: string
  environments: string[]
  createdAt: string
  totalIssues: number
  openIssues: number
  lastUpdated: string | null
}

export interface IssueSummary {
  id: number
  issueNumber: number
  projectKey: string
  issueType: IssueType
  title: string
  method: string | null
  url: string | null
  environment: string | null
  status: IssueStatus
  responseStatus: number | null
  createdAt: string
  updatedAt: string
}

export interface IssueDetail extends IssueSummary {
  projectId: string
  description: string | null
  rawCurl: string | null
  requestHeaders: Record<string, string> | null
  requestBody: unknown | null
  responseBody: unknown | null
  createdBy: string
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ProjectsResponse {
  data: Project[]
  pagination: Pagination
}

export interface IssuesResponse {
  data: IssueSummary[]
  pagination: Pagination
}

export interface IssueResponse {
  data: IssueDetail
  friendlyId: string
}

export interface AuthConfig {
  url: string
  token: string
}

export interface DeviceCodeResponse {
  deviceCode: string
  userCode: string
  verificationUrl: string
  expiresIn: number
  interval: number
}

export interface DeviceTokenResponse {
  status: 'pending' | 'complete' | 'expired' | 'consumed'
  token?: string
  url?: string
}

export interface CommentItem {
  id: number
  issueId: number
  authorId: string
  authorName: string | null
  authorEmail: string
  content: string
  createdAt: string
  updatedAt: string | null
}

export interface CommentsResponse {
  data: CommentItem[]
}

export interface CommentResponse {
  data: CommentItem
}

export interface DeleteResponse {
  success: boolean
}

export interface ProjectDetailResponse {
  data: Project
}

export interface Member {
  userId: string
  name: string | null
  email: string
  createdAt: string
}

export interface MembersResponse {
  data: Member[]
}

export interface CreateProjectInput {
  name: string
  key: string
  description?: string
}

export interface ParseCurlResponse {
  data: {
    url: string
    method: string
    headers: Record<string, string> | null
    body: unknown | null
  }
}

export interface CreateIssuePayload {
  issueType: string
  title: string
  description?: string
  rawCurl?: string
  method?: string
  url?: string
  environment?: string
  requestHeaders?: Record<string, string> | null
  requestBody?: unknown | null
  status?: string
}
