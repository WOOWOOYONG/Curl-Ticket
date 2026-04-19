import { describe, it, expect, vi } from 'vitest'
import { resolveAssignee, ValidationError } from '../utils.js'
import type { CurlTicketClient } from '../api-client.js'

const PROJECT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const ME_UUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function mockClient(overrides: Partial<CurlTicketClient> = {}): CurlTicketClient {
  return {
    getAuthMe: vi.fn().mockResolvedValue({ id: ME_UUID, email: 'me@example.com', name: 'Me' }),
    getMembers: vi.fn().mockResolvedValue({
      data: [
        { userId: 'user-001', name: 'Alice Chen', email: 'alice@example.com', createdAt: '' },
        { userId: 'user-002', name: null, email: 'bob@example.com', createdAt: '' }
      ]
    }),
    ...overrides
  } as unknown as CurlTicketClient
}

describe('resolveAssignee', () => {
  it('returns null for empty string', async () => {
    const client = mockClient()
    const result = await resolveAssignee({ value: '', projectId: PROJECT_ID, client })
    expect(result).toBeNull()
  })

  it('returns null for "none"', async () => {
    const client = mockClient()
    const result = await resolveAssignee({ value: 'none', projectId: PROJECT_ID, client })
    expect(result).toBeNull()
  })

  it('returns null for "null"', async () => {
    const client = mockClient()
    const result = await resolveAssignee({ value: 'null', projectId: PROJECT_ID, client })
    expect(result).toBeNull()
  })

  it('resolves "me" via getAuthMe and caches the result', async () => {
    const client = mockClient()
    const result = await resolveAssignee({ value: 'me', projectId: PROJECT_ID, client })
    expect(result).toBe(ME_UUID)
    expect(client.getAuthMe).toHaveBeenCalledTimes(1)

    // Second call should use cache
    const result2 = await resolveAssignee({ value: 'me', projectId: PROJECT_ID, client })
    expect(result2).toBe(ME_UUID)
    expect(client.getAuthMe).toHaveBeenCalledTimes(1)
  })

  it('throws ValidationError when getAuthMe returns null', async () => {
    const client = mockClient({
      getAuthMe: vi.fn().mockResolvedValue(null)
    })
    await expect(resolveAssignee({ value: 'me', projectId: PROJECT_ID, client })).rejects.toThrow(
      ValidationError
    )
  })

  it('passes through a UUID directly', async () => {
    const client = mockClient()
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const result = await resolveAssignee({ value: uuid, projectId: PROJECT_ID, client })
    expect(result).toBe(uuid)
    expect(client.getAuthMe).not.toHaveBeenCalled()
    expect(client.getMembers).not.toHaveBeenCalled()
  })

  it('resolves an email by looking up project members', async () => {
    const client = mockClient()
    const result = await resolveAssignee({
      value: 'alice@example.com',
      projectId: PROJECT_ID,
      client
    })
    expect(result).toBe('user-001')
    expect(client.getMembers).toHaveBeenCalledWith(PROJECT_ID)
  })

  it('resolves email case-insensitively', async () => {
    const client = mockClient()
    const result = await resolveAssignee({
      value: 'ALICE@EXAMPLE.COM',
      projectId: PROJECT_ID,
      client
    })
    expect(result).toBe('user-001')
  })

  it('throws ValidationError when email is not found in members', async () => {
    const client = mockClient()
    await expect(
      resolveAssignee({ value: 'unknown@example.com', projectId: PROJECT_ID, client })
    ).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for unrecognized input', async () => {
    const client = mockClient()
    await expect(
      resolveAssignee({ value: 'not-an-email-or-uuid', projectId: PROJECT_ID, client })
    ).rejects.toThrow(ValidationError)
  })
})
