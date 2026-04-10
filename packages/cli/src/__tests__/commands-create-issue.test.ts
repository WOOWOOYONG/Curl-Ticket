import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createIssueCommand } from '../commands/create-issue.js'
import {
  parseCurlResponse,
  parseCurlPostResponse,
  createApiBugResponse,
  createTaskResponse
} from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'
import { ValidationError } from '../utils.js'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function createMockClient(
  overrides: Partial<CurlTicketClient> = {}
): CurlTicketClient {
  return {
    parseCurl: vi.fn().mockResolvedValue(parseCurlResponse),
    createIssue: vi.fn().mockResolvedValue(createApiBugResponse),
    ...overrides
  } as unknown as CurlTicketClient
}

describe('createIssueCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ------------------------------------------------------------------
  // api_bug flow
  // ------------------------------------------------------------------
  describe('api_bug flow', () => {
    it('creates an api_bug issue from cURL', async () => {
      const client = createMockClient()
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'api_bug', curl: 'curl https://api.example.com/users/123' },
        false
      )

      expect(client.parseCurl).toHaveBeenCalledWith(
        'curl https://api.example.com/users/123'
      )
      expect(client.createIssue).toHaveBeenCalledWith(PROJECT_ID, {
        issueType: 'api_bug',
        title: 'GET /users/123',
        rawCurl: 'curl https://api.example.com/users/123',
        method: 'GET',
        url: 'https://api.example.com/users/123',
        environment: 'Dev',
        requestHeaders: { Authorization: 'Bearer token123', Accept: 'application/json' },
        requestBody: null
      })
      expect(consoleSpy).toHaveBeenCalledWith('Issue created: BA-5 — GET /users/123')
    })

    it('uses custom title when --title is provided', async () => {
      const client = createMockClient()
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'api_bug', curl: 'curl https://api.example.com/users/123', title: 'Custom title' },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.title).toBe('Custom title')
    })

    it('auto-generates title from parsed method + URL path', async () => {
      const client = createMockClient({
        parseCurl: vi.fn().mockResolvedValue(parseCurlPostResponse),
        createIssue: vi.fn().mockResolvedValue(createApiBugResponse)
      })
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'api_bug', curl: 'curl -X POST https://api.example.com/users' },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.title).toBe('POST /users')
    })

    it('passes --env through normalizeEnvironment (case-insensitive)', async () => {
      const client = createMockClient()
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'api_bug', curl: 'curl https://example.com', env: 'staging' },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.environment).toBe('Staging')
    })

    it('passes description and status when provided', async () => {
      const client = createMockClient()
      await createIssueCommand(
        client,
        PROJECT_ID,
        {
          type: 'api_bug',
          curl: 'curl https://example.com',
          description: 'Some detail',
          status: 'in-progress'
        },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.description).toBe('Some detail')
      expect(call.status).toBe('In Progress')
    })

    it('throws ValidationError when --curl is missing for api_bug', async () => {
      const client = createMockClient()
      await expect(
        createIssueCommand(client, PROJECT_ID, { type: 'api_bug' }, false)
      ).rejects.toThrow(ValidationError)
    })

    it('outputs JSON when --json is set', async () => {
      const client = createMockClient()
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'api_bug', curl: 'curl https://example.com' },
        true
      )

      expect(stdoutSpy).toHaveBeenCalledOnce()
      const output = stdoutSpy.mock.calls[0][0] as string
      expect(JSON.parse(output)).toEqual(createApiBugResponse)
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------------
  // task flow
  // ------------------------------------------------------------------
  describe('task flow', () => {
    it('creates a task issue with --title', async () => {
      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'task', title: 'Implement rate limiting' },
        false
      )

      expect(client.parseCurl).not.toHaveBeenCalled()
      expect(client.createIssue).toHaveBeenCalledWith(PROJECT_ID, {
        issueType: 'task',
        title: 'Implement rate limiting'
      })
      expect(consoleSpy).toHaveBeenCalledWith(
        'Issue created: BA-6 — Implement rate limiting'
      )
    })

    it('includes description when provided', async () => {
      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'task', title: 'Task A', description: 'Details here' },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.description).toBe('Details here')
    })

    it('includes status when provided', async () => {
      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'task', title: 'Task A', status: 'Done' },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.status).toBe('Done')
    })

    it('throws ValidationError without --title in non-interactive mode', async () => {
      const client = createMockClient()
      // process.stdin.isTTY is undefined in test environment (non-interactive)
      await expect(
        createIssueCommand(client, PROJECT_ID, { type: 'task' }, false)
      ).rejects.toThrow(ValidationError)
    })

    it('outputs JSON when --json is set', async () => {
      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'task', title: 'Task A' },
        true
      )

      expect(stdoutSpy).toHaveBeenCalledOnce()
      const output = stdoutSpy.mock.calls[0][0] as string
      expect(JSON.parse(output)).toEqual(createTaskResponse)
    })
  })

  // ------------------------------------------------------------------
  // validation
  // ------------------------------------------------------------------
  describe('validation', () => {
    it('throws ValidationError for invalid projectId', async () => {
      const client = createMockClient()
      await expect(
        createIssueCommand(client, 'not-a-uuid', { type: 'api_bug', curl: 'curl x' }, false)
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid --type', async () => {
      const client = createMockClient()
      await expect(
        createIssueCommand(client, PROJECT_ID, { type: 'invalid' }, false)
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid --env', async () => {
      const client = createMockClient()
      await expect(
        createIssueCommand(
          client,
          PROJECT_ID,
          { type: 'api_bug', curl: 'curl x', env: 'invalid' },
          false
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid --status', async () => {
      const client = createMockClient()
      await expect(
        createIssueCommand(
          client,
          PROJECT_ID,
          { type: 'api_bug', curl: 'curl x', status: 'bogus' },
          false
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws when --type is missing in non-interactive mode', async () => {
      const client = createMockClient()
      await expect(
        createIssueCommand(client, PROJECT_ID, {}, false)
      ).rejects.toThrow(ValidationError)
    })

    it('normalizes type case-insensitively (API_BUG → api_bug)', async () => {
      const client = createMockClient()
      await createIssueCommand(
        client,
        PROJECT_ID,
        { type: 'API_BUG', curl: 'curl https://example.com' },
        false
      )

      const call = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(call.issueType).toBe('api_bug')
    })
  })
})
