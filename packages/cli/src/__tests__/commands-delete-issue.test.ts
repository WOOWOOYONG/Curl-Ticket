import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirm } from '../utils.js'
import { deleteIssueCommand } from '../commands/delete-issue.js'
import { deleteSuccessResponse } from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'

vi.mock('../utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils.js')>()
  return {
    ...actual,
    confirm: vi.fn()
  }
})

const mockConfirm = vi.mocked(confirm)

function createMockClient(response: unknown): CurlTicketClient {
  return {
    deleteIssue: vi.fn().mockResolvedValue(response)
  } as unknown as CurlTicketClient
}

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const ISSUE_ID = '1'

describe('deleteIssueCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConfirm.mockReset()
  })

  it('prompts for confirmation and deletes when accepted', async () => {
    mockConfirm.mockResolvedValue(true)
    const client = createMockClient(deleteSuccessResponse)
    await deleteIssueCommand(client, PROJECT_ID, ISSUE_ID, false, false)

    expect(mockConfirm).toHaveBeenCalledWith('Delete issue 1?')
    expect(client.deleteIssue).toHaveBeenCalledWith(PROJECT_ID, ISSUE_ID)
    expect(consoleSpy).toHaveBeenCalledWith('Issue 1 deleted.')
  })

  it('cancels when confirmation is rejected', async () => {
    mockConfirm.mockResolvedValue(false)
    const client = createMockClient(deleteSuccessResponse)
    await deleteIssueCommand(client, PROJECT_ID, ISSUE_ID, false, false)

    expect(client.deleteIssue).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('Cancelled.')
  })

  it('skips confirmation with --force', async () => {
    const client = createMockClient(deleteSuccessResponse)
    await deleteIssueCommand(client, PROJECT_ID, ISSUE_ID, false, true)

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(client.deleteIssue).toHaveBeenCalledWith(PROJECT_ID, ISSUE_ID)
    expect(consoleSpy).toHaveBeenCalledWith('Issue 1 deleted.')
  })

  it('skips confirmation in json mode and outputs JSON', async () => {
    const client = createMockClient(deleteSuccessResponse)
    await deleteIssueCommand(client, PROJECT_ID, ISSUE_ID, true, false)

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(stdoutSpy).toHaveBeenCalledOnce()
    const output = stdoutSpy.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual(deleteSuccessResponse)
  })
})
