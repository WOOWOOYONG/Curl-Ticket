import type {
  AuthConfig,
  AuthMeResponse,
  ProjectsResponse,
  ProjectDetailResponse,
  IssuesResponse,
  IssueResponse,
  CommentsResponse,
  CommentResponse,
  DeleteResponse,
  MembersResponse,
  CreateProjectInput,
  ParseCurlResponse,
  CreateIssuePayload,
  MyIssuesOptions,
  MyIssuesResponse
} from './types.js'
import {
  DEFAULT_PAGE_SIZE,
  PROJECTS_PAGE_SIZE,
  REQUEST_TIMEOUT,
  RETRY_AFTER_DEFAULT_SEC,
  RETRY_AFTER_MAX_SEC,
  HTTP_TOO_MANY_REQUESTS
} from './constants.js'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(
    public url: string,
    cause?: Error
  ) {
    super(`Unable to connect to ${url}. Please check the URL and network status.`)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms.`)
    this.name = 'TimeoutError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface IssuesOptions {
  status?: string
  issueType?: string
  limit?: number
  assigneeId?: string | null
}

export class CurlTicketClient {
  constructor(private config: AuthConfig) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.url}${path}`
    const method = options?.method ?? 'GET'
    const isGet = method === 'GET'

    const doFetch = async (): Promise<Response> => {
      try {
        return await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
            ...options?.headers
          }
        })
      } catch (err) {
        if (
          err instanceof DOMException &&
          (err.name === 'TimeoutError' || err.name === 'AbortError')
        ) {
          throw new TimeoutError(REQUEST_TIMEOUT)
        }
        throw new NetworkError(this.config.url, err instanceof Error ? err : undefined)
      }
    }

    let res: Response
    try {
      res = await doFetch()
    } catch (err) {
      // Retry once on NetworkError for GET requests only
      if (err instanceof NetworkError && isGet) {
        res = await doFetch()
      } else {
        throw err
      }
    }

    // Handle rate limiting — retry once for all methods
    if (res.status === HTTP_TOO_MANY_REQUESTS) {
      const retryAfter = res.headers.get('Retry-After')
      let waitSeconds = RETRY_AFTER_DEFAULT_SEC
      if (retryAfter) {
        const parsed = Number(retryAfter)
        if (!Number.isNaN(parsed)) {
          waitSeconds = parsed
        }
      }
      if (waitSeconds > RETRY_AFTER_MAX_SEC) {
        throw new RateLimitError(
          `Rate limited. Retry-After exceeds maximum wait time (${RETRY_AFTER_MAX_SEC}s).`
        )
      }
      await sleep(waitSeconds * 1000)
      res = await doFetch()
      if (res.status === HTTP_TOO_MANY_REQUESTS) {
        throw new RateLimitError('Rate limited. Retry failed.')
      }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ApiError(res.status, body)
    }

    return res.json() as Promise<T>
  }

  async getProjects(): Promise<ProjectsResponse> {
    return this.request<ProjectsResponse>(`/api/projects?pageSize=${PROJECTS_PAGE_SIZE}`)
  }

  async getAuthMe(): Promise<AuthMeResponse> {
    return this.request<AuthMeResponse>('/api/auth/me')
  }

  async getMyIssues(options?: MyIssuesOptions): Promise<MyIssuesResponse> {
    const params = new URLSearchParams()
    if (options?.status?.length) {
      for (const s of options.status) params.append('status', s)
    }
    if (options?.projectId) params.set('projectId', options.projectId)
    if (options?.environment) params.set('environment', options.environment)
    if (options?.search) params.set('search', options.search)
    if (options?.sort) params.set('sort', options.sort)
    if (options?.order) params.set('order', options.order)
    if (options?.page != null) params.set('page', String(options.page))
    if (options?.pageSize != null) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.request<MyIssuesResponse>(`/api/me/issues${qs ? `?${qs}` : ''}`)
  }

  async updateIssueAssignee(
    projectId: string,
    issueId: string,
    assigneeId: string | null
  ): Promise<IssueResponse> {
    return this.request<IssueResponse>(`/api/projects/${projectId}/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ assigneeId })
    })
  }

  async getIssues(projectId: string, options?: IssuesOptions): Promise<IssuesResponse> {
    const params = new URLSearchParams()
    params.set('pageSize', String(options?.limit ?? DEFAULT_PAGE_SIZE))
    if (options?.status) params.set('status', options.status)
    if (options?.issueType) params.set('issueType', options.issueType)
    if (options?.assigneeId !== undefined) {
      params.set('assigneeId', options.assigneeId === null ? 'null' : options.assigneeId)
    }
    return this.request<IssuesResponse>(`/api/projects/${projectId}/issues?${params}`)
  }

  async getIssue(projectId: string, issueId: string): Promise<IssueResponse> {
    return this.request<IssueResponse>(`/api/projects/${projectId}/issues/${issueId}`)
  }

  async getIssueByNumber(projectId: string, issueNumber: number): Promise<IssueResponse> {
    const list = await this.request<IssuesResponse>(
      `/api/projects/${projectId}/issues?issueNumber=${issueNumber}&pageSize=1`
    )
    if (list.data.length === 0) {
      throw new ApiError(404, 'Issue not found.')
    }
    // Get full detail
    return this.getIssue(projectId, String(list.data[0].id))
  }

  async updateIssueStatus(
    projectId: string,
    issueId: string,
    status: string
  ): Promise<IssueResponse> {
    return this.request<IssueResponse>(`/api/projects/${projectId}/issues/${issueId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  }

  async getComments(projectId: string, issueId: string): Promise<CommentsResponse> {
    return this.request<CommentsResponse>(`/api/projects/${projectId}/issues/${issueId}/comments`)
  }

  async getComment(
    projectId: string,
    issueId: string,
    commentId: string
  ): Promise<CommentResponse> {
    const res = await this.getComments(projectId, issueId)
    const comment = res.data.find((c) => c.id === Number(commentId))
    if (!comment) {
      throw new ApiError(404, 'Comment not found.')
    }
    return { data: comment }
  }

  async createComment(
    projectId: string,
    issueId: string,
    content: string
  ): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/api/projects/${projectId}/issues/${issueId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
  }

  async updateComment(
    projectId: string,
    issueId: string,
    commentId: string,
    content: string
  ): Promise<CommentResponse> {
    return this.request<CommentResponse>(
      `/api/projects/${projectId}/issues/${issueId}/comments/${commentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ content })
      }
    )
  }

  async getProject(projectId: string): Promise<ProjectDetailResponse> {
    return this.request<ProjectDetailResponse>(`/api/projects/${projectId}`)
  }

  async createProject(data: CreateProjectInput): Promise<ProjectDetailResponse> {
    return this.request<ProjectDetailResponse>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getMembers(projectId: string): Promise<MembersResponse> {
    return this.request<MembersResponse>(`/api/projects/${projectId}/members`)
  }

  async deleteIssue(projectId: string, issueId: string): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/api/projects/${projectId}/issues/${issueId}`, {
      method: 'DELETE'
    })
  }

  async deleteComment(
    projectId: string,
    issueId: string,
    commentId: string
  ): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(
      `/api/projects/${projectId}/issues/${issueId}/comments/${commentId}`,
      {
        method: 'DELETE'
      }
    )
  }

  async parseCurl(curl: string): Promise<ParseCurlResponse> {
    return this.request<ParseCurlResponse>('/api/curl/parse', {
      method: 'POST',
      body: JSON.stringify({ curl })
    })
  }

  async createIssue(projectId: string, data: CreateIssuePayload): Promise<IssueResponse> {
    return this.request<IssueResponse>(`/api/projects/${projectId}/issues`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}
