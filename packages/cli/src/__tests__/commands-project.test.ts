import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest'
import { projectCommand } from '../commands/project.js'
import { projectDetailResponse } from './fixtures.js'
import type { CurlTicketClient } from '../api-client.js'

function createMockClient(response: unknown): CurlTicketClient {
  return {
    getProject: vi.fn().mockResolvedValue(response)
  } as unknown as CurlTicketClient
}

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

describe('projectCommand', () => {
  let stdoutSpy: MockInstance<typeof process.stdout.write>
  let consoleSpy: MockInstance<typeof console.log>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('displays project details in human mode', async () => {
    const client = createMockClient(projectDetailResponse)
    await projectCommand(client, PROJECT_ID, false)

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n')
    expect(output).toContain('Name: Backend API')
    expect(output).toContain('Key: BA')
    expect(output).toContain('Total Issues: 25')
    expect(output).toContain('Open Issues: 8')
  })

  it('outputs raw JSON in json mode', async () => {
    const client = createMockClient(projectDetailResponse)
    await projectCommand(client, PROJECT_ID, true)

    expect(stdoutSpy).toHaveBeenCalledOnce()
    const output = stdoutSpy.mock.calls[0][0] as string
    expect(JSON.parse(output)).toEqual(projectDetailResponse)
  })
})
