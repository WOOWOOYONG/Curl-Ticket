import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createIssueCommand } from '../commands/create-issue.js'
import { parseCurlResponse, createApiBugResponse, createTaskResponse } from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'

const mockSelect = vi.fn()
const mockInput = vi.fn()
const mockConfirm = vi.fn()
const mockEditor = vi.fn()

vi.mock('../utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils.js')>()
  class MockPrompter {
    select = mockSelect
    input = mockInput
    confirm = mockConfirm
    editor = mockEditor
    close = vi.fn()
  }
  return {
    ...actual,
    Prompter: MockPrompter
  }
})

// Make process.stdin.isTTY truthy so Prompter is created
vi.stubGlobal('process', {
  ...process,
  stdin: { ...process.stdin, isTTY: true }
})

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function createMockClient(overrides: Partial<CurlTicketClient> = {}): CurlTicketClient {
  return {
    parseCurl: vi.fn().mockResolvedValue(parseCurlResponse),
    createIssue: vi.fn().mockResolvedValue(createApiBugResponse),
    ...overrides
  } as unknown as CurlTicketClient
}

describe('createIssueCommand (interactive)', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockSelect.mockReset()
    mockInput.mockReset()
    mockConfirm.mockReset()
    mockEditor.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ------------------------------------------------------------------
  // Interactive type selection
  // ------------------------------------------------------------------
  describe('type selection', () => {
    it('selects API Bug via interactive prompt and creates api_bug issue', async () => {
      mockSelect.mockResolvedValueOnce('API Bug')
      mockEditor.mockResolvedValueOnce('curl https://api.example.com/users/123')

      const client = createMockClient()
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(mockSelect).toHaveBeenCalledWith('Select issue type', ['API Bug', 'Task'])
      expect(client.parseCurl).toHaveBeenCalled()
      expect(client.createIssue).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ issueType: 'api_bug' })
      )
    })

    it('selects Task via interactive prompt and creates task issue', async () => {
      mockSelect.mockResolvedValueOnce('Task')
      mockInput.mockResolvedValueOnce('My task title')
      mockConfirm
        .mockResolvedValueOnce(false) // Add description? → No
        .mockResolvedValueOnce(true) // Create this issue? → Yes

      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(mockSelect).toHaveBeenCalledWith('Select issue type', ['API Bug', 'Task'])
      expect(client.createIssue).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ issueType: 'task', title: 'My task title' })
      )
    })
  })

  // ------------------------------------------------------------------
  // Task interactive flow
  // ------------------------------------------------------------------
  describe('task flow — interactive', () => {
    it('creates task with title only when description is skipped', async () => {
      mockSelect.mockResolvedValueOnce('Task')
      mockInput.mockResolvedValueOnce('Quick task')
      mockConfirm
        .mockResolvedValueOnce(false) // Add description? → No
        .mockResolvedValueOnce(true) // Create this issue? → Yes

      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(client.createIssue).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({ issueType: 'task', title: 'Quick task' })
      )
      expect(mockEditor).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Issue created:'))
    })

    it('creates task with title and Markdown description via editor', async () => {
      mockSelect.mockResolvedValueOnce('Task')
      mockInput.mockResolvedValueOnce('Rate limiting')
      mockConfirm
        .mockResolvedValueOnce(true) // Add description? → Yes
        .mockResolvedValueOnce(true) // Create this issue? → Yes
      mockEditor.mockResolvedValueOnce('## Why\nToo many requests\n\n## Goal\n100 req/s')

      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(mockEditor).toHaveBeenCalledWith('Description (Markdown supported)')
      expect(client.createIssue).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({
          issueType: 'task',
          title: 'Rate limiting',
          description: '## Why\nToo many requests\n\n## Goal\n100 req/s'
        })
      )
    })

    it('cancels when user rejects confirmation', async () => {
      mockSelect.mockResolvedValueOnce('Task')
      mockInput.mockResolvedValueOnce('Will cancel')
      mockConfirm
        .mockResolvedValueOnce(false) // Add description? → No
        .mockResolvedValueOnce(false) // Create this issue? → No

      const client = createMockClient()
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(client.createIssue).not.toHaveBeenCalled()
      expect(stderrSpy).toHaveBeenCalledWith('Cancelled.\n')
    })

    it('shows preview before confirmation', async () => {
      mockSelect.mockResolvedValueOnce('Task')
      mockInput.mockResolvedValueOnce('My title')
      mockConfirm
        .mockResolvedValueOnce(true) // Add description? → Yes
        .mockResolvedValueOnce(true) // Create this issue? → Yes
      mockEditor.mockResolvedValueOnce('## Details\nSome markdown')

      const client = createMockClient({
        createIssue: vi.fn().mockResolvedValue(createTaskResponse)
      })
      await createIssueCommand(client, PROJECT_ID, {}, false)

      const output = stderrSpy.mock.calls.map((c: [string]) => c[0]).join('')
      expect(output).toContain('--- Preview ---')
      expect(output).toContain('Title: My title')
      expect(output).toContain('## Details\nSome markdown')
      expect(output).toContain('--- End Preview ---')
    })
  })

  // ------------------------------------------------------------------
  // API Bug interactive flow
  // ------------------------------------------------------------------
  describe('api_bug flow — interactive', () => {
    it('opens editor for cURL when --curl is not provided', async () => {
      mockSelect.mockResolvedValueOnce('API Bug')
      mockEditor.mockResolvedValueOnce('curl https://api.example.com/users/123')
      mockConfirm.mockResolvedValueOnce(false) // Add description? → No

      const client = createMockClient()
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(mockEditor).toHaveBeenCalledWith('Paste cURL command')
      expect(client.parseCurl).toHaveBeenCalledWith('curl https://api.example.com/users/123')
    })

    it('creates api_bug with Markdown description via editor', async () => {
      mockSelect.mockResolvedValueOnce('API Bug')
      mockEditor
        .mockResolvedValueOnce('curl https://api.example.com/users/123')
        .mockResolvedValueOnce('## Steps\n1. Call endpoint\n2. Get 500')
      mockConfirm.mockResolvedValueOnce(true) // Add description? → Yes

      const client = createMockClient()
      await createIssueCommand(client, PROJECT_ID, {}, false)

      expect(mockEditor).toHaveBeenCalledWith('Description (Markdown supported)')
      expect(client.createIssue).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({
          issueType: 'api_bug',
          description: '## Steps\n1. Call endpoint\n2. Get 500'
        })
      )
    })

    it('skips description when user declines', async () => {
      mockSelect.mockResolvedValueOnce('API Bug')
      mockEditor.mockResolvedValueOnce('curl https://api.example.com/users/123')
      mockConfirm.mockResolvedValueOnce(false) // Add description? → No

      const client = createMockClient()
      await createIssueCommand(client, PROJECT_ID, {}, false)

      const payload = vi.mocked(client.createIssue).mock.calls[0][1]
      expect(payload).not.toHaveProperty('description')
    })

    it('throws ValidationError when editor returns empty cURL', async () => {
      mockSelect.mockResolvedValueOnce('API Bug')
      mockEditor.mockResolvedValueOnce('')

      const client = createMockClient()
      await expect(createIssueCommand(client, PROJECT_ID, {}, false)).rejects.toThrow(
        'cURL command cannot be empty.'
      )
    })
  })
})
