import { describe, it, expect } from 'vitest'
import { createProjectSchema, updateProjectSchema } from './project'

const validInput = {
  name: 'My Project',
  key: 'MP',
  environments: ['Dev']
}

describe('createProjectSchema', () => {
  it('accepts valid input', () => {
    const result = createProjectSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts input with optional description', () => {
    const result = createProjectSchema.safeParse({ ...validInput, description: 'A great project' })
    expect(result.success).toBe(true)
  })

  it('accepts multiple environments', () => {
    const result = createProjectSchema.safeParse({
      ...validInput,
      environments: ['Local', 'Dev', 'Staging', 'Prod']
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createProjectSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createProjectSchema.safeParse({ ...validInput, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects key shorter than 2 characters', () => {
    const result = createProjectSchema.safeParse({ ...validInput, key: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects key exceeding 10 characters', () => {
    const result = createProjectSchema.safeParse({ ...validInput, key: 'A'.repeat(11) })
    expect(result.success).toBe(false)
  })

  it('rejects lowercase project key', () => {
    const result = createProjectSchema.safeParse({ ...validInput, key: 'mp' })
    expect(result.success).toBe(false)
  })

  it('rejects key with special characters', () => {
    const result = createProjectSchema.safeParse({ ...validInput, key: 'MP-1' })
    expect(result.success).toBe(false)
  })

  it('accepts key with numbers', () => {
    const result = createProjectSchema.safeParse({ ...validInput, key: 'MP01' })
    expect(result.success).toBe(true)
  })

  it('rejects empty environments array', () => {
    const result = createProjectSchema.safeParse({ ...validInput, environments: [] })
    expect(result.success).toBe(false)
  })

  it('rejects invalid environment value', () => {
    const result = createProjectSchema.safeParse({ ...validInput, environments: ['Production'] })
    expect(result.success).toBe(false)
  })
})

describe('updateProjectSchema', () => {
  it('accepts partial update with only name', () => {
    const result = updateProjectSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateProjectSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('still validates field constraints on partial update', () => {
    const result = updateProjectSchema.safeParse({ key: 'lowercase' })
    expect(result.success).toBe(false)
  })
})
