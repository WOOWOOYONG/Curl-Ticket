import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { assignCommand } from '../commands/assign.js'
import type { CurlTicketClient } from '../api-client.js'
import { issueDetailApiBug, createApiBugResponse, membersResponse } from './fixtures.js'
import { ValidationError } from '../utils.js'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const ISSUE_ID = '10'
const ME_UUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function mockClient(overrides: Partial<CurlTicketClient> = {}): CurlTicketClient {
  return {
    getIssue: vi.fn().mockResolvedValue(createApiBugResponse),
    getIssueByNumber: vi.fn().mockResolvedValue(createApiBugResponse),
    getAuthMe: vi.fn().mockResolvedValue({ id: ME_UUID, email: 'me@example.com', name: 'Me' }),
    getMembers: vi.fn().mockResolvedValue(membersResponse),
    updateIssueAssignee: vi.fn().mockResolvedValue({
      data: { ...issueDetailApiBug, assigneeId: ME_UUID, assignee: { id: ME_UUID, name: 'Me', email: 'me@example.com' } },
      friendlyId: 'BA-5'
    }),
    ...overrides
  } as unknown as CurlTicketClient
}

describe('assignCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let stdoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('assigns by UUID without looking up members', async () => {
    const client = mockClient()
    await assignCommand(client, PROJECT_ID, ISSUE_ID, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', {})
    expect(client.updateIssueAssignee).toHaveBeenCalledWith(
      PROJECT_ID,
      ISSUE_ID,
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    )
    expect(client.getMembers).not.toHaveBeenCalled()
  })

  it('resolves "me" via getAuthMe and assigns', async () => {
    const client = mockClient()
    await assignCommand(client, PROJECT_ID, ISSUE_ID, 'me', {})
    expect(client.getAuthMe).toHaveBeenCalledOnce()
    expect(client.updateIssueAssignee).toHaveBeenCalledWith(PROJECT_ID, ISSUE_ID, ME_UUID)
  })

  it('resolves email to userId via members and assigns', async () => {
    const client = mockClient()
    await assignCommand(client, PROJECT_ID, ISSUE_ID, 'alice@example.com', {})
    expect(client.getMembers).toHaveBeenCalledWith(PROJECT_ID)
    expect(client.updateIssueAssignee).toHaveBeenCalledWith(PROJECT_ID, ISSUE_ID, 'user-001')
  })

  it('throws ValidationError when email is not found in members', async () => {
    const client = mockClient()
    await expect(
      assignCommand(client, PROJECT_ID, ISSUE_ID, 'missing@example.com', {})
    ).rejects.toThrow(ValidationError)
  })

  it('assigns null for "none"', async () => {
    const assignRes = {
      data: { ...issueDetailApiBug, assigneeId: null, assignee: null },
      friendlyId: 'BA-5'
    }
    const client = mockClient({
      updateIssueAssignee: vi.fn().mockResolvedValue(assignRes)
    })
    await assignCommand(client, PROJECT_ID, ISSUE_ID, 'none', {})
    expect(client.updateIssueAssignee).toHaveBeenCalledWith(PROJECT_ID, ISSUE_ID, null)
  })

  it('dry-run prints preview without calling PATCH', async () => {
    const client = mockClient()
    await assignCommand(client, PROJECT_ID, ISSUE_ID, ME_UUID, { dryRun: true })
    expect(client.updateIssueAssignee).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'))
  })

  it('dry-run in JSON mode outputs preview object', async () => {
    const client = mockClient()
    await assignCommand(client, PROJECT_ID, ISSUE_ID, ME_UUID, { json: true, dryRun: true })
    expect(client.updateIssueAssignee).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"dryRun": true'))
  })

  it('outputs JSON in json mode after successful assign', async () => {
    const client = mockClient()
    await assignCommand(client, PROJECT_ID, ISSUE_ID, 'me', { json: true })
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('"friendlyId"'))
  })
})
