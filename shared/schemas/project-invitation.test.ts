import { describe, it, expect } from 'vitest'
import { createProjectInvitationSchema, respondProjectInvitationSchema } from './project-invitation'

describe('createProjectInvitationSchema', () => {
  it('accepts valid email', () => {
    const result = createProjectInvitationSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = createProjectInvitationSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = createProjectInvitationSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email field', () => {
    const result = createProjectInvitationSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('respondProjectInvitationSchema', () => {
  it('accepts accept: true', () => {
    const result = respondProjectInvitationSchema.safeParse({ accept: true })
    expect(result.success).toBe(true)
  })

  it('rejects accept: false', () => {
    const result = respondProjectInvitationSchema.safeParse({ accept: false })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean value', () => {
    const result = respondProjectInvitationSchema.safeParse({ accept: 'yes' })
    expect(result.success).toBe(false)
  })

  it('rejects missing accept field', () => {
    const result = respondProjectInvitationSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
