import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { issuesCommand } from '../commands/issues.js'
import {
  issuesResponseMultiPage,
  issuesResponseEmpty,
  issuesResponseSinglePage
} from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'

function createMockClient(response: unknown): CurlTicketClient {
  return {
    getIssues: vi.fn().mockResolvedValue(response)
  } as unknown as CurlTicketClient
}

describe('issuesCommand', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints pagination hint on stderr when multi-page', async () => {
    const client = createMockClient(issuesResponseMultiPage)
    await issuesCommand(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', {}, false)

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(stderrSpy).toHaveBeenCalledWith('Showing 1-10 of 42 (page 1/5)\n')
  })

  it('does not print pagination hint when single page', async () => {
    const client = createMockClient(issuesResponseSinglePage)
    await issuesCommand(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', {}, false)

    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('prints "No issues found." for empty result without pagination hint', async () => {
    const client = createMockClient(issuesResponseEmpty)
    await issuesCommand(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', {}, false)

    expect(consoleSpy).toHaveBeenCalledWith('No issues found.')
    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('outputs raw JSON without pagination hint in json mode', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const client = createMockClient(issuesResponseMultiPage)
    await issuesCommand(client, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', {}, true)

    expect(stdoutSpy).toHaveBeenCalledOnce()
    expect(stderrSpy).not.toHaveBeenCalled()
  })
})
