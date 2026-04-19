import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { myIssuesCommand } from '../commands/my-issues.js'
import type { CurlTicketClient } from '../api-client.js'
import type { MyIssuesResponse } from '../types.js'
import { ValidationError } from '../utils.js'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

const summaryWithIssues = { open: 2, inProgress: 1, done: 0, close: 0, total: 3 }
const summaryEmpty = { open: 0, inProgress: 0, done: 0, close: 0, total: 0 }
const pagination = { page: 1, pageSize: 20, total: 3, totalPages: 1 }

const issueItem = {
  id: 1,
  issueNumber: 5,
  title: 'Login fails',
  status: 'Open',
  environment: 'Prod',
  assigneeId: 'user-001',
  updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  project: { id: PROJECT_ID, key: 'BA', name: 'Backend API' }
}

const fullResponse: MyIssuesResponse = {
  data: [issueItem],
  pagination,
  summary: summaryWithIssues
}

const emptyResponse: MyIssuesResponse = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  summary: summaryEmpty
}

const filteredEmptyResponse: MyIssuesResponse = {
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  summary: summaryWithIssues
}

function mockClient(response: MyIssuesResponse): CurlTicketClient {
  return {
    getMyIssues: vi.fn().mockResolvedValue(response)
  } as unknown as CurlTicketClient
}

describe('myIssuesCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints summary header and issue rows in human-readable mode', async () => {
    const client = mockClient(fullResponse)
    await myIssuesCommand(client, {}, false)
    expect(consoleSpy).toHaveBeenCalledWith('Open 2 · In Progress 1 · Done 0 · Close 0 · Total 3')
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('BA#5'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Login fails'))
  })

  it('prints "No issues assigned to you." when summary total is 0', async () => {
    const client = mockClient(emptyResponse)
    await myIssuesCommand(client, {}, false)
    expect(consoleSpy).toHaveBeenCalledWith('No issues assigned to you.')
  })

  it('prints "No issues match the current filters." when data is empty but summary has issues', async () => {
    const client = mockClient(filteredEmptyResponse)
    await myIssuesCommand(client, { status: ['Open'] }, false)
    expect(consoleSpy).toHaveBeenCalledWith('Open 2 · In Progress 1 · Done 0 · Close 0 · Total 3')
    expect(consoleSpy).toHaveBeenCalledWith('No issues match the current filters.')
  })

  it('outputs raw JSON in json mode', async () => {
    const client = mockClient(fullResponse)
    await myIssuesCommand(client, {}, true)
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"summary"'))
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('forwards repeatable --status values to the API', async () => {
    const client = mockClient(fullResponse)
    await myIssuesCommand(client, { status: ['Open', 'Done'] }, false)
    expect(client.getMyIssues).toHaveBeenCalledWith(
      expect.objectContaining({ status: ['Open', 'Done'] })
    )
  })

  it('throws ValidationError for invalid --project UUID', async () => {
    const client = mockClient(fullResponse)
    await expect(myIssuesCommand(client, { project: 'not-a-uuid' }, false)).rejects.toThrow(
      ValidationError
    )
  })

  it('passes projectId to API after validation', async () => {
    const client = mockClient(fullResponse)
    await myIssuesCommand(client, { project: PROJECT_ID }, false)
    expect(client.getMyIssues).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: PROJECT_ID })
    )
  })

  it('throws ValidationError for invalid --sort value', async () => {
    const client = mockClient(fullResponse)
    await expect(myIssuesCommand(client, { sort: 'priority' }, false)).rejects.toThrow(
      ValidationError
    )
  })

  it('throws ValidationError for invalid --order value', async () => {
    const client = mockClient(fullResponse)
    await expect(myIssuesCommand(client, { order: 'up' }, false)).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for non-numeric --page', async () => {
    const client = mockClient(fullResponse)
    await expect(myIssuesCommand(client, { page: 'abc' }, false)).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when --page-size exceeds API max', async () => {
    const client = mockClient(fullResponse)
    await expect(myIssuesCommand(client, { pageSize: '51' }, false)).rejects.toThrow(
      ValidationError
    )
  })
})
