import { describe, it, expect } from 'vitest'
import { validateInvitationCodeSchema } from './invitation-code'

describe('validateInvitationCodeSchema', () => {
  it('accepts valid 6-character code', () => {
    const result = validateInvitationCodeSchema.safeParse({ code: 'ABC123' })
    expect(result.success).toBe(true)
  })

  it('rejects code shorter than 6 characters', () => {
    const result = validateInvitationCodeSchema.safeParse({ code: 'ABC' })
    expect(result.success).toBe(false)
  })

  it('rejects code longer than 6 characters', () => {
    const result = validateInvitationCodeSchema.safeParse({ code: 'ABCDEFG' })
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = validateInvitationCodeSchema.safeParse({ code: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing code field', () => {
    const result = validateInvitationCodeSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
