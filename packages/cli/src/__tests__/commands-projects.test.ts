import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { projectsCommand } from '../commands/projects.js'
import { projectsResponseMultiPage, projectsResponseSinglePage } from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'

function createMockClient(response: unknown): CurlTicketClient {
  return {
    getProjects: vi.fn().mockResolvedValue(response)
  } as unknown as CurlTicketClient
}

describe('projectsCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints pagination hint on stderr in human mode when multi-page', async () => {
    const client = createMockClient(projectsResponseMultiPage)
    await projectsCommand(client, false)

    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(stderrSpy).toHaveBeenCalledWith('Showing 1-10 of 42 (page 1/5)\n')
  })

  it('does not print pagination hint when single page', async () => {
    const client = createMockClient(projectsResponseSinglePage)
    await projectsCommand(client, false)

    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('outputs raw JSON and no pagination hint in json mode', async () => {
    const client = createMockClient(projectsResponseMultiPage)
    await projectsCommand(client, true)

    expect(stdoutSpy).toHaveBeenCalledOnce()
    const output = stdoutSpy.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual(projectsResponseMultiPage)
    expect(stderrSpy).not.toHaveBeenCalled()
  })
})
