import { describe, it, expect } from 'vitest'
import { createIssueSchema, updateIssueSchema } from './issue'

const validUUID = '550e8400-e29b-41d4-a716-446655440000'

const validInput = {
  projectId: validUUID,
  title: 'Login API returns 500',
  method: 'POST',
  url: 'https://api.example.com/login',
  environment: 'Dev',
  status: 'Open'
}

describe('createIssueSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createIssueSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts full input with all optional fields', () => {
    const result = createIssueSchema.safeParse({
      ...validInput,
      description: 'Some description',
      rawCurl: 'curl -X POST https://api.example.com/login',
      requestHeaders: { 'Content-Type': 'application/json' },
      requestBody: { username: 'test' },
      responseStatus: 500,
      responseBody: { error: 'Internal Server Error' }
    })
    expect(result.success).toBe(true)
  })

  it('applies default values for environment and status', () => {
    const result = createIssueSchema.safeParse({
      projectId: validUUID,
      title: 'Test Issue',
      method: 'GET',
      url: 'https://api.example.com/test'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.environment).toBe('Dev')
      expect(result.data.status).toBe('Open')
    }
  })

  it('rejects empty title', () => {
    const result = createIssueSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 200 characters', () => {
    const result = createIssueSchema.safeParse({ ...validInput, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid HTTP method', () => {
    const result = createIssueSchema.safeParse({ ...validInput, method: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('rejects empty URL', () => {
    const result = createIssueSchema.safeParse({ ...validInput, url: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid environment', () => {
    const result = createIssueSchema.safeParse({ ...validInput, environment: 'Production' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid projectId format', () => {
    const result = createIssueSchema.safeParse({ ...validInput, projectId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects responseStatus outside 100-599 range', () => {
    const below = createIssueSchema.safeParse({ ...validInput, responseStatus: 99 })
    const above = createIssueSchema.safeParse({ ...validInput, responseStatus: 600 })
    expect(below.success).toBe(false)
    expect(above.success).toBe(false)
  })

  it('accepts all valid HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
    for (const method of methods) {
      const result = createIssueSchema.safeParse({ ...validInput, method })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid environments', () => {
    const envs = ['Local', 'Dev', 'Staging', 'Prod']
    for (const environment of envs) {
      const result = createIssueSchema.safeParse({ ...validInput, environment })
      expect(result.success).toBe(true)
    }
  })
})

describe('updateIssueSchema', () => {
  it('accepts partial update with only title', () => {
    const result = updateIssueSchema.safeParse({ title: 'Updated title' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (no fields to update)', () => {
    const result = updateIssueSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('strips projectId (omitted from update schema)', () => {
    const result = updateIssueSchema.safeParse({ projectId: validUUID })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('projectId')
    }
  })

  it('still validates field constraints on partial update', () => {
    const result = updateIssueSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})
