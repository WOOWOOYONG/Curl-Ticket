import type {
  AuthConfig,
  ProjectsResponse,
  IssuesResponse,
  IssueResponse,
  CommentsResponse,
  CommentResponse,
  DeleteResponse
} from './types.js'
import { DEFAULT_PAGE_SIZE, PROJECTS_PAGE_SIZE } from './constants.js'

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

interface IssuesOptions {
  status?: string
  issueType?: string
  limit?: number
}

export class CurlTicketClient {
  constructor(private config: AuthConfig) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.url}${path}`
    let res: Response
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })
    } catch (err) {
      throw new NetworkError(this.config.url, err instanceof Error ? err : undefined)
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

  async getIssues(projectId: string, options?: IssuesOptions): Promise<IssuesResponse> {
    const params = new URLSearchParams()
    params.set('pageSize', String(options?.limit ?? DEFAULT_PAGE_SIZE))
    if (options?.status) params.set('status', options.status)
    if (options?.issueType) params.set('issueType', options.issueType)
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
}
