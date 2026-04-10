import type {
  Project,
  IssueSummary,
  IssueDetail,
  Pagination,
  ProjectsResponse,
  IssuesResponse,
  IssueResponse,
  ProjectDetailResponse,
  MembersResponse,
  Member,
  DeleteResponse,
  ParseCurlResponse
} from '../types.js'

// --- Pagination fixtures ---

export const paginationMultiPage: Pagination = {
  page: 1,
  pageSize: 10,
  total: 42,
  totalPages: 5
}

export const paginationSinglePage: Pagination = {
  page: 1,
  pageSize: 10,
  total: 3,
  totalPages: 1
}

export const paginationEmpty: Pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0
}

export const paginationPage2: Pagination = {
  page: 2,
  pageSize: 10,
  total: 42,
  totalPages: 5
}

// --- Project fixtures ---

export const projectA: Project = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'Backend API',
  key: 'BA',
  description: 'Main backend service',
  ownerId: 'user-001',
  environments: ['Local', 'Dev', 'Staging', 'Prod'],
  createdAt: '2026-01-15T10:00:00.000Z',
  totalIssues: 25,
  openIssues: 8,
  lastUpdated: '2026-04-01T12:00:00.000Z'
}

export const projectB: Project = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: 'Frontend App',
  key: 'FA',
  description: null,
  ownerId: 'user-002',
  environments: ['Local', 'Dev'],
  createdAt: '2026-02-20T08:30:00.000Z',
  totalIssues: 10,
  openIssues: 3,
  lastUpdated: '2026-03-28T15:00:00.000Z'
}

// --- Issue fixtures ---

export const issueSummaryA: IssueSummary = {
  id: 1,
  issueNumber: 1,
  projectKey: 'BA',
  issueType: 'api_bug' as const,
  title: 'Login endpoint returns 500',
  method: 'POST',
  url: 'https://api.example.com/auth/login',
  environment: 'Prod',
  status: 'Open' as const,
  responseStatus: 500,
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-02T10:00:00.000Z'
}

export const issueSummaryB: IssueSummary = {
  id: 2,
  issueNumber: 2,
  projectKey: 'BA',
  issueType: 'task' as const,
  title: 'Add rate limiting to public endpoints',
  method: null,
  url: null,
  environment: null,
  status: 'In Progress' as const,
  responseStatus: null,
  createdAt: '2026-03-05T11:00:00.000Z',
  updatedAt: '2026-03-06T14:00:00.000Z'
}

// --- Member fixtures ---

export const memberAlice: Member = {
  userId: 'user-001',
  name: 'Alice Chen',
  email: 'alice@example.com',
  createdAt: '2026-01-15T10:00:00.000Z'
}

export const memberBob: Member = {
  userId: 'user-002',
  name: null,
  email: 'bob@example.com',
  createdAt: '2026-02-01T08:00:00.000Z'
}

// --- Response fixtures ---

export const projectsResponseMultiPage: ProjectsResponse = {
  data: [projectA, projectB],
  pagination: paginationMultiPage
}

export const projectsResponseSinglePage: ProjectsResponse = {
  data: [projectA],
  pagination: paginationSinglePage
}

export const issuesResponseMultiPage: IssuesResponse = {
  data: [issueSummaryA, issueSummaryB],
  pagination: paginationMultiPage
}

export const issuesResponseEmpty: IssuesResponse = {
  data: [],
  pagination: paginationEmpty
}

export const issuesResponseSinglePage: IssuesResponse = {
  data: [issueSummaryA],
  pagination: paginationSinglePage
}

export const projectDetailResponse: ProjectDetailResponse = {
  data: {
    ...projectA,
    totalIssues: 25,
    openIssues: 8
  }
}

export const membersResponse: MembersResponse = {
  data: [memberAlice, memberBob]
}

export const membersResponseEmpty: MembersResponse = {
  data: []
}

export const deleteSuccessResponse: DeleteResponse = {
  success: true
}

// --- ParseCurl fixtures ---

export const parseCurlResponse: ParseCurlResponse = {
  data: {
    url: 'https://api.example.com/users/123',
    method: 'GET',
    headers: { Authorization: 'Bearer token123', Accept: 'application/json' },
    body: null
  }
}

export const parseCurlPostResponse: ParseCurlResponse = {
  data: {
    url: 'https://api.example.com/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Alice' }
  }
}

// --- IssueDetail / IssueResponse fixtures ---

export const issueDetailApiBug: IssueDetail = {
  id: 10,
  issueNumber: 5,
  projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  projectKey: 'BA',
  issueType: 'api_bug' as const,
  title: 'GET /users/123',
  description: null,
  method: 'GET',
  url: 'https://api.example.com/users/123',
  environment: 'Dev',
  rawCurl: 'curl https://api.example.com/users/123',
  requestHeaders: { Accept: 'application/json' },
  requestBody: null,
  responseBody: null,
  responseStatus: null,
  status: 'Open' as const,
  createdBy: 'user-001',
  createdAt: '2026-04-10T09:00:00.000Z',
  updatedAt: '2026-04-10T09:00:00.000Z'
}

export const issueDetailTask: IssueDetail = {
  id: 11,
  issueNumber: 6,
  projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  projectKey: 'BA',
  issueType: 'task' as const,
  title: 'Implement rate limiting',
  description: '## Why\nPerformance\n\n## Goal\nLimit to 100 req/s',
  method: null,
  url: null,
  environment: null,
  rawCurl: null,
  requestHeaders: null,
  requestBody: null,
  responseBody: null,
  responseStatus: null,
  status: 'Open' as const,
  createdBy: 'user-001',
  createdAt: '2026-04-10T09:30:00.000Z',
  updatedAt: '2026-04-10T09:30:00.000Z'
}

export const createApiBugResponse: IssueResponse = {
  data: issueDetailApiBug,
  friendlyId: 'BA-5'
}

export const createTaskResponse: IssueResponse = {
  data: issueDetailTask,
  friendlyId: 'BA-6'
}
