import { describe, it, expect } from 'vitest'
import { generateInvitationToken } from './invitation-code'

describe('generateInvitationToken', () => {
  const validChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const confusingChars = ['0', 'O', '1', 'I', 'L']

  it('returns a string of length 6', () => {
    const token = generateInvitationToken()
    expect(token).toHaveLength(6)
  })

  it('only contains valid characters', () => {
    const token = generateInvitationToken()
    for (const char of token) {
      expect(validChars).toContain(char)
    }
  })

  it('does not contain confusing characters (0, O, 1, I, L)', () => {
    // Generate multiple tokens to increase confidence
    for (let i = 0; i < 20; i++) {
      const token = generateInvitationToken()
      for (const char of confusingChars) {
        expect(token).not.toContain(char)
      }
    }
  })

  it('produces different values across multiple calls', () => {
    const tokens = Array.from({ length: 10 }, () => generateInvitationToken())
    const unique = new Set(tokens)
    expect(unique.size).toBeGreaterThanOrEqual(2)
  })
})
