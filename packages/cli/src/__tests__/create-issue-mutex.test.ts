import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createIssueCommand } from '../commands/create-issue.js'
import { ValidationError } from '../utils.js'
import type { CurlTicketClient } from '../api-client.js'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

function noopClient(): CurlTicketClient {
  return {
    parseCurl: vi.fn(),
    createIssue: vi.fn(),
    getProjects: vi.fn(),
    getMembers: vi.fn(),
    getAuthMe: vi.fn()
  } as unknown as CurlTicketClient
}

describe('createIssueCommand — mutex flags', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects --interactive with --type api_bug', async () => {
    await expect(
      createIssueCommand(noopClient(), PROJECT_ID, { type: 'api_bug', interactive: true }, false)
    ).rejects.toThrow(ValidationError)
  })

  it('rejects --interactive with --json', async () => {
    await expect(
      createIssueCommand(noopClient(), PROJECT_ID, { type: 'task', interactive: true }, true)
    ).rejects.toThrow(/mutually exclusive/)
  })

  it('rejects --from-template with --description', async () => {
    await expect(
      createIssueCommand(
        noopClient(),
        PROJECT_ID,
        { type: 'task', fromTemplate: 'task', description: 'hello' },
        false
      )
    ).rejects.toThrow(/mutually exclusive/)
  })

  it('--from-template without --interactive prints rendered template and exits', async () => {
    await createIssueCommand(
      noopClient(),
      PROJECT_ID,
      { type: 'task', fromTemplate: 'task' },
      false
    )

    const out = stdoutSpy.mock.calls.map((c: [string]) => c[0]).join('')
    expect(out).toContain('## Why')
    expect(out).toContain('_(not provided)_')
    expect(out).not.toContain('## Acceptance Criteria')
    expect(out).not.toContain('## Notes')
    expect(out).not.toContain('{{')
  })

  it('rejects unknown template name', async () => {
    await expect(
      createIssueCommand(
        noopClient(),
        PROJECT_ID,
        { type: 'task', fromTemplate: 'definitely-not-a-template' },
        false
      )
    ).rejects.toThrow(/Unknown template/)
  })
})
