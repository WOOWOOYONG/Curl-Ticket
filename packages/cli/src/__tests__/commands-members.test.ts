import { describe, it, expect, vi, beforeEach } from 'vitest'
import { membersCommand } from '../commands/members.js'
import { membersResponse, membersResponseEmpty } from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'

function createMockClient(response: unknown): CurlTicketClient {
  return {
    getMembers: vi.fn().mockResolvedValue(response)
  } as unknown as CurlTicketClient
}

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('membersCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('displays members with name in human mode', async () => {
    const client = createMockClient(membersResponse)
    await membersCommand(client, PROJECT_ID, false)

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    const firstCall = consoleSpy.mock.calls[0][0] as string
    expect(firstCall).toContain('Alice Chen')
  })

  it('falls back to email when name is null', async () => {
    const client = createMockClient(membersResponse)
    await membersCommand(client, PROJECT_ID, false)

    const secondCall = consoleSpy.mock.calls[1][0] as string
    expect(secondCall).toContain('bob@example.com')
  })

  it('prints "No members found." for empty list', async () => {
    const client = createMockClient(membersResponseEmpty)
    await membersCommand(client, PROJECT_ID, false)

    expect(consoleSpy).toHaveBeenCalledWith('No members found.')
  })

  it('outputs raw JSON in json mode', async () => {
    const client = createMockClient(membersResponse)
    await membersCommand(client, PROJECT_ID, true)

    expect(stdoutSpy).toHaveBeenCalledOnce()
    const output = stdoutSpy.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual(membersResponse)
  })
})
